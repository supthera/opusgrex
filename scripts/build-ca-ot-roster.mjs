#!/usr/bin/env node
/**
 * Build CA OT recruiting roster:
 * 1) California DCA / CBOT public licensee file (source of truth)
 * 2) Enrich with NPPES (NPI, practice phone/address, Direct email when present)
 * 3) Emit rows with usable public contact for /app
 *
 * Usage: node scripts/build-ca-ot-roster.mjs
 */
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_DIR = path.join(ROOT, "data");
const OUT_FILE = path.join(OUT_DIR, "ca-ot-roster.json");
const RAW_DIR = path.join(ROOT, "data", "raw");
const DCA_FILE = path.join(RAW_DIR, "OccupationalTherapy_Data00.xls");

const NPPES_API = "https://npiregistry.cms.hhs.gov/api/";
const BOX_FOLDER_OT = "72555083458";
const DCA_TOKEN_URL = "https://www.dca.ca.gov/boxToken/getToken";

/** CA ZIP 3-digit prefixes (approx 900–961). */
const CA_ZIP_PREFIXES = Array.from({ length: 62 }, (_, i) =>
  String(900 + i)
);

function normalizeName(value) {
  return (value || "")
    .toUpperCase()
    .replace(/[^A-Z]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLicense(value) {
  return String(value || "")
    .trim()
    .replace(/^0+/, "")
    .toUpperCase();
}

function parseTsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  const header = lines[0].split("\t");
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split("\t");
    while (cols.length < header.length) cols.push("");
    const row = {};
    header.forEach((h, idx) => {
      row[h] = cols[idx] ?? "";
    });
    rows.push(row);
  }
  return rows;
}

async function downloadDcaOtFile() {
  await mkdir(RAW_DIR, { recursive: true });
  console.log("Fetching DCA Box token…");
  const token = await (await fetch(DCA_TOKEN_URL)).text();
  const itemsRes = await fetch(
    `https://api.box.com/2.0/folders/${BOX_FOLDER_OT}/items?limit=100&fields=name,id,type,size`,
    { headers: { Authorization: `Bearer ${token.trim()}` } }
  );
  if (!itemsRes.ok) {
    throw new Error(`Box list failed: ${itemsRes.status}`);
  }
  const items = await itemsRes.json();
  const file = (items.entries || []).find((e) =>
    String(e.name).includes("Data")
  );
  if (!file) throw new Error("OT Data file not found in Box folder");

  console.log(`Downloading ${file.name} (${file.size} bytes)…`);
  const contentRes = await fetch(
    `https://api.box.com/2.0/files/${file.id}/content`,
    { headers: { Authorization: `Bearer ${token.trim()}` }, redirect: "follow" }
  );
  if (!contentRes.ok || !contentRes.body) {
    throw new Error(`Box download failed: ${contentRes.status}`);
  }
  await pipeline(Readable.fromWeb(contentRes.body), createWriteStream(DCA_FILE));
  return DCA_FILE;
}

function loadActiveOts(tsvText) {
  const rows = parseTsv(tsvText);
  const active = [];
  for (const row of rows) {
    if (row["License Type"] !== "Occupational Therapist") continue;
    if (row["License Status"] !== "Current") continue;
    if (row["Indiv/Org"] && row["Indiv/Org"] !== "I") continue;
    const licenseNumber = normalizeLicense(row["License Number"]);
    if (!licenseNumber) continue;
    active.push({
      licenseNumber,
      lastName: row["Org/Last Name"] || "",
      firstName: row["First Name"] || "",
      middleName: row["Middle Name"] || "",
      city: row["City"] || "",
      county: row["County"] || "",
      state: row["State"] || "",
      zip: (row["Zip"] || "").slice(0, 5),
      address1: row["Address Line 1"] || "",
      address2: row["Address Line 2"] || "",
      originalIssueDate: row["Original Issue Date"] || "",
      expirationDate: row["Expiration Date"] || "",
      licenseStatus: row["License Status"] || "",
      licenseType: row["License Type"] || "",
    });
  }
  return active;
}

function pickPhone(addresses) {
  if (!addresses?.length) return null;
  const location = addresses.find((a) => a.address_purpose === "LOCATION");
  const ordered = location ? [location, ...addresses] : addresses;
  for (const a of ordered) {
    if (a.telephone_number) return a.telephone_number;
  }
  return null;
}

function pickEmail(endpoints) {
  if (!endpoints?.length) return null;
  for (const e of endpoints) {
    const value = String(e.endpoint || "");
    if (value.includes("@") && !value.includes(" ")) return value;
  }
  return null;
}

function pickPractice(addresses) {
  if (!addresses?.length) return null;
  const location =
    addresses.find((a) => a.address_purpose === "LOCATION") || addresses[0];
  return {
    address1: location.address_1 || null,
    city: location.city || null,
    state: location.state || null,
    postalCode: (location.postal_code || "").slice(0, 5) || null,
  };
}

async function fetchNppesPage({ postalPrefix, skip }) {
  const url = new URL(NPPES_API);
  url.searchParams.set("version", "2.1");
  url.searchParams.set("enumeration_type", "NPI-1");
  url.searchParams.set("taxonomy_description", "Occupational Therapist");
  url.searchParams.set("postal_code", `${postalPrefix}*`);
  url.searchParams.set("limit", "200");
  url.searchParams.set("skip", String(skip));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`NPPES ${res.status} for ${postalPrefix} skip=${skip}`);
  return res.json();
}

async function mapPool(items, concurrency, worker) {
  const results = [];
  let i = 0;
  async function run() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await worker(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => run()));
  return results;
}

function extractOtLicense(taxonomies) {
  for (const t of taxonomies || []) {
    const code = t.code || "";
    if (!(code === "225X00000X" || code.startsWith("225X"))) continue;
    if (t.license) {
      return {
        license: normalizeLicense(t.license),
        state: t.state || null,
        code,
        desc: t.desc || null,
      };
    }
  }
  // still capture taxonomy even without license #
  for (const t of taxonomies || []) {
    const code = t.code || "";
    if (code === "225X00000X" || code.startsWith("225X")) {
      return {
        license: null,
        state: t.state || null,
        code,
        desc: t.desc || null,
      };
    }
  }
  return null;
}

async function harvestNppes() {
  const byNpi = new Map();
  const tasks = [];
  for (const prefix of CA_ZIP_PREFIXES) {
    for (let skip = 0; skip <= 1000; skip += 200) {
      tasks.push({ postalPrefix: prefix, skip });
    }
  }

  console.log(`NPPES harvest: ${tasks.length} page requests…`);
  let done = 0;
  await mapPool(tasks, 8, async (task) => {
    try {
      const data = await fetchNppesPage(task);
      for (const row of data.results || []) {
        if (!row.number) continue;
        if (row.basic?.status && row.basic.status !== "A") continue;
        const tax = extractOtLicense(row.taxonomies);
        if (!tax) continue;
        const phone = pickPhone(row.addresses);
        const email = pickEmail(row.endpoints);
        const practice = pickPractice(row.addresses);
        byNpi.set(row.number, {
          npi: row.number,
          firstName: row.basic?.first_name || "",
          lastName: row.basic?.last_name || "",
          middleName: row.basic?.middle_name || "",
          credential: row.basic?.credential || null,
          reportedLicense: tax.license,
          reportedLicenseState: tax.state,
          taxonomyCode: tax.code,
          taxonomyDesc: tax.desc,
          phone,
          email,
          practice,
        });
      }
    } catch (err) {
      console.warn(`NPPES page failed ${task.postalPrefix}/${task.skip}:`, err.message);
    }
    done += 1;
    if (done % 50 === 0 || done === tasks.length) {
      console.log(`  NPPES pages ${done}/${tasks.length} (unique NPIs ${byNpi.size})`);
    }
  });

  return [...byNpi.values()];
}

function joinRoster(activeOts, nppesRows) {
  const byLicense = new Map();
  for (const ot of activeOts) {
    byLicense.set(ot.licenseNumber, ot);
  }

  const nameIndex = new Map();
  for (const ot of activeOts) {
    const key = `${normalizeName(ot.lastName)}|${normalizeName(ot.firstName)}`;
    if (!nameIndex.has(key)) nameIndex.set(key, []);
    nameIndex.get(key).push(ot);
  }

  const withContact = [];
  const noContactActive = [];
  const matchedLicenses = new Set();

  for (const n of nppesRows) {
    let ot = null;
    let matchConfidence = null;
    let matchMethod = null;

    if (n.reportedLicense && byLicense.has(n.reportedLicense)) {
      ot = byLicense.get(n.reportedLicense);
      matchConfidence = "high";
      matchMethod = "license_number";
    } else {
      const key = `${normalizeName(n.lastName)}|${normalizeName(n.firstName)}`;
      const candidates = nameIndex.get(key) || [];
      if (candidates.length === 1) {
        ot = candidates[0];
        matchConfidence = "medium";
        matchMethod = "name_exact";
      } else if (candidates.length > 1) {
        const cityMatch = candidates.filter(
          (c) =>
            normalizeName(c.city) &&
            n.practice?.city &&
            normalizeName(c.city) === normalizeName(n.practice.city)
        );
        if (cityMatch.length === 1) {
          ot = cityMatch[0];
          matchConfidence = "medium";
          matchMethod = "name_city";
        }
      }
    }

    if (!ot) continue;
    matchedLicenses.add(ot.licenseNumber);

    const hasContact = Boolean(n.phone || n.email);
    const record = {
      licenseNumber: ot.licenseNumber,
      npi: n.npi,
      displayName: [n.firstName, n.middleName, n.lastName]
        .filter(Boolean)
        .join(" "),
      credential: n.credential,
      licenseStatus: ot.licenseStatus,
      licenseType: ot.licenseType,
      expirationDate: ot.expirationDate,
      boardCity: ot.city,
      boardCounty: ot.county,
      boardState: ot.state,
      boardZip: ot.zip,
      practiceAddress: n.practice?.address1 || null,
      practiceCity: n.practice?.city || null,
      practiceState: n.practice?.state || null,
      practiceZip: n.practice?.postalCode || null,
      phone: n.phone,
      email: n.email,
      taxonomyCode: n.taxonomyCode,
      taxonomyDesc: n.taxonomyDesc,
      matchConfidence,
      matchMethod,
      source: {
        board: "CA DCA / CBOT public licensee file",
        enrichment: "CMS NPPES NPI Registry",
      },
      labels: {
        boardActive: true,
        nppesEnumerated: true,
        contactPublic: hasContact,
      },
    };

    if (hasContact) withContact.push(record);
    else noContactActive.push(record);
  }

  // Active board OTs never matched to NPPES (backlog hint counts only)
  let unmatchedActive = 0;
  for (const ot of activeOts) {
    if (!matchedLicenses.has(ot.licenseNumber)) unmatchedActive += 1;
  }

  return { withContact, noContactActive, unmatchedActive, matchedLicenses };
}

function mapNppesRow(row) {
  if (!row.number) return null;
  if (row.basic?.status && row.basic.status !== "A") return null;
  const tax = extractOtLicense(row.taxonomies);
  if (!tax) return null;
  return {
    npi: row.number,
    firstName: row.basic?.first_name || "",
    lastName: row.basic?.last_name || "",
    middleName: row.basic?.middle_name || "",
    credential: row.basic?.credential || null,
    reportedLicense: tax.license,
    reportedLicenseState: tax.state,
    taxonomyCode: tax.code,
    taxonomyDesc: tax.desc,
    phone: pickPhone(row.addresses),
    email: pickEmail(row.endpoints),
    practice: pickPractice(row.addresses),
  };
}

async function enrichUnmatchedByName(activeOts, matchedLicenses, byNpi) {
  const unmatched = activeOts.filter(
    (ot) => !matchedLicenses.has(ot.licenseNumber)
  );
  console.log(`Name-pass NPPES lookups for ${unmatched.length} unmatched OTs…`);

  let done = 0;
  let added = 0;
  await mapPool(unmatched, 12, async (ot) => {
    try {
      const url = new URL(NPPES_API);
      url.searchParams.set("version", "2.1");
      url.searchParams.set("enumeration_type", "NPI-1");
      url.searchParams.set("taxonomy_description", "Occupational Therapist");
      url.searchParams.set("last_name", ot.lastName);
      url.searchParams.set("first_name", ot.firstName);
      url.searchParams.set("state", "CA");
      url.searchParams.set("limit", "5");
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      for (const row of data.results || []) {
        const mapped = mapNppesRow(row);
        if (!mapped) continue;
        if (!byNpi.has(mapped.npi)) {
          byNpi.set(mapped.npi, mapped);
          added += 1;
        }
      }
    } catch {
      // ignore individual lookup failures
    }
    done += 1;
    if (done % 500 === 0 || done === unmatched.length) {
      console.log(`  name-pass ${done}/${unmatched.length} (+${added} NPIs)`);
    }
  });
  return added;
}

async function main() {
  let tsv;
  try {
    tsv = await readFile(DCA_FILE, "utf8");
    console.log("Using cached DCA file", DCA_FILE);
  } catch {
    await downloadDcaOtFile();
    tsv = await readFile(DCA_FILE, "utf8");
  }

  const activeOts = loadActiveOts(tsv);
  console.log(`Active Current OTs (board): ${activeOts.length}`);

  const nppesRows = await harvestNppes();
  console.log(`NPPES OT NPIs harvested (ZIP sweep): ${nppesRows.length}`);

  const byNpi = new Map(nppesRows.map((n) => [n.npi, n]));
  let joined = joinRoster(activeOts, [...byNpi.values()]);

  if (joined.unmatchedActive > 0) {
    await enrichUnmatchedByName(
      activeOts,
      joined.matchedLicenses,
      byNpi
    );
    joined = joinRoster(activeOts, [...byNpi.values()]);
  }

  const { withContact, noContactActive, unmatchedActive } = joined;

  withContact.sort((a, b) =>
    a.displayName.localeCompare(b.displayName, "en", { sensitivity: "base" })
  );

  const payload = {
    generatedAt: new Date().toISOString(),
    product: "CA active OT recruiting roster",
    disclaimer:
      "License status is from the California DCA / Board of Occupational Therapy public licensee file (Current). NPI, practice address, phone, and email (when present) are enriched from CMS NPPES. An NPI does not prove licensure; board status does.",
    stats: {
      boardActiveOt: activeOts.length,
      nppesOtHarvested: byNpi.size,
      matchedWithContact: withContact.length,
      matchedNoContact: noContactActive.length,
      unmatchedActiveBoard: unmatchedActive,
    },
    clinicians: withContact,
    backlogNoContactSample: noContactActive.slice(0, 50),
  };

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(payload));
  console.log(
    `Wrote ${OUT_FILE} (${withContact.length} contactable OTs, ${noContactActive.length} matched no-contact, ${unmatchedActive} unmatched active)`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
