// Runtime mirror of lib/nppesTaxonomies.ts for use by Node scripts (.mjs).
// Keep this in sync with the TypeScript source. The TS file remains the
// canonical reference for the app; this copy exists because Node cannot import
// .ts directly without a loader.

export const TAXONOMY_PREFIXES = [
  // Nursing
  { prefix: "163W", label: "Registered Nurse", credential: "RN", category: "Nursing" },
  { prefix: "164W", label: "Licensed Practical Nurse", credential: "LPN", category: "Nursing" },
  { prefix: "164X", label: "Licensed Vocational Nurse", credential: "LVN", category: "Nursing" },
  { prefix: "363L", label: "Nurse Practitioner", credential: "NP", category: "Nursing" },
  { prefix: "364S", label: "Clinical Nurse Specialist", credential: "CNS", category: "Nursing" },
  { prefix: "367500000X", label: "Certified Registered Nurse Anesthetist", credential: "CRNA", category: "Nursing" },
  { prefix: "367A00000X", label: "Advanced Practice Midwife", credential: "CNM", category: "Nursing" },
  { prefix: "363A", label: "Physician Assistant", credential: "PA", category: "Nursing" },

  // Therapy
  { prefix: "2251", label: "Physical Therapist", credential: "PT", category: "Therapy" },
  { prefix: "2252", label: "Physical Therapy Assistant", credential: "PTA", category: "Therapy" },
  { prefix: "225X", label: "Occupational Therapist", credential: "OT", category: "Therapy" },
  { prefix: "224Z", label: "Occupational Therapy Assistant", credential: "COTA", category: "Therapy" },
  { prefix: "235Z", label: "Speech-Language Pathologist", credential: "SLP", category: "Therapy" },
  { prefix: "231H", label: "Audiologist", credential: "AuD", category: "Therapy" },
  { prefix: "2278", label: "Respiratory Therapist (Registered)", credential: "RRT", category: "Therapy" },
  { prefix: "2279", label: "Respiratory Therapist (Certified)", credential: "CRT", category: "Therapy" },
  { prefix: "2263", label: "Kinesiotherapist", credential: "KT", category: "Therapy" },

  // Technicians / Technologists
  { prefix: "2471", label: "Radiologic Technologist", credential: "RT", category: "Technician" },
  { prefix: "246W", label: "Cardiovascular Technologist", credential: "CVT", category: "Technician" },
  { prefix: "246Q", label: "Pathology / Lab Technician", credential: "MLT", category: "Technician" },
  { prefix: "246R", label: "Technician (Health Tech)", credential: "Tech", category: "Technician" },
  { prefix: "246Y", label: "Health Information Technician", credential: "HIT", category: "Technician" },
  { prefix: "247200000X", label: "Surgical Technologist", credential: "ST", category: "Technician" },
];

export const EXACT_TAXONOMIES = {
  "367H00000X": { label: "Anesthesiologist Assistant", credential: "AA", category: "Other" },
};

export function lookupTaxonomy(code) {
  if (!code) return null;
  const normalized = String(code).trim().toUpperCase();
  if (!normalized) return null;
  if (EXACT_TAXONOMIES[normalized]) return EXACT_TAXONOMIES[normalized];

  let best = null;
  let bestLen = -1;
  for (const entry of TAXONOMY_PREFIXES) {
    if (normalized.startsWith(entry.prefix) && entry.prefix.length > bestLen) {
      best = { label: entry.label, credential: entry.credential, category: entry.category };
      bestLen = entry.prefix.length;
    }
  }
  return best;
}

export function isStaffingTaxonomy(code) {
  return lookupTaxonomy(code) !== null;
}

export const STATE_NAMES = {
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
