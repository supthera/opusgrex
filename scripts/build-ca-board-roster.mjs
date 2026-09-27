#!/usr/bin/env node
/**
 * Build CA recruiting roster for a board profession (OT, OTA, PT, PTA):
 * 1) California DCA public licensee file (source of truth)
 * 2) Enrich with NPPES (NPI, practice phone/address, Direct email when present)
 * 3) Emit rows with usable public contact for /app
 *
 * Usage:
 *   node scripts/build-ca-board-roster.mjs ot|ota|pt|pta
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
  ota: {
    key: "ota",
    label: "OTA",
    plural: "OTAs",
    licenseType: "Occupational Therapy Assistant",
    boxFolder: "72555083458",
    rawFile: "OccupationalTherapy_Data00.xls",
    outFile: "ca-ota-roster.json",
    taxonomyDescription: "Occupational Therapy Assistant",
    // 224Z* = Occupational Therapy Assistant
    taxonomyMatch: (code) =>
      code === "224Z00000X" || String(code).startsWith("224Z"),
    boardName: "CA DCA / Board of Occupational Therapy",
    product: "CA active OTA recruiting roster",
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
  pta: {
    key: "pta",
    label: "PTA",
    plural: "PTAs",
    licenseType: "Physical Therapist Assistant",
    boxFolder: "72554178487",
    rawFile: "PhysicalTherapy_Data00.xls",
    outFile: "ca-pta-roster.json",
    taxonomyDescription: "Physical Therapy Assistant",
    // 2252* = Physical Therapy Assistant
    taxonomyMatch: (code) =>
      code === "225200000X" || String(code).startsWith("2252"),
    boardName: "CA DCA / Physical Therapy Board",
    product: "CA active PTA recruiting roster",
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
    .replace(/^(COTA|OTA|OT|PTA|PT|OTR|RPT|DPT)[\s\-]*/i, "")
    .replace(/[\s\-]*(COTA|OTA|OT|PTA|PT|OTR|RPT|DPT)$/i, "")
    .replace(/^0+/, "")
    .toUpperCase();
}

/** Alternate keys for the same board/NPPES license string. */
function licenseVariants(value) {
  const raw = String(value || "").trim();
  const norm = normalizeLicense(raw);
  const digits = raw.replace(/\D/g, "").replace(/^0+/, "");
  const set = new Set();
  for (const v of [raw.toUpperCase(), norm, digits, normalizeLicense(digits)]) {
    if (v) set.add(v);
  }
  return [...set];
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

async function fetchDcaBoxToken() {
  const token = await (await fetch(DCA_TOKEN_URL)).text();
  return token.trim();
}

async function findDcaDataFile(token, folderId, label) {
  const itemsRes = await fetch(
    `https://api.box.com/2.0/folders/${folderId}/items?limit=100&fields=name,id,type,size,modified_at,sha1`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!itemsRes.ok) {
    throw new Error(`Box list failed: ${itemsRes.status}`);
  }
  const items = await itemsRes.json();
  const file = (items.entries || []).find((e) =>
    String(e.name).includes("Data")
  );
  if (!file) throw new Error(`${label} Data file not found in Box folder`);
  return file;
}

async function downloadDcaFile(prof, { force = false } = {}) {
  await mkdir(RAW_DIR, { recursive: true });
  const dest = path.join(RAW_DIR, prof.rawFile);
  console.log("Fetching DCA Box token…");
  const token = await fetchDcaBoxToken();
  const file = await findDcaDataFile(token, prof.boxFolder, prof.label);

  console.log(
    `${force ? "Force-downloading" : "Downloading"} ${file.name} (${file.size} bytes)…`
  );
  const contentRes = await fetch(
    `https://api.box.com/2.0/files/${file.id}/content`,
    { headers: { Authorization: `Bearer ${token}` }, redirect: "follow" }
  );
  if (!contentRes.ok || !contentRes.body) {
    throw new Error(`Box download failed: ${contentRes.status}`);
  }
  await pipeline(Readable.fromWeb(contentRes.body), createWriteStream(dest));
  return {
    dest,
    meta: {
      folderId: prof.boxFolder,
      fileId: String(file.id),
      name: file.name,
      size: file.size,
      modifiedAt: file.modified_at || null,
      sha1: file.sha1 || null,
      rawFile: prof.rawFile,
    },
  };
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
  let lastErr;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 403 || res.status === 429) {
        const wait = 1000 * 2 ** attempt;
        await new Promise((r) => setTimeout(r, wait));
        lastErr = new Error(`NPPES ${res.status} for ${postalPrefix} skip=${skip}`);
        continue;
      }
      if (!res.ok) {
        throw new Error(`NPPES ${res.status} for ${postalPrefix} skip=${skip}`);
      }
      return res.json();
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    }
  }
  throw lastErr || new Error("NPPES fetch failed");
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
  const matches = [];
  for (const t of taxonomies || []) {
    const code = t.code || "";
    if (!prof.taxonomyMatch(code)) continue;
    matches.push({
      license: t.license ? normalizeLicense(t.license) : null,
      licenseRaw: t.license || null,
      state: t.state || null,
      code,
      desc: t.desc || null,
      primary: Boolean(t.primary),
    });
  }
  if (!matches.length) return null;
  // Prefer CA + license number, then primary, then any with license
  matches.sort((a, b) => {
    const score = (m) =>
      (m.state === "CA" ? 8 : 0) +
      (m.license ? 4 : 0) +
      (m.primary ? 2 : 0);
    return score(b) - score(a);
  });
  const best = matches[0];
  return {
    license: best.license,
    licenseRaw: best.licenseRaw,
    state: best.state,
    code: best.code,
    desc: best.desc,
    allLicenses: [
      ...new Set(
        matches
          .flatMap((m) => licenseVariants(m.licenseRaw || m.license || ""))
          .filter(Boolean)
      ),
    ],
  };
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
  await mapPool(tasks, 4, async (task) => {
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
          licenseKeys: tax.allLicenses || licenseVariants(tax.license),
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
    for (const key of licenseVariants(row.licenseNumber)) {
      if (!byLicense.has(key)) byLicense.set(key, row);
    }
  }

  const nameIndex = new Map();
  const lastNameIndex = new Map();
  for (const row of activeRows) {
    const last = normalizeName(row.lastName);
    const first = normalizeName(row.firstName);
    const key = `${last}|${first}`;
    if (!nameIndex.has(key)) nameIndex.set(key, []);
    nameIndex.get(key).push(row);
    if (!lastNameIndex.has(last)) lastNameIndex.set(last, []);
    lastNameIndex.get(last).push(row);
  }

  const withContact = [];
  const noContactActive = [];
  const matchedLicenses = new Set();

  function pickUnique(candidates, method, confidence = "medium") {
    if (candidates.length === 1) {
      return { board: candidates[0], matchMethod: method, matchConfidence: confidence };
    }
    return null;
  }

  function disambiguate(candidates, n) {
    if (!candidates.length) return null;
    const available = candidates.filter(
      (c) => !matchedLicenses.has(c.licenseNumber)
    );
    const pool = available.length ? available : candidates;

    let hit = pickUnique(pool, "name_exact");
    if (hit) return hit;

    if (n.practice?.city) {
      const cityMatch = pool.filter(
        (c) =>
          normalizeName(c.city) &&
          normalizeName(c.city) === normalizeName(n.practice.city)
      );
      hit = pickUnique(cityMatch, "name_city");
      if (hit) return hit;
    }

    if (n.practice?.postalCode) {
      const zip3 = n.practice.postalCode.slice(0, 3);
      const zipMatch = pool.filter(
        (c) => c.zip && c.zip.slice(0, 3) === zip3
      );
      hit = pickUnique(zipMatch, "name_zip");
      if (hit) return hit;
    }

    return null;
  }

  for (const n of nppesRows) {
    let board = null;
    let matchConfidence = null;
    let matchMethod = null;

    const licenseKeys =
      n.licenseKeys?.length > 0
        ? n.licenseKeys
        : licenseVariants(n.reportedLicense);
    for (const key of licenseKeys) {
      if (byLicense.has(key)) {
        const candidate = byLicense.get(key);
        if (!matchedLicenses.has(candidate.licenseNumber)) {
          board = candidate;
          matchConfidence = "high";
          matchMethod = "license_number";
          break;
        }
      }
    }

    if (!board) {
      const key = `${normalizeName(n.lastName)}|${normalizeName(n.firstName)}`;
      const hit = disambiguate(nameIndex.get(key) || [], n);
      if (hit) {
        board = hit.board;
        matchConfidence = hit.matchConfidence;
        matchMethod = hit.matchMethod;
      }
    }

    // Last name + first initial, only when unique among unmatched
    if (!board && n.firstName) {
      const last = normalizeName(n.lastName);
      const initial = normalizeName(n.firstName).charAt(0);
      const candidates = (lastNameIndex.get(last) || []).filter(
        (c) =>
          !matchedLicenses.has(c.licenseNumber) &&
          normalizeName(c.firstName).charAt(0) === initial
      );
      const hit = disambiguate(candidates, n);
      if (hit && hit.matchMethod !== "name_exact") {
        // only accept when geo disambiguated — initial alone is too weak
        if (hit.matchMethod === "name_city" || hit.matchMethod === "name_zip") {
          board = hit.board;
          matchConfidence = "medium";
          matchMethod = `name_initial_${hit.matchMethod.split("_")[1]}`;
        }
      } else if (hit && candidates.length === 1 && n.practice?.postalCode) {
        const zip3 = n.practice.postalCode.slice(0, 3);
        if (hit.board.zip?.slice(0, 3) === zip3) {
          board = hit.board;
          matchConfidence = "medium";
          matchMethod = "name_initial_zip";
        }
      }
    }

    if (!board) continue;
    if (matchedLicenses.has(board.licenseNumber)) continue;
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

  const unmatchedBoard = [];
  for (const row of activeRows) {
    if (matchedLicenses.has(row.licenseNumber)) continue;
    unmatchedBoard.push({
      licenseNumber: row.licenseNumber,
      displayName: [row.firstName, row.middleName, row.lastName]
        .filter(Boolean)
        .join(" "),
      licenseStatus: row.licenseStatus,
      licenseType: row.licenseType,
      expirationDate: row.expirationDate,
      boardCity: row.city,
      boardCounty: row.county,
      boardState: row.state,
      boardZip: row.zip,
    });
  }

  return {
    withContact,
    noContactActive,
    unmatchedActive: unmatchedBoard.length,
    matchedLicenses,
    unmatchedBoard,
  };
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
    licenseKeys: tax.allLicenses || licenseVariants(tax.license),
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
      if (row.zip) url.searchParams.set("postal_code", row.zip.slice(0, 5));
      url.searchParams.set("limit", "5");
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      // Fallback without ZIP if empty
      let results = data.results || [];
      if (!results.length && row.zip) {
        const url2 = new URL(NPPES_API);
        url2.searchParams.set("version", "2.1");
        url2.searchParams.set("enumeration_type", "NPI-1");
        url2.searchParams.set("taxonomy_description", prof.taxonomyDescription);
        url2.searchParams.set("last_name", row.lastName);
        url2.searchParams.set("first_name", row.firstName);
        url2.searchParams.set("state", "CA");
        url2.searchParams.set("limit", "5");
        const res2 = await fetch(url2);
        if (res2.ok) {
          results = (await res2.json()).results || [];
        }
      }
      for (const result of results) {
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
    console.error("Usage: node scripts/build-ca-board-roster.mjs <ot|ota|pt|pta>");
    process.exit(1);
  }

  const dcaPath = path.join(RAW_DIR, prof.rawFile);
  const forceDownload = process.argv.includes("--force-download");
  let tsv;
  let dcaMeta = null;
  if (!forceDownload) {
    try {
      tsv = await readFile(dcaPath, "utf8");
      console.log("Using cached DCA file", dcaPath);
    } catch {
      // fall through to download
    }
  }
  if (!tsv) {
    const downloaded = await downloadDcaFile(prof, { force: forceDownload });
    dcaMeta = downloaded.meta;
    tsv = await readFile(downloaded.dest, "utf8");
  }

  const activeRows = loadActiveLicensees(tsv, prof);
  console.log(
    `Active Current ${prof.plural} (board): ${activeRows.length}`
  );

  const harvestCache = path.join(RAW_DIR, `nppes-${prof.key}-harvest.json`);
  const useCache = process.argv.includes("--use-cache");
  let nppesRows;
  if (useCache) {
    try {
      nppesRows = JSON.parse(await readFile(harvestCache, "utf8"));
      console.log(
        `Using cached NPPES harvest ${harvestCache} (${nppesRows.length} NPIs)`
      );
    } catch {
      nppesRows = null;
    }
  }
  if (!nppesRows) {
    nppesRows = await harvestNppes(prof);
    await mkdir(RAW_DIR, { recursive: true });
    await writeFile(harvestCache, JSON.stringify(nppesRows));
    console.log(`Cached NPPES harvest → ${harvestCache}`);
  }
  console.log(
    `NPPES ${prof.label} NPIs harvested (ZIP sweep): ${nppesRows.length}`
  );

  const byNpi = new Map(nppesRows.map((n) => [n.npi, n]));
  let joined = joinRoster(activeRows, [...byNpi.values()], prof);

  if (joined.unmatchedActive > 0 && !process.argv.includes("--join-only")) {
    await enrichUnmatchedByName(
      activeRows,
      joined.matchedLicenses,
      byNpi,
      prof
    );
    joined = joinRoster(activeRows, [...byNpi.values()], prof);
    // Refresh cache with name-pass additions
    await writeFile(harvestCache, JSON.stringify([...byNpi.values()]));
  }

  const { withContact, noContactActive, unmatchedActive, unmatchedBoard } =
    joined;

  withContact.sort((a, b) =>
    a.displayName.localeCompare(b.displayName, "en", { sensitivity: "base" })
  );
  unmatchedBoard.sort((a, b) =>
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
    unmatchedBoard,
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

  if (dcaMeta) {
    const manifestPath = path.join(RAW_DIR, "dca-source-manifest.json");
    let manifest = { sources: {}, updatedAt: null };
    try {
      manifest = JSON.parse(await readFile(manifestPath, "utf8"));
      if (!manifest.sources) manifest.sources = {};
    } catch {
      // new manifest
    }
    manifest.sources[prof.rawFile] = {
      ...dcaMeta,
      professions: Object.values(PROFESSIONS)
        .filter((p) => p.rawFile === prof.rawFile)
        .map((p) => p.key),
      recordedAt: new Date().toISOString(),
    };
    manifest.updatedAt = new Date().toISOString();
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
    console.log(`Updated DCA source manifest → ${manifestPath}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
