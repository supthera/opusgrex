// Curated allowlist of NPPES healthcare provider taxonomy codes that map to
// OpusGrex's clinical-staffing focus (Type 1 individual clinicians).
//
// NPPES assigns each provider one or more 10-character taxonomy codes from the
// NUCC Health Care Provider Taxonomy. Many specialties share a common root
// (e.g. every Registered Nurse specialty starts with "163W"), so we match on
// curated exact codes first and fall back to prefix families.

export type TaxonomyCategory = "Nursing" | "Therapy" | "Technician" | "Other";

export interface TaxonomyEntry {
  /** Friendly specialty label shown in the UI. */
  label: string;
  /** Short credential badge (RN, PT, etc.). */
  credential: string;
  category: TaxonomyCategory;
}

/**
 * Prefix families: any taxonomy code starting with `prefix` resolves to this
 * entry unless a more specific exact code is defined in EXACT_TAXONOMIES.
 * Order matters only for documentation; lookup picks the longest matching prefix.
 */
export const TAXONOMY_PREFIXES: Array<{ prefix: string } & TaxonomyEntry> = [
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

/**
 * Exact codes that should override any prefix family (rare special cases).
 */
export const EXACT_TAXONOMIES: Record<string, TaxonomyEntry> = {
  "367H00000X": { label: "Anesthesiologist Assistant", credential: "AA", category: "Other" },
};

/**
 * Resolve a raw NPPES taxonomy code to a curated staffing taxonomy entry.
 * Returns null when the code is outside our staffing allowlist.
 */
export function lookupTaxonomy(code: string | undefined | null): TaxonomyEntry | null {
  if (!code) return null;
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;

  if (EXACT_TAXONOMIES[normalized]) {
    return EXACT_TAXONOMIES[normalized];
  }

  // Pick the longest matching prefix so specific families win over broad ones.
  let best: TaxonomyEntry | null = null;
  let bestLen = -1;
  for (const entry of TAXONOMY_PREFIXES) {
    if (normalized.startsWith(entry.prefix) && entry.prefix.length > bestLen) {
      best = { label: entry.label, credential: entry.credential, category: entry.category };
      bestLen = entry.prefix.length;
    }
  }
  return best;
}

/** True when the taxonomy code is part of the staffing allowlist. */
export function isStaffingTaxonomy(code: string | undefined | null): boolean {
  return lookupTaxonomy(code) !== null;
}

/** Distinct friendly labels, useful for building per-state taxonomy tallies. */
export const STAFFING_TAXONOMY_LABELS: string[] = Array.from(
  new Set([
    ...TAXONOMY_PREFIXES.map((t) => t.label),
    ...Object.values(EXACT_TAXONOMIES).map((t) => t.label),
  ])
);
