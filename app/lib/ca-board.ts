import { readFile } from "node:fs/promises";
import path from "node:path";

export type CaProfession = "ot" | "pt";

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
  }
> = {
  ot: {
    label: "OT",
    plural: "OTs",
    shortTitle: "Occupational Therapists",
    boardHint: "CA DCA / CBOT Current Occupational Therapist",
    apiPath: "/api/ca-ot",
    csvPrefix: "opusgrex-ca-ot-contactable",
  },
  pt: {
    label: "PT",
    plural: "PTs",
    shortTitle: "Physical Therapists",
    boardHint: "CA DCA / PT Board Current Physical Therapist",
    apiPath: "/api/ca-pt",
    csvPrefix: "opusgrex-ca-pt-contactable",
  },
};

function normalizeStats(raw: Record<string, unknown>): CaBoardStats {
  return {
    boardActive: Number(raw.boardActive ?? raw.boardActiveOt ?? 0),
    nppesHarvested: Number(raw.nppesHarvested ?? raw.nppesOtHarvested ?? 0),
    matchedWithContact: Number(raw.matchedWithContact ?? 0),
    matchedNoContact: Number(raw.matchedNoContact ?? 0),
    unmatchedActiveBoard: Number(raw.unmatchedActiveBoard ?? 0),
  };
}

export async function loadCaBoardRoster(
  profession: CaProfession
): Promise<CaBoardRoster> {
  const file =
    profession === "pt" ? "ca-pt-roster.json" : "ca-ot-roster.json";
  const filePath = path.join(process.cwd(), "data", file);
  const raw = JSON.parse(await readFile(filePath, "utf8")) as Record<
    string,
    unknown
  >;
  return {
    generatedAt: String(raw.generatedAt),
    profession: (raw.profession as CaProfession) || profession,
    product: String(raw.product ?? ""),
    disclaimer: String(raw.disclaimer ?? ""),
    stats: normalizeStats((raw.stats as Record<string, unknown>) || {}),
    clinicians: (raw.clinicians as CaBoardClinician[]) || [],
    backlogNoContactSample:
      (raw.backlogNoContactSample as CaBoardClinician[]) || [],
  };
}
