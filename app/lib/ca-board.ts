import { readFile } from "node:fs/promises";
import path from "node:path";

import type {
  CaBoardClinician,
  CaBoardRoster,
  CaBoardStats,
  CaProfession,
} from "@/app/lib/ca-board-types";

export type {
  CaBoardClinician,
  CaBoardRoster,
  CaBoardStats,
  CaProfession,
} from "@/app/lib/ca-board-types";
export { PROFESSION_META } from "@/app/lib/ca-board-types";

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
