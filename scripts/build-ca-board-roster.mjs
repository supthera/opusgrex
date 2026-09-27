#!/usr/bin/env node
/**
 * Build CA recruiting roster for a board profession (OT or PT):
 * 1) California DCA public licensee file (source of truth)
 * 2) Enrich with NPPES (NPI, practice phone/address, Direct email when present)
 * 3) Emit rows with usable public contact for /app
 *
 * Usage:
 *   node scripts/build-ca-board-roster.mjs ot
 *   node scripts/build-ca-board-roster.mjs pt
 */
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_DIR = path.join(ROOT, "data");
const RAW_DIR = path.join(ROOT, "data", "raw");

const NPPES_API = "https://npiregistry.cms.hhs.gov/api/";
const DCA_TOKEN_URL = "https://www.dca.ca.gov/boxToken/getToken";

/** CA ZIP 3-digit prefixes (approx 900–961). */
const CA_ZIP_PREFIXES = Array.from({ length: 62 }, (_, i) => String(900 + i));

const PROFESSIONS = {
  ot: {
    key: "ot",
    label: "OT",
    plural: "OTs",
    licenseType: "Occupational Therapist",
    boxFolder: "72555083458",
    rawFile: "OccupationalTherapy_Data00.xls",
    outFile: "ca-ot-roster.json",
    taxonomyDescription: "Occupational Therapist",
    taxonomyMatch: (code) =>
      code === "225X00000X" || String(code).startsWith("225X"),
    boardName: "CA DCA / Board of Occupational Therapy",
    product: "CA active OT recruiting roster",
  },
  pt: {
    key: "pt",
    label: "PT",
    plural: "PTs",
    licenseType: "Physical Therapist",
    boxFolder: "72554178487",
    rawFile: "PhysicalTherapy_Data00.xls",
    outFile: "ca-pt-roster.json",
    taxonomyDescription: "Physical Therapist",
    // 2251* = Physical Therapist (+ specialties). Exclude 2252* PTA.
    taxonomyMatch: (code) => String(code).startsWith("2251"),
    boardName: "CA DCA / Physical Therapy Board",
    product: "CA active PT recruiting roster",
  },
};

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
    .replace(/^(OT|PTA|PT|OTR|RPT)[\s\-]*/i, "")
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

async function downloadDcaFile(prof) {
  await mkdir(RAW_DIR, { recursive: true });
  const dest = path.join(RAW_DIR, prof.rawFile);
  console.log("Fetching DCA Box token…");
  const token = await (await fetch(DCA_TOKEN_URL)).text();
  const itemsRes = await fetch(
    `https://api.box.com/2.0/folders/${prof.boxFolder}/items?limit=100&fields=name,id,type,size`,
    { headers: { Authorization: `Bearer ${token.trim()}` } }
  );
  if (!itemsRes.ok) {
    throw new Error(`Box list failed: ${itemsRes.status}`);
  }
  const items = await itemsRes.json();
  const file = (items.entries || []).find((e) =>
    String(e.name).includes("Data")
  );
  if (!file) throw new Error(`${prof.label} Data file not found in Box folder`);

  console.log(`Downloading ${file.name} (${file.size} bytes)…`);
  const contentRes = await fetch(
    `https://api.box.com/2.0/files/${file.id}/content`,
    { headers: { Authorization: `Bearer ${token.trim()}` }, redirect: "follow" }
  );
  if (!contentRes.ok || !contentRes.body) {
    throw new Error(`Box download failed: ${contentRes.status}`);
  }
  await pipeline(Readable.fromWeb(contentRes.body), createWriteStream(dest));
  return dest;
}

function loadActiveLicensees(tsvText, prof) {
  const rows = parseTsv(tsvText);
  const active = [];
  for (const row of rows) {
    if (row["License Type"] !== prof.licenseType) continue;
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

async function fetchNppesPage(prof, { postalPrefix, skip }) {
  const url = new URL(NPPES_API);
  url.searchParams.set("version", "2.1");
  url.searchParams.set("enumeration_type", "NPI-1");
  url.searchParams.set("taxonomy_description", prof.taxonomyDescription);
  url.searchParams.set("postal_code", `${postalPrefix}*`);
  url.searchParams.set("limit", "200");
  url.searchParams.set("skip", String(skip));
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`NPPES ${res.status} for ${postalPrefix} skip=${skip}`);
  }
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

function extractLicense(taxonomies, prof) {
  for (const t of taxonomies || []) {
    const code = t.code || "";
    if (!prof.taxonomyMatch(code)) continue;
    if (t.license) {
      return {
        license: normalizeLicense(t.license),
        state: t.state || null,
        code,
        desc: t.desc || null,
      };
    }
  }
  for (const t of taxonomies || []) {
    const code = t.code || "";
    if (prof.taxonomyMatch(code)) {
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

async function harvestNppes(prof) {
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
      const data = await fetchNppesPage(prof, task);
      for (const row of data.results || []) {
        if (!row.number) continue;
        if (row.basic?.status && row.basic.status !== "A") continue;
        const tax = extractLicense(row.taxonomies, prof);
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
      console.warn(
        `NPPES page failed ${task.postalPrefix}/${task.skip}:`,
        err.message
      );
    }
    done += 1;
    if (done % 50 === 0 || done === tasks.length) {
      console.log(
        `  NPPES pages ${done}/${tasks.length} (unique NPIs ${byNpi.size})`
      );
    }
  });

  return [...byNpi.values()];
}

function joinRoster(activeRows, nppesRows, prof) {
  const byLicense = new Map();
  for (const row of activeRows) {
    byLicense.set(row.licenseNumber, row);
  }

  const nameIndex = new Map();
  for (const row of activeRows) {
    const key = `${normalizeName(row.lastName)}|${normalizeName(row.firstName)}`;
    if (!nameIndex.has(key)) nameIndex.set(key, []);
    nameIndex.get(key).push(row);
  }

  const withContact = [];
  const noContactActive = [];
  const matchedLicenses = new Set();

  for (const n of nppesRows) {
    let board = null;
    let matchConfidence = null;
    let matchMethod = null;

    if (n.reportedLicense && byLicense.has(n.reportedLicense)) {
      board = byLicense.get(n.reportedLicense);
      matchConfidence = "high";
      matchMethod = "license_number";
    } else {
      const key = `${normalizeName(n.lastName)}|${normalizeName(n.firstName)}`;
      const candidates = nameIndex.get(key) || [];
      if (candidates.length === 1) {
        board = candidates[0];
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
          board = cityMatch[0];
          matchConfidence = "medium";
          matchMethod = "name_city";
        }
      }
    }

    if (!board) continue;
    matchedLicenses.add(board.licenseNumber);

    const hasContact = Boolean(n.phone || n.email);
    const record = {
      licenseNumber: board.licenseNumber,
      npi: n.npi,
      displayName: [n.firstName, n.middleName, n.lastName]
        .filter(Boolean)
        .join(" "),
      credential: n.credential,
      licenseStatus: board.licenseStatus,
      licenseType: board.licenseType,
      expirationDate: board.expirationDate,
      boardCity: board.city,
      boardCounty: board.county,
      boardState: board.state,
      boardZip: board.zip,
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
        board: `${prof.boardName} public licensee file`,
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

  let unmatchedActive = 0;
  for (const row of activeRows) {
    if (!matchedLicenses.has(row.licenseNumber)) unmatchedActive += 1;
  }

  return { withContact, noContactActive, unmatchedActive, matchedLicenses };
}

function mapNppesRow(row, prof) {
  if (!row.number) return null;
  if (row.basic?.status && row.basic.status !== "A") return null;
  const tax = extractLicense(row.taxonomies, prof);
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

async function enrichUnmatchedByName(activeRows, matchedLicenses, byNpi, prof) {
  const unmatched = activeRows.filter(
    (row) => !matchedLicenses.has(row.licenseNumber)
  );
  console.log(
    `Name-pass NPPES lookups for ${unmatched.length} unmatched ${prof.plural}…`
  );

  let done = 0;
  let added = 0;
  await mapPool(unmatched, 12, async (row) => {
    try {
      const url = new URL(NPPES_API);
      url.searchParams.set("version", "2.1");
      url.searchParams.set("enumeration_type", "NPI-1");
      url.searchParams.set("taxonomy_description", prof.taxonomyDescription);
      url.searchParams.set("last_name", row.lastName);
      url.searchParams.set("first_name", row.firstName);
      url.searchParams.set("state", "CA");
      url.searchParams.set("limit", "5");
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      for (const result of data.results || []) {
        const mapped = mapNppesRow(result, prof);
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
  const key = String(process.argv[2] || "")
    .trim()
    .toLowerCase();
  const prof = PROFESSIONS[key];
  if (!prof) {
    console.error("Usage: node scripts/build-ca-board-roster.mjs <ot|pt>");
    process.exit(1);
  }

  const dcaPath = path.join(RAW_DIR, prof.rawFile);
  let tsv;
  try {
    tsv = await readFile(dcaPath, "utf8");
    console.log("Using cached DCA file", dcaPath);
  } catch {
    await downloadDcaFile(prof);
    tsv = await readFile(dcaPath, "utf8");
  }

  const activeRows = loadActiveLicensees(tsv, prof);
  console.log(
    `Active Current ${prof.plural} (board): ${activeRows.length}`
  );

  const nppesRows = await harvestNppes(prof);
  console.log(
    `NPPES ${prof.label} NPIs harvested (ZIP sweep): ${nppesRows.length}`
  );

  const byNpi = new Map(nppesRows.map((n) => [n.npi, n]));
  let joined = joinRoster(activeRows, [...byNpi.values()], prof);

  if (joined.unmatchedActive > 0) {
    await enrichUnmatchedByName(
      activeRows,
      joined.matchedLicenses,
      byNpi,
      prof
    );
    joined = joinRoster(activeRows, [...byNpi.values()], prof);
  }

  const { withContact, noContactActive, unmatchedActive } = joined;

  withContact.sort((a, b) =>
    a.displayName.localeCompare(b.displayName, "en", { sensitivity: "base" })
  );

  const payload = {
    generatedAt: new Date().toISOString(),
    profession: prof.key,
    product: prof.product,
    disclaimer: `License status is from the ${prof.boardName} public licensee file (Current). NPI, practice address, phone, and email (when present) are enriched from CMS NPPES. An NPI does not prove licensure; board status does.`,
    stats: {
      boardActive: activeRows.length,
      nppesHarvested: byNpi.size,
      matchedWithContact: withContact.length,
      matchedNoContact: noContactActive.length,
      unmatchedActiveBoard: unmatchedActive,
      // Backward-compatible aliases for OT consumers
      boardActiveOt: prof.key === "ot" ? activeRows.length : undefined,
      nppesOtHarvested: prof.key === "ot" ? byNpi.size : undefined,
    },
    clinicians: withContact,
    backlogNoContactSample: noContactActive.slice(0, 50),
  };

  // Drop undefined alias keys
  for (const k of Object.keys(payload.stats)) {
    if (payload.stats[k] === undefined) delete payload.stats[k];
  }

  const outFile = path.join(OUT_DIR, prof.outFile);
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(outFile, JSON.stringify(payload));
  console.log(
    `Wrote ${outFile} (${withContact.length} contactable ${prof.plural}, ${noContactActive.length} matched no-contact, ${unmatchedActive} unmatched active)`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
