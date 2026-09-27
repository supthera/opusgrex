export type CaProfession = "ot" | "ota" | "pt" | "pta";

export const CA_PROFESSIONS: CaProfession[] = ["ot", "ota", "pt", "pta"];

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
};

export function parseProfession(
  value: string | null | undefined,
  fallback: CaProfession = "ot"
): CaProfession {
  if (value === "ota" || value === "pt" || value === "pta" || value === "ot") {
    return value;
  }
  return fallback;
}
