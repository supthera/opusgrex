#!/usr/bin/env node
// Rebuild the stored California RN and LVN recruiting rosters from an NPPES
// state shard. The monthly sync writes that shard with license numbers taken
// from the CMS file. Existing roster licenses are kept when a shard row has
// none, so a rebuild cannot blank a number already stored in the project.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const DISCLAIMER =
  "NPPES public practice listings for California. This is not a Board of Registered Nursing or BVNPT license-status file, so rows are enumerated clinicians with a public phone, not board-confirmed Current licenses.";

const PROFESSIONS = [
  {
    key: "lvn",
    prefixes: ["164X", "164W"],
    product: "CA Licensed Vocational Nurses NPPES roster",
    licenseType: "Licensed Vocational Nurse",
    file: "ca-lvn-roster.json",
  },
  {
    key: "rn",
    prefixes: ["163W"],
    product: "CA Registered Nurses NPPES roster",
    licenseType: "Registered Nurse",
    file: "ca-rn-roster.json",
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
      "Usage: node scripts/build-ca-nursing-rosters.mjs --shard <CA.json> --out <data dir>"
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

function cleanLicense(profession, value) {
  const text = String(value || "").trim();
  const prefixes = {
    rn: ["RN"],
    lvn: ["LVN", "LPN", "VN"],
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

function toRosterRow(clinician, profession, licenses) {
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
    boardState: clinician.state || "CA",
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
      board: "CMS NPPES NPI Registry (California)",
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
  const clinicians = shard.clinicians || [];
  const generatedAt = shard.meta?.lastUpdated || new Date().toISOString();
  await mkdir(args.out, { recursive: true });

  for (const profession of PROFESSIONS) {
    const matches = clinicians.filter((clinician) =>
      profession.prefixes.some((prefix) =>
        String(clinician.taxonomyCode || "").startsWith(prefix)
      )
    );
    const withPhone = matches.filter((clinician) => clinician.phone);
    const filePath = path.join(args.out, profession.file);
    const licenses = await previousLicenses(filePath);
    const roster = {
      generatedAt,
      profession: profession.key,
      product: profession.product,
      disclaimer: DISCLAIMER,
      stats: {
        boardActive: matches.length,
        nppesHarvested: matches.length,
        matchedWithContact: withPhone.length,
        matchedNoContact: 0,
        unmatchedActiveBoard: matches.length - withPhone.length,
      },
      clinicians: withPhone.map((clinician) =>
        toRosterRow(clinician, profession, licenses)
      ),
      unmatchedBoard: [],
    };
    const filled = roster.clinicians.filter((row) => row.licenseNumber).length;
    await writeFile(filePath, JSON.stringify(roster) + "\n");
    console.log(
      `${profession.file}: ${roster.clinicians.length.toLocaleString()} contactable, ${filled.toLocaleString()} with a license`
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
