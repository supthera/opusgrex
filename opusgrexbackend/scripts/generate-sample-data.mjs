// Generates SAMPLE clinician data so the state panels can be visualized before
// the real NPPES pipeline is built. Produces:
//   public/data/stateStats.json          - per-state counts for every state
//   public/data/states/{CA,NY,TX}.json   - full record shards for showcase states
//
// Deterministic (seeded RNG) so re-running yields stable, diff-friendly output.
// This is sample-only scaffolding and is NOT the production NPPES processor.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_DIR = join(ROOT, "public", "data");
const STATES_DIR = join(DATA_DIR, "states");
const SAMPLE_DATE = "2026-05-11T00:00:00.000Z";

// Seeded RNG (mulberry32) for reproducible sample output.
function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Weighted taxonomy pool mirroring lib/nppesTaxonomies.ts labels.
const TAXONOMY_POOL = [
  { code: "163W00000X", label: "Registered Nurse", credential: "RN", category: "Nursing", weight: 0.45 },
  { code: "363L00000X", label: "Nurse Practitioner", credential: "NP", category: "Nursing", weight: 0.1 },
  { code: "164W00000X", label: "Licensed Practical Nurse", credential: "LPN", category: "Nursing", weight: 0.08 },
  { code: "363A00000X", label: "Physician Assistant", credential: "PA", category: "Nursing", weight: 0.04 },
  { code: "364SF0001X", label: "Clinical Nurse Specialist", credential: "CNS", category: "Nursing", weight: 0.01 },
  { code: "367500000X", label: "Certified Registered Nurse Anesthetist", credential: "CRNA", category: "Nursing", weight: 0.01 },
  { code: "225100000X", label: "Physical Therapist", credential: "PT", category: "Therapy", weight: 0.08 },
  { code: "225200000X", label: "Physical Therapy Assistant", credential: "PTA", category: "Therapy", weight: 0.03 },
  { code: "225X00000X", label: "Occupational Therapist", credential: "OT", category: "Therapy", weight: 0.05 },
  { code: "224ZR2300X", label: "Occupational Therapy Assistant", credential: "COTA", category: "Therapy", weight: 0.02 },
  { code: "235Z00000X", label: "Speech-Language Pathologist", credential: "SLP", category: "Therapy", weight: 0.05 },
  { code: "227800000X", label: "Respiratory Therapist (Registered)", credential: "RRT", category: "Therapy", weight: 0.02 },
  { code: "231H00000X", label: "Audiologist", credential: "AuD", category: "Therapy", weight: 0.01 },
  { code: "2471C3401X", label: "Radiologic Technologist", credential: "RT", category: "Technician", weight: 0.03 },
  { code: "246W00000X", label: "Cardiovascular Technologist", credential: "CVT", category: "Technician", weight: 0.01 },
  { code: "247200000X", label: "Surgical Technologist", credential: "ST", category: "Technician", weight: 0.01 },
];

// Population-proportional target counts (scaled down ~1/40 of realistic NPPES
// volumes purely so the sample map looks populated). Includes all 50 states + DC
// + territories to match US_STATES.
const STATE_TARGETS = {
  AL: 9800, AK: 1700, AZ: 14200, AR: 6200, CA: 78000, CO: 12100, CT: 8400,
  DE: 2300, FL: 52000, GA: 23000, HI: 2900, ID: 3800, IL: 30000, IN: 16000,
  IA: 7600, KS: 6900, KY: 10200, LA: 10800, ME: 3200, MD: 14600, MA: 18200,
  MI: 24000, MN: 14500, MS: 6400, MO: 15200, MT: 2600, NE: 4900, NV: 6100,
  NH: 3300, NJ: 21000, NM: 4400, NY: 56000, NC: 24000, ND: 1900, OH: 29000,
  OK: 8800, OR: 9700, PA: 33000, RI: 2700, SC: 11200, SD: 2200, TN: 16400,
  TX: 64000, UT: 6700, VT: 1600, VA: 19800, WA: 17600, WV: 4300, WI: 14100,
  WY: 1300, DC: 2400, GU: 300, MP: 90, PR: 5200, VI: 140, AS: 60,
};

const STATE_NAMES = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi",
  MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
  NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina",
  ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
  RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee",
  TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
  WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming", DC: "District of Columbia",
  GU: "Guam", MP: "Northern Mariana Islands", PR: "Puerto Rico",
  VI: "U.S. Virgin Islands", AS: "American Samoa",
};

// Showcase states get real record shards. ~150 records each keeps the sample
// small but enough to exercise search, pagination, and city grouping.
const SHOWCASE = {
  CA: { count: 180, cities: ["Los Angeles", "San Diego", "San Jose", "San Francisco", "Sacramento", "Fresno", "Long Beach", "Oakland", "Bakersfield", "Anaheim"] },
  NY: { count: 150, cities: ["New York", "Buffalo", "Rochester", "Yonkers", "Syracuse", "Albany", "New Rochelle", "Mount Vernon", "Schenectady", "Utica"] },
  TX: { count: 160, cities: ["Houston", "San Antonio", "Dallas", "Austin", "Fort Worth", "El Paso", "Arlington", "Corpus Christi", "Plano", "Laredo"] },
};

const FIRST_NAMES = [
  "Maria", "James", "Linda", "Robert", "Patricia", "Michael", "Jennifer", "David",
  "Elizabeth", "William", "Susan", "Richard", "Jessica", "Joseph", "Sarah", "Thomas",
  "Karen", "Christopher", "Nancy", "Daniel", "Lisa", "Matthew", "Betty", "Anthony",
  "Sandra", "Mark", "Ashley", "Donald", "Kimberly", "Steven", "Emily", "Andrew",
  "Donna", "Joshua", "Michelle", "Kevin", "Carol", "Brian", "Amanda", "George",
  "Aisha", "Diego", "Mei", "Omar", "Priya", "Carlos", "Fatima", "Jin", "Sofia", "Raj",
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
  "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
  "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker",
  "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
  "Patel", "Kim", "Nakamura", "Okafor", "Singh", "Cohen", "Rossi", "Murphy", "Reyes", "Cruz",
];

function weightedTaxonomy(rng) {
  const r = rng();
  let acc = 0;
  for (const t of TAXONOMY_POOL) {
    acc += t.weight;
    if (r <= acc) return t;
  }
  return TAXONOMY_POOL[0];
}

function pad(num, len) {
  return String(num).padStart(len, "0");
}

function makeNpi(seq) {
  // Sample NPIs in a clearly-fake 19xxxxxxxx range to avoid colliding with real NPIs.
  return "19" + pad(seq, 8);
}

function makeZip(rng) {
  return pad(Math.floor(rng() * 99999), 5);
}

function makePhone(rng) {
  const area = 200 + Math.floor(rng() * 799);
  const mid = 200 + Math.floor(rng() * 799);
  const last = Math.floor(rng() * 9999);
  return `${area}-${pad(mid, 3)}-${pad(last, 4)}`;
}

const STREET_NAMES = [
  "Main St", "Oak Ave", "Maple Dr", "Cedar Ln", "Park Blvd", "Sunset Blvd",
  "Washington Ave", "Lincoln St", "Elm St", "Lakeview Dr", "Hillcrest Rd",
  "Broadway", "Market St", "Health Plaza", "Medical Center Dr", "University Ave",
];

const SUITES = ["", "", "", "Ste 100", "Ste 200", "Ste 4B", "Bldg C", "Fl 3"];

function makeAddress(rng) {
  const num = 100 + Math.floor(rng() * 9899);
  const street = STREET_NAMES[Math.floor(rng() * STREET_NAMES.length)];
  const suite = SUITES[Math.floor(rng() * SUITES.length)];
  return suite ? `${num} ${street}, ${suite}` : `${num} ${street}`;
}

function generateShard(stateCode) {
  const cfg = SHOWCASE[stateCode];
  const rng = makeRng(
    // Seed from state code so each state is stable & distinct.
    stateCode.charCodeAt(0) * 1000 + stateCode.charCodeAt(1)
  );
  const clinicians = [];
  let seq = (stateCode.charCodeAt(0) + stateCode.charCodeAt(1)) * 100000;

  for (let i = 0; i < cfg.count; i++) {
    const tax = weightedTaxonomy(rng);
    const first = FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)];
    const last = LAST_NAMES[Math.floor(rng() * LAST_NAMES.length)];
    const city = cfg.cities[Math.floor(rng() * cfg.cities.length)];
    clinicians.push({
      npi: makeNpi(seq++),
      lastName: last,
      firstName: first,
      credential: tax.credential,
      taxonomyCode: tax.code,
      taxonomyLabel: tax.label,
      category: tax.category,
      address: makeAddress(rng),
      city,
      state: stateCode,
      zipCode: makeZip(rng),
      phone: makePhone(rng),
      lastUpdated: SAMPLE_DATE,
    });
  }

  // Sort by city then last name for stable, readable output.
  clinicians.sort(
    (a, b) => a.city.localeCompare(b.city) || a.lastName.localeCompare(b.lastName)
  );

  return {
    meta: {
      state: stateCode,
      stateName: STATE_NAMES[stateCode],
      count: clinicians.length,
      lastUpdated: SAMPLE_DATE,
    },
    clinicians,
  };
}

function distributionFor(total) {
  // Apply the weighted taxonomy distribution to a total to get per-label counts.
  const byTaxonomy = {};
  const byCategory = {};
  let assigned = 0;
  for (const t of TAXONOMY_POOL) {
    const n = Math.round(total * t.weight);
    byTaxonomy[t.label] = (byTaxonomy[t.label] || 0) + n;
    byCategory[t.category] = (byCategory[t.category] || 0) + n;
    assigned += n;
  }
  // Reconcile rounding drift into Registered Nurse.
  const drift = total - assigned;
  if (drift !== 0) {
    byTaxonomy["Registered Nurse"] += drift;
    byCategory["Nursing"] += drift;
  }
  return { byTaxonomy, byCategory };
}

function tallyShard(shard) {
  const byTaxonomy = {};
  const byCategory = {};
  for (const c of shard.clinicians) {
    byTaxonomy[c.taxonomyLabel] = (byTaxonomy[c.taxonomyLabel] || 0) + 1;
    byCategory[c.category] = (byCategory[c.category] || 0) + 1;
  }
  return { byTaxonomy, byCategory };
}

function main() {
  mkdirSync(STATES_DIR, { recursive: true });

  const states = {};
  let totalClinicians = 0;

  for (const [code, name] of Object.entries(STATE_NAMES)) {
    let count = STATE_TARGETS[code] ?? 0;
    let dist;

    if (SHOWCASE[code]) {
      const shard = generateShard(code);
      writeFileSync(
        join(STATES_DIR, `${code}.json`),
        JSON.stringify(shard, null, 2) + "\n"
      );
      count = shard.meta.count;
      dist = tallyShard(shard);
      console.log(`  shard public/data/states/${code}.json (${count} clinicians)`);
    } else {
      dist = distributionFor(count);
    }

    states[code] = {
      name,
      totalClinicians: count,
      byTaxonomy: dist.byTaxonomy,
      byCategory: dist.byCategory,
      lastUpdated: SAMPLE_DATE,
    };
    totalClinicians += count;
  }

  const statsFile = {
    meta: {
      totalClinicians,
      lastUpdated: SAMPLE_DATE,
      source: "SAMPLE data (generate-sample-data.mjs) - not real NPPES",
      note: "Replace via the NPPES monthly pipeline. Showcase states (CA, NY, TX) have real record shards; others have counts only.",
    },
    states,
  };

  writeFileSync(
    join(DATA_DIR, "stateStats.json"),
    JSON.stringify(statsFile, null, 2) + "\n"
  );
  console.log(
    `  stats public/data/stateStats.json (${Object.keys(states).length} states, ${totalClinicians.toLocaleString()} clinicians)`
  );
}

main();
