import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  PROFESSION_META,
  ROSTER_PROFESSIONS,
  type CaBoardClinician,
  type CaBoardRoster,
  type CaBoardStats,
  type CaBoardUnmatched,
  type CaProfession,
} from "@/app/lib/ca-board-types";

export type {
  CaBoardClinician,
  CaBoardRoster,
  CaBoardStats,
  CaBoardUnmatched,
  CaProfession,
} from "@/app/lib/ca-board-types";
export {
  CA_PROFESSIONS,
  PROFESSION_META,
  parseProfession,
} from "@/app/lib/ca-board-types";

function normalizeStats(raw: Record<string, unknown>): CaBoardStats {
  return {
    boardActive: Number(raw.boardActive ?? raw.boardActiveOt ?? 0),
    nppesHarvested: Number(raw.nppesHarvested ?? raw.nppesOtHarvested ?? 0),
    matchedWithContact: Number(raw.matchedWithContact ?? 0),
    matchedNoContact: Number(raw.matchedNoContact ?? 0),
    unmatchedActiveBoard: Number(raw.unmatchedActiveBoard ?? 0),
  };
}

const rosterCache = new Map<CaProfession, Promise<CaBoardRoster>>();

async function readRosterFile(
  profession: Exclude<CaProfession, "all">
): Promise<CaBoardRoster> {
  const file = PROFESSION_META[profession].dataFile;
  const filePath = path.join(process.cwd(), "data", file);
  const raw = JSON.parse(await readFile(filePath, "utf8")) as Record<
    string,
    unknown
  >;
  const clinicians = ((raw.clinicians as CaBoardClinician[]) || []).map(
    (clinician) => ({ ...clinician, profession })
  );
  return {
    generatedAt: String(raw.generatedAt),
    profession,
    product: String(raw.product ?? ""),
    disclaimer: String(raw.disclaimer ?? ""),
    stats: normalizeStats((raw.stats as Record<string, unknown>) || {}),
    clinicians,
    backlogNoContactSample:
      (raw.backlogNoContactSample as CaBoardClinician[]) || [],
    unmatchedBoard: (raw.unmatchedBoard as CaBoardUnmatched[]) || [],
  };
}

async function loadMergedRoster(): Promise<CaBoardRoster> {
  const rosters = await Promise.all(
    ROSTER_PROFESSIONS.map((profession) => loadCaBoardRoster(profession))
  );
  const stats: CaBoardStats = {
    boardActive: 0,
    nppesHarvested: 0,
    matchedWithContact: 0,
    matchedNoContact: 0,
    unmatchedActiveBoard: 0,
  };
  const clinicians: CaBoardClinician[] = [];
  const unmatchedBoard: CaBoardUnmatched[] = [];

  for (const roster of rosters) {
    stats.boardActive += roster.stats.boardActive;
    stats.nppesHarvested += roster.stats.nppesHarvested;
    stats.matchedWithContact += roster.stats.matchedWithContact;
    stats.matchedNoContact += roster.stats.matchedNoContact;
    stats.unmatchedActiveBoard += roster.stats.unmatchedActiveBoard;
    clinicians.push(...roster.clinicians);
    unmatchedBoard.push(...(roster.unmatchedBoard ?? []));
  }

  const generatedAt =
    rosters
      .map((roster) => roster.generatedAt)
      .filter(Boolean)
      .sort()
      .at(-1) || new Date().toISOString();

  return {
    generatedAt,
    profession: "all",
    product: "Combined California recruiting roster",
    disclaimer:
      "Combined contactable California clinicians: DCA board files for OT, OTA, PT, and PTA, plus NPPES practice listings for RN and LVN.",
    stats,
    clinicians,
    unmatchedBoard,
  };
}

export function loadCaBoardRoster(
  profession: CaProfession
): Promise<CaBoardRoster> {
  const cached = rosterCache.get(profession);
  if (cached) return cached;

  const pending =
    profession === "all" ? loadMergedRoster() : readRosterFile(profession);
  rosterCache.set(profession, pending);
  return pending;
}
