#!/usr/bin/env node
// Rebuild stored recruiting rosters for a state from its NPPES shard.
// Texas and Florida use this for every profession. California keeps board
// files for OT, OTA, PT, and PTA, and a separate nursing builder for RN/LVN.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const PROFESSIONS = [
  {
    key: "ot",
    prefixes: ["225X"],
    licenseType: "Occupational Therapist",
  },
  {
    key: "ota",
    prefixes: ["224Z"],
    licenseType: "Occupational Therapy Assistant",
  },
  {
    key: "pt",
    prefixes: ["2251"],
    licenseType: "Physical Therapist",
  },
  {
    key: "pta",
    prefixes: ["2252"],
    licenseType: "Physical Therapist Assistant",
  },
  {
    key: "lvn",
    prefixes: ["164X", "164W"],
    licenseType: "Licensed Vocational Nurse",
  },
  {
    key: "rn",
    prefixes: ["163W"],
    licenseType: "Registered Nurse",
  },
];

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--shard") args.shard = argv[++i];
    else if (arg === "--out") args.out = argv[++i];
  }
  if (!args.shard || !args.out) {
    console.error(
      "Usage: node scripts/build-nppes-state-rosters.mjs --shard <STATE.json> --out <data dir>"
    );
    process.exit(1);
  }
  return args;
}

function titleWord(word) {
  return String(word || "")
    .toLowerCase()
    .replace(/(^|[-'])([a-z])/g, (_, boundary, letter) => boundary + letter.toUpperCase());
}

function displayName(clinician) {
  return [clinician.firstName, clinician.middleName, clinician.lastName]
    .filter(Boolean)
    .map(titleWord)
    .join(" ");
}

function cleanLicense(profession, value) {
  const text = String(value || "").trim();
  const prefixes = {
    rn: ["RN"],
    lvn: ["LVN", "LPN", "VN"],
    ot: ["OT"],
    ota: ["COTA", "OTA"],
    pt: ["PT"],
    pta: ["PTA"],
  }[profession];
  if (!prefixes) return text;
  for (const prefix of prefixes) {
    const match = text.match(
      new RegExp(`^(?:CA[\\s\\-:#]*)?${prefix}[\\s\\-:#]*(.+)$`, "i")
    );
    if (!match) continue;
    const rest = match[1].trim();
    if (/^[\d.\- ]+$/.test(rest)) return rest;
  }
  return text;
}

async function previousLicenses(filePath) {
  try {
    const roster = JSON.parse(await readFile(filePath, "utf8"));
    const licenses = new Map();
    for (const clinician of roster.clinicians || []) {
      const licenseNumber = (clinician.licenseNumber || "").trim();
      if (clinician.npi && licenseNumber) licenses.set(clinician.npi, licenseNumber);
    }
    return licenses;
  } catch {
    return new Map();
  }
}

function toRosterRow(clinician, profession, licenses, stateCode, stateName) {
  const fromShard = (clinician.licenseNumber || "").trim();
  const licenseNumber = fromShard || licenses.get(clinician.npi) || "";
  return {
    licenseNumber: cleanLicense(profession.key, licenseNumber),
    npi: clinician.npi,
    displayName: displayName(clinician),
    credential: clinician.credential || profession.key.toUpperCase(),
    licenseStatus: "NPPES",
    licenseType: profession.licenseType,
    expirationDate: "",
    boardCity: clinician.city || "",
    boardCounty: "",
    boardState: clinician.state || stateCode,
    boardZip: clinician.zipCode || "",
    practiceAddress: clinician.address || null,
    practiceCity: clinician.city || null,
    practiceState: clinician.state || null,
    practiceZip: clinician.zipCode || null,
    phone: clinician.phone || null,
    email: null,
    taxonomyCode: clinician.taxonomyCode || null,
    taxonomyDesc: clinician.taxonomyLabel || profession.licenseType,
    matchConfidence: "high",
    matchMethod: "nppes-taxonomy",
    source: {
      board: `CMS NPPES NPI Registry (${stateName})`,
      enrichment: "CMS NPPES NPI Registry",
    },
    labels: {
      boardActive: false,
      nppesEnumerated: true,
      contactPublic: Boolean(clinician.phone),
    },
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const shard = JSON.parse(await readFile(args.shard, "utf8"));
  const stateCode = String(shard.meta?.state || "").toUpperCase();
  const stateName = String(shard.meta?.stateName || stateCode);
  if (!stateCode) throw new Error("Shard is missing meta.state");
  const clinicians = shard.clinicians || [];
  const generatedAt = shard.meta?.lastUpdated || new Date().toISOString();
  const disclaimer = `NPPES public practice listings for ${stateName}. This is not a state board license-status file, so rows are enumerated clinicians with a public phone, not board-confirmed Current licenses.`;
  await mkdir(args.out, { recursive: true });

  for (const profession of PROFESSIONS) {
    const matches = clinicians.filter((clinician) =>
      profession.prefixes.some((prefix) =>
        String(clinician.taxonomyCode || "").startsWith(prefix)
      )
    );
    const withPhone = matches.filter((clinician) => clinician.phone);
    const file = `${stateCode.toLowerCase()}-${profession.key}-roster.json`;
    const filePath = path.join(args.out, file);
    const licenses = await previousLicenses(filePath);
    const roster = {
      generatedAt,
      profession: profession.key,
      product: `${stateCode} ${profession.licenseType} NPPES roster`,
      disclaimer,
      stats: {
        boardActive: matches.length,
        nppesHarvested: matches.length,
        matchedWithContact: withPhone.length,
        matchedNoContact: 0,
        unmatchedActiveBoard: matches.length - withPhone.length,
      },
      clinicians: withPhone.map((clinician) =>
        toRosterRow(clinician, profession, licenses, stateCode, stateName)
      ),
      unmatchedBoard: [],
    };
    await writeFile(filePath, JSON.stringify(roster) + "\n");
    console.log(
      `${file}: ${roster.clinicians.length.toLocaleString()} contactable of ${matches.length.toLocaleString()}`
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
