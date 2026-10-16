export const CA_PROFESSIONS = [
  "all",
  "rn",
  "lvn",
  "np",
  "pa",
  "cns",
  "crna",
  "cnm",
  "pt",
  "pta",
  "ot",
  "ota",
  "slp",
  "aud",
  "rt",
  "kt",
  "csw",
  "sw",
  "ssw",
  "hha",
  "cna",
  "pca",
  "ac",
  "comp",
  "hm",
  "hab",
  "st",
  "rad",
  "cvt",
  "mlt",
  "ht",
  "hit",
  "aa",
] as const;

export type CaProfession = (typeof CA_PROFESSIONS)[number];

/** Professions that have their own roster file. "all" is the combined view. */
export const ROSTER_PROFESSIONS: Exclude<CaProfession, "all">[] =
  CA_PROFESSIONS.filter(
    (profession): profession is Exclude<CaProfession, "all"> =>
      profession !== "all"
  );

export const PROFESSION_GROUPS: {
  label: string;
  professions: Exclude<CaProfession, "all">[];
}[] = [
  { label: "Nursing", professions: ["rn", "lvn"] },
  {
    label: "Advanced practice",
    professions: ["np", "pa", "cns", "crna", "cnm"],
  },
  {
    label: "Therapy",
    professions: ["pt", "pta", "ot", "ota", "slp", "aud", "rt", "kt"],
  },
  { label: "Social work", professions: ["csw", "sw", "ssw"] },
  {
    label: "Caregiving",
    professions: ["hha", "cna", "pca", "ac", "comp", "hm", "hab"],
  },
  {
    label: "Technicians",
    professions: ["st", "rad", "cvt", "mlt", "ht", "hit", "aa"],
  },
];

export const RECRUITING_STATES = ["ca", "tx", "fl"] as const;

export type RecruitingState = (typeof RECRUITING_STATES)[number];

export const STATE_META: Record<
  RecruitingState,
  { label: string; code: string }
> = {
  ca: { label: "California", code: "CA" },
  tx: { label: "Texas", code: "TX" },
  fl: { label: "Florida", code: "FL" },
};

export function parseState(
  value: string | null | undefined,
  fallback: RecruitingState = "ca"
): RecruitingState {
  const normalized = (value || "").trim().toLowerCase();
  if (normalized === "tx" || normalized === "texas") return "tx";
  if (normalized === "fl" || normalized === "florida") return "fl";
  if (normalized === "ca" || normalized === "california") return "ca";
  return fallback;
}

export interface CaBoardClinician {
  licenseNumber: string;
  npi: string;
  displayName: string;
  credential: string | null;
  licenseStatus: string;
  licenseType: string;
  expirationDate: string;
  boardCity: string;
  boardCounty: string;
  boardState: string;
  boardZip: string;
  practiceAddress: string | null;
  practiceCity: string | null;
  practiceState: string | null;
  practiceZip: string | null;
  phone: string | null;
  email: string | null;
  taxonomyCode: string | null;
  taxonomyDesc: string | null;
  matchConfidence: "high" | "medium" | string;
  matchMethod: string;
  /** Set on combined results so a row can show which roster it came from. */
  profession?: Exclude<CaProfession, "all">;
  source: {
    board: string;
    enrichment: string;
  };
  labels: {
    boardActive: boolean;
    nppesEnumerated: boolean;
    contactPublic: boolean;
  };
}

export interface CaBoardUnmatched {
  licenseNumber: string;
  displayName: string;
  licenseStatus: string;
  licenseType: string;
  expirationDate: string;
  boardCity: string;
  boardCounty: string;
  boardState: string;
  boardZip: string;
  /** Set when several rosters are exported together. */
  profession?: Exclude<CaProfession, "all">;
}

export interface CaBoardStats {
  boardActive: number;
  nppesHarvested: number;
  matchedWithContact: number;
  matchedNoContact: number;
  unmatchedActiveBoard: number;
}

export interface CaBoardRoster {
  generatedAt: string;
  profession: CaProfession;
  product: string;
  disclaimer: string;
  stats: CaBoardStats;
  clinicians: CaBoardClinician[];
  backlogNoContactSample?: CaBoardClinician[];
  unmatchedBoard?: CaBoardUnmatched[];
}

function nppes(
  key: Exclude<CaProfession, "all">,
  label: string,
  plural: string,
  shortTitle: string,
  boardHint: string
) {
  return {
    label,
    plural,
    shortTitle,
    boardHint,
    source: "nppes" as const,
    apiPath: `/api/ca-${key}`,
    csvPrefix: `opusgrex-ca-${key}-contactable`,
    backlogCsvPrefix: `opusgrex-ca-${key}-unmatched-backlog`,
    dataFile: `ca-${key}-roster.json`,
  };
}

export const PROFESSION_META: Record<
  CaProfession,
  {
    label: string;
    plural: string;
    shortTitle: string;
    boardHint: string;
    source: "board" | "nppes" | "mixed";
    apiPath: string;
    csvPrefix: string;
    backlogCsvPrefix: string;
    dataFile: string;
  }
> = {
  ot: {
    label: "OT",
    plural: "OTs",
    shortTitle: "Occupational Therapists",
    source: "board",
    boardHint: "CA DCA / CBOT Current Occupational Therapist",
    apiPath: "/api/ca-ot",
    csvPrefix: "opusgrex-ca-ot-contactable",
    backlogCsvPrefix: "opusgrex-ca-ot-unmatched-backlog",
    dataFile: "ca-ot-roster.json",
  },
  ota: {
    label: "OTA",
    plural: "OTAs",
    shortTitle: "Occupational Therapy Assistants",
    source: "board",
    boardHint: "CA DCA / CBOT Current Occupational Therapy Assistant",
    apiPath: "/api/ca-ota",
    csvPrefix: "opusgrex-ca-ota-contactable",
    backlogCsvPrefix: "opusgrex-ca-ota-unmatched-backlog",
    dataFile: "ca-ota-roster.json",
  },
  pt: {
    label: "PT",
    plural: "PTs",
    shortTitle: "Physical Therapists",
    source: "board",
    boardHint: "CA DCA / PT Board Current Physical Therapist",
    apiPath: "/api/ca-pt",
    csvPrefix: "opusgrex-ca-pt-contactable",
    backlogCsvPrefix: "opusgrex-ca-pt-unmatched-backlog",
    dataFile: "ca-pt-roster.json",
  },
  pta: {
    label: "PTA",
    plural: "PTAs",
    shortTitle: "Physical Therapist Assistants",
    source: "board",
    boardHint: "CA DCA / PT Board Current Physical Therapist Assistant",
    apiPath: "/api/ca-pta",
    csvPrefix: "opusgrex-ca-pta-contactable",
    backlogCsvPrefix: "opusgrex-ca-pta-unmatched-backlog",
    dataFile: "ca-pta-roster.json",
  },
  lvn: {
    label: "LVN",
    plural: "LVNs",
    shortTitle: "Licensed Vocational Nurses",
    source: "nppes",
    boardHint: "NPPES California LVN / LPN taxonomy (164X, 164W)",
    apiPath: "/api/ca-lvn",
    csvPrefix: "opusgrex-ca-lvn-contactable",
    backlogCsvPrefix: "opusgrex-ca-lvn-unmatched-backlog",
    dataFile: "ca-lvn-roster.json",
  },
  rn: {
    label: "RN",
    plural: "RNs",
    shortTitle: "Registered Nurses",
    source: "nppes",
    boardHint: "NPPES California RN taxonomy (163W)",
    apiPath: "/api/ca-rn",
    csvPrefix: "opusgrex-ca-rn-contactable",
    backlogCsvPrefix: "opusgrex-ca-rn-unmatched-backlog",
    dataFile: "ca-rn-roster.json",
  },
  np: nppes("np", "NP", "NPs", "Nurse Practitioners", "NPPES nurse practitioner taxonomy (363L)"),
  pa: nppes("pa", "PA", "PAs", "Physician Assistants", "NPPES physician assistant taxonomy (363A)"),
  cns: nppes("cns", "CNS", "CNSs", "Clinical Nurse Specialists", "NPPES clinical nurse specialist taxonomy (364S)"),
  crna: nppes("crna", "CRNA", "CRNAs", "Nurse Anesthetists", "NPPES nurse anesthetist taxonomy (3675)"),
  cnm: nppes("cnm", "CNM", "CNMs", "Nurse Midwives", "NPPES nurse midwife taxonomy (367A)"),
  slp: nppes("slp", "SLP", "SLPs", "Speech-Language Pathologists", "NPPES speech-language pathologist taxonomy (235Z)"),
  aud: nppes("aud", "AUD", "AUDs", "Audiologists", "NPPES audiologist taxonomy (231H)"),
  rt: nppes("rt", "RT", "RTs", "Respiratory Therapists", "NPPES respiratory therapist taxonomy (2278, 2279)"),
  kt: nppes("kt", "KT", "KTs", "Kinesiotherapists", "NPPES kinesiotherapist taxonomy (2263)"),
  csw: nppes("csw", "CSW", "CSWs", "Clinical Social Workers", "NPPES clinical social worker taxonomy (1041C)"),
  sw: nppes("sw", "SW", "SWs", "Social Workers", "NPPES social worker taxonomy (1041)"),
  ssw: nppes("ssw", "SSW", "SSWs", "School Social Workers", "NPPES school social worker taxonomy (1041S)"),
  hha: nppes("hha", "HHA", "HHAs", "Home Health Aides", "NPPES home health aide taxonomy (374U)"),
  cna: nppes("cna", "CNA", "CNAs", "Nurse Aides", "NPPES nurse aide taxonomy (376K)"),
  pca: nppes("pca", "PCA", "PCAs", "Personal Care Attendants", "NPPES personal care attendant taxonomy (3747P1801X)"),
  ac: nppes("ac", "AC", "ACs", "Attendant Care Providers", "NPPES attendant care taxonomy (3747A0650X)"),
  comp: nppes("comp", "COMP", "Companions", "Adult Companions", "NPPES adult companion taxonomy (3726)"),
  hm: nppes("hm", "HM", "Homemakers", "Homemakers", "NPPES homemaker taxonomy (376J)"),
  hab: nppes("hab", "HAB", "Habilitation", "Day Training and Habilitation", "NPPES day training / habilitation taxonomy (373H)"),
  st: nppes("st", "ST", "STs", "Surgical Technologists", "NPPES surgical technologist taxonomy (2472)"),
  rad: nppes("rad", "RAD", "Rad techs", "Radiologic Technologists", "NPPES radiologic technologist taxonomy (2471)"),
  cvt: nppes("cvt", "CVT", "CVTs", "Cardiovascular Technologists", "NPPES cardiovascular technologist taxonomy (246W)"),
  mlt: nppes("mlt", "MLT", "MLTs", "Lab Technicians", "NPPES lab technician taxonomy (246Q)"),
  ht: nppes("ht", "HT", "Health techs", "Health Technicians", "NPPES health technician taxonomy (246R)"),
  hit: nppes("hit", "HIT", "HITs", "Health Information Technicians", "NPPES health information technician taxonomy (246Y)"),
  aa: nppes("aa", "AA", "AAs", "Anesthesiologist Assistants", "NPPES anesthesiologist assistant taxonomy (367H)"),
  all: {
    label: "All",
    plural: "clinicians",
    shortTitle: "All professions",
    source: "mixed",
    boardHint: "Every profession in the recruiting rosters",
    apiPath: "/api/ca-all",
    csvPrefix: "opusgrex-ca-all-contactable",
    backlogCsvPrefix: "opusgrex-ca-all-unmatched-backlog",
    dataFile: "",
  },
};

export function parseRosterProfessions(
  value: string | null | undefined
): Exclude<CaProfession, "all">[] | null {
  if (!value) return null;
  const allowed = new Set<string>(ROSTER_PROFESSIONS);
  const picked = new Set(
    value
      .split(",")
      .map((part) => part.trim())
      .filter((part) => allowed.has(part))
  );
  if (picked.size === 0) return null;
  return CA_PROFESSIONS.filter(
    (profession): profession is Exclude<CaProfession, "all"> =>
      profession !== "all" && picked.has(profession)
  );
}

export function parseProfession(
  value: string | null | undefined,
  fallback: CaProfession = "ot"
): CaProfession {
  if (value && (CA_PROFESSIONS as readonly string[]).includes(value)) {
    return value as CaProfession;
  }
  return fallback;
}
