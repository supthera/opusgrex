export type CaProfession =
  | "all"
  | "ot"
  | "ota"
  | "pt"
  | "pta"
  | "lvn"
  | "rn";

/** Professions that have their own roster file. "all" is the combined view. */
export const ROSTER_PROFESSIONS: Exclude<CaProfession, "all">[] = [
  "ot",
  "ota",
  "pt",
  "pta",
  "lvn",
  "rn",
];

export const CA_PROFESSIONS: CaProfession[] = [
  "all",
  "rn",
  "lvn",
  "pt",
  "pta",
  "ot",
  "ota",
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

export const PROFESSION_META: Record<
  CaProfession,
  {
    label: string;
    plural: string;
    shortTitle: string;
    boardHint: string;
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
    boardHint: "NPPES California RN taxonomy (163W)",
    apiPath: "/api/ca-rn",
    csvPrefix: "opusgrex-ca-rn-contactable",
    backlogCsvPrefix: "opusgrex-ca-rn-unmatched-backlog",
    dataFile: "ca-rn-roster.json",
  },
  all: {
    label: "All",
    plural: "clinicians",
    shortTitle: "All professions",
    boardHint: "OT, OTA, PT, PTA, LVN, and RN",
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
  if (
    value === "all" ||
    value === "ot" ||
    value === "ota" ||
    value === "pt" ||
    value === "pta" ||
    value === "lvn" ||
    value === "rn"
  ) {
    return value;
  }
  return fallback;
}
