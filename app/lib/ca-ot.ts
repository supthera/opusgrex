import { readFile } from "node:fs/promises";
import path from "node:path";

export interface CaOtClinician {
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

export interface CaOtRoster {
  generatedAt: string;
  product: string;
  disclaimer: string;
  stats: {
    boardActiveOt: number;
    nppesOtHarvested: number;
    matchedWithContact: number;
    matchedNoContact: number;
    unmatchedActiveBoard: number;
  };
  clinicians: CaOtClinician[];
  backlogNoContactSample: CaOtClinician[];
}

export async function loadCaOtRoster(): Promise<CaOtRoster> {
  const filePath = path.join(process.cwd(), "data", "ca-ot-roster.json");
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as CaOtRoster;
}
