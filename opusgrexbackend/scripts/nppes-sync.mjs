// NPPES monthly streaming processor.
//
// Reads the NPPES Type 1/2 monthly CSV as a STREAM (from --file or stdin),
// filters to Type 1 individual clinicians whose primary taxonomy is in our
// staffing allowlist, computes a per-record content hash, diffs against the
// previous run's manifest, and writes ONLY the changed per-state shards plus a
// recomputed stats file and a changelog.
//
// Designed for a GitHub Actions ubuntu runner: never extract the ~10GB CSV to
// disk. The workflow pipes `unzip -p nppes.zip 'npidata_pfile_*.csv'` into this
// script's stdin so peak disk stays ~1-2GB (the zip only).
//
// Usage:
//   node scripts/nppes-sync.mjs --out nppes-out [--prev nppes-out/manifest.json] [--file data.csv] [--all]
//   unzip -p NPPES.zip 'npidata_pfile_*.csv' | node scripts/nppes-sync.mjs --out nppes-out --prev prev-manifest.json
//
// Flags:
//   --file <path>   Read CSV from a file instead of stdin.
//   --out  <dir>    Output directory (default: ./nppes-out).
//   --prev <path>   Previous manifest.json for incremental diff (default: <out>/manifest.json).
//   --all           Rewrite every state shard, not just changed ones (full rebuild).

import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse";
import {
  lookupTaxonomy,
  isStaffingTaxonomy,
  STATE_NAMES,
} from "./lib/taxonomies.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---- arg parsing ------------------------------------------------------------
function parseArgs(argv) {
  const args = { out: join(__dirname, "..", "nppes-out"), all: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--file") args.file = argv[++i];
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--prev") args.prev = argv[++i];
    else if (a === "--all") args.all = true;
    else if (a === "--help" || a === "-h") args.help = true;
  }
  if (!args.prev) args.prev = join(args.out, "manifest.json");
  return args;
}

// ---- helpers ----------------------------------------------------------------
const NPPES_COLS = {
  npi: "NPI",
  entityType: "Entity Type Code",
  lastName: "Provider Last Name (Legal Name)",
  firstName: "Provider First Name",
  middleName: "Provider Middle Name",
  credential: "Provider Credential Text",
  addressLine1: "Provider First Line Business Practice Location Address",
  addressLine2: "Provider Second Line Business Practice Location Address",
  city: "Provider Business Practice Location Address City Name",
  state: "Provider Business Practice Location Address State Name",
  zip: "Provider Business Practice Location Address Postal Code",
  phone: "Provider Business Practice Location Address Telephone Number",
  lastUpdate: "Last Update Date",
  deactivation: "NPI Deactivation Date",
};

function licenseForRow(row, practiceState) {
  // NPPES stores up to 15 license slots beside the taxonomy codes. Prefer the
  // primary taxonomy's license in the practice state, then any practice-state
  // license, then the first license on the record.
  let fallback = "";
  let stateMatch = "";
  let primary = "";
  const state = String(practiceState || "").trim().toUpperCase();
  for (let i = 1; i <= 15; i++) {
    const license = (row[`Provider License Number_${i}`] || "").trim();
    if (!license) continue;
    const licState = (row[`Provider License Number State Code_${i}`] || "")
      .trim()
      .toUpperCase();
    const isPrimary =
      (row[`Healthcare Provider Primary Taxonomy Switch_${i}`] || "")
        .trim()
        .toUpperCase() === "Y";
    if (!fallback) fallback = license;
    if (state && licState === state) {
      if (!stateMatch) stateMatch = license;
      if (isPrimary) primary = license;
    }
  }
  return primary || stateMatch || fallback;
}

function primaryTaxonomy(row) {
  // Prefer the taxonomy flagged as primary (switch == 'Y'); else first non-empty.
  let firstCode = "";
  for (let i = 1; i <= 15; i++) {
    const code = (row[`Healthcare Provider Taxonomy Code_${i}`] || "").trim();
    if (!code) continue;
    if (!firstCode) firstCode = code;
    const sw = (row[`Healthcare Provider Primary Taxonomy Switch_${i}`] || "").trim().toUpperCase();
    if (sw === "Y") return code;
  }
  return firstCode;
}

function normalizeZip(zip) {
  const digits = String(zip || "").replace(/\D/g, "");
  return digits.slice(0, 5);
}

function normalizePhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone ? String(phone).trim() : "";
}

function toIsoDate(mdY) {
  // NPPES dates look like MM/DD/YYYY. Convert to ISO; fall back to raw string.
  const s = String(mdY || "").trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return s;
  const [, mm, dd, yyyy] = m;
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}T00:00:00.000Z`;
}

function buildAddress(line1, line2) {
  const l1 = String(line1 || "").trim();
  const l2 = String(line2 || "").trim();
  return [l1, l2].filter(Boolean).join(", ");
}

// Stable hash over the fields that, if changed, mean the record changed.
function hashRecord(rec) {
  const basis = [
    rec.lastName,
    rec.firstName,
    rec.middleName || "",
    rec.credential || "",
    rec.taxonomyCode,
    rec.licenseNumber || "",
    rec.address || "",
    rec.city,
    rec.state,
    rec.zipCode,
    rec.phone || "",
    rec.deactivated ? "1" : "0",
  ].join("|");
  return createHash("sha1").update(basis).digest("hex").slice(0, 12);
}

function getInputStream(file) {
  if (file) return createReadStream(file);
  return process.stdin;
}

// ---- main -------------------------------------------------------------------
async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log("See header of scripts/nppes-sync.mjs for usage.");
    return;
  }

  const OUT = args.out;
  const STATES_OUT = join(OUT, "states");
  await mkdir(STATES_OUT, { recursive: true });

  // Load previous manifest (npi -> {h: hash, s: state}) for incremental diff.
  let prevManifest = { npis: {} };
  try {
    prevManifest = JSON.parse(await readFile(args.prev, "utf8"));
    console.log(
      `Loaded previous manifest: ${Object.keys(prevManifest.npis || {}).length.toLocaleString()} NPIs`
    );
  } catch {
    console.log("No previous manifest found - treating this as a full baseline.");
  }
  const prevNpis = prevManifest.npis || {};

  // In-memory grouping. Kept records grouped by state; manifest keyed by NPI.
  /** @type {Map<string, Array<object>>} */
  const byState = new Map();
  /** @type {Record<string, {h: string, s: string}>} */
  const newNpis = {};

  let totalRows = 0;
  let kept = 0;
  const t0 = Date.now();

  const parser = getInputStream(args.file).pipe(
    parse({
      columns: true,
      skip_empty_lines: true,
      relax_quotes: true,
      relax_column_count: true,
    })
  );

  for await (const row of parser) {
    totalRows++;
    if (totalRows % 500000 === 0) {
      const secs = ((Date.now() - t0) / 1000).toFixed(0);
      console.log(
        `  ...${totalRows.toLocaleString()} rows scanned, ${kept.toLocaleString()} kept (${secs}s)`
      );
    }

    if ((row[NPPES_COLS.entityType] || "").trim() !== "1") continue;

    const taxonomyCode = primaryTaxonomy(row);
    if (!isStaffingTaxonomy(taxonomyCode)) continue;

    const state = (row[NPPES_COLS.state] || "").trim().toUpperCase();
    if (!STATE_NAMES[state]) continue; // skip foreign / military / unknown

    const npi = (row[NPPES_COLS.npi] || "").trim();
    if (!npi) continue;

    const tax = lookupTaxonomy(taxonomyCode);
    const deactivation = (row[NPPES_COLS.deactivation] || "").trim();
    const licenseNumber = licenseForRow(row, state);

    const rec = {
      npi,
      lastName: (row[NPPES_COLS.lastName] || "").trim(),
      firstName: (row[NPPES_COLS.firstName] || "").trim(),
      middleName: (row[NPPES_COLS.middleName] || "").trim() || undefined,
      credential: (row[NPPES_COLS.credential] || "").trim() || tax.credential,
      taxonomyCode,
      taxonomyLabel: tax.label,
      category: tax.category,
      licenseNumber: licenseNumber || undefined,
      address: buildAddress(row[NPPES_COLS.addressLine1], row[NPPES_COLS.addressLine2]) || undefined,
      city: (row[NPPES_COLS.city] || "").trim(),
      state,
      zipCode: normalizeZip(row[NPPES_COLS.zip]),
      phone: normalizePhone(row[NPPES_COLS.phone]),
      lastUpdated: toIsoDate(row[NPPES_COLS.lastUpdate]),
      deactivated: deactivation ? true : undefined,
    };

    // Deactivated NPIs are dropped from the active dataset (treated as removed).
    if (rec.deactivated) continue;

    if (!byState.has(state)) byState.set(state, []);
    byState.get(state).push(rec);
    newNpis[npi] = { h: hashRecord(rec), s: state };
    kept++;
  }

  console.log(
    `Scan complete: ${totalRows.toLocaleString()} rows, ${kept.toLocaleString()} clinicians kept across ${byState.size} states (${((Date.now() - t0) / 1000).toFixed(0)}s)`
  );

  // ---- diff vs previous manifest -------------------------------------------
  const changedStates = new Set();
  let added = 0;
  let updated = 0;
  let removed = 0;
  const perState = {}; // state -> {added, updated, removed}
  const bump = (st, key) => {
    if (!perState[st]) perState[st] = { added: 0, updated: 0, removed: 0 };
    perState[st][key]++;
  };

  for (const [npi, entry] of Object.entries(newNpis)) {
    const prev = prevNpis[npi];
    if (!prev) {
      added++;
      bump(entry.s, "added");
      changedStates.add(entry.s);
    } else if (prev.h !== entry.h) {
      updated++;
      bump(entry.s, "updated");
      changedStates.add(entry.s);
      if (prev.s && prev.s !== entry.s) changedStates.add(prev.s); // moved states
    }
  }
  for (const [npi, prev] of Object.entries(prevNpis)) {
    if (!newNpis[npi]) {
      removed++;
      const st = prev.s || "??";
      bump(st, "removed");
      if (STATE_NAMES[st]) changedStates.add(st);
    }
  }

  console.log(
    `Diff: +${added.toLocaleString()} added, ~${updated.toLocaleString()} updated, -${removed.toLocaleString()} removed across ${changedStates.size} changed states`
  );

  // ---- write shards (changed only, unless --all) ----------------------------
  const SAMPLE_DATE = new Date().toISOString();
  const statesToWrite = args.all
    ? new Set(byState.keys())
    : changedStates;

  let shardsWritten = 0;
  for (const state of statesToWrite) {
    const records = (byState.get(state) || []).sort(
      (a, b) => a.city.localeCompare(b.city) || a.lastName.localeCompare(b.lastName)
    );
    const shard = {
      meta: {
        state,
        stateName: STATE_NAMES[state] || state,
        count: records.length,
        lastUpdated: SAMPLE_DATE,
      },
      clinicians: records,
    };
    await writeJson(join(STATES_OUT, `${state}.json`), shard);
    shardsWritten++;
  }
  console.log(`Wrote ${shardsWritten} state shard(s) to ${STATES_OUT}`);

  // ---- recompute stats (all states; small) ----------------------------------
  const statsStates = {};
  let totalClinicians = 0;
  for (const [code, name] of Object.entries(STATE_NAMES)) {
    const records = byState.get(code) || [];
    const byTaxonomy = {};
    const byCategory = {};
    for (const r of records) {
      byTaxonomy[r.taxonomyLabel] = (byTaxonomy[r.taxonomyLabel] || 0) + 1;
      byCategory[r.category] = (byCategory[r.category] || 0) + 1;
    }
    statsStates[code] = {
      name,
      totalClinicians: records.length,
      byTaxonomy,
      byCategory,
      lastUpdated: SAMPLE_DATE,
    };
    totalClinicians += records.length;
  }

  await writeJson(join(OUT, "stateStats.json"), {
    meta: {
      totalClinicians,
      lastUpdated: SAMPLE_DATE,
      source: "NPPES Monthly Downloadable File V.2 (Type 1, staffing taxonomies)",
    },
    states: statsStates,
  });

  // ---- changelog + new manifest ---------------------------------------------
  await writeJson(join(OUT, "changelog.json"), {
    generatedAt: SAMPLE_DATE,
    source: "NPPES Monthly Downloadable File V.2",
    totals: { added, updated, removed, kept, scanned: totalRows },
    byState: perState,
    changedStates: Array.from(changedStates).sort(),
  });

  await writeJson(join(OUT, "manifest.json"), {
    generatedAt: SAMPLE_DATE,
    totalClinicians,
    npis: newNpis,
  });

  console.log(`Done. Output in ${OUT}`);
}

async function writeJson(path, obj) {
  await mkdir(dirname(path), { recursive: true });
  // Stream-write to avoid building one giant string for large shards.
  await new Promise((resolve, reject) => {
    const ws = createWriteStream(path);
    ws.on("error", reject);
    ws.on("finish", resolve);
    ws.write(JSON.stringify(obj, null, 2));
    ws.write("\n");
    ws.end();
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
