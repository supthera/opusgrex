import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import {
  CA_PROFESSIONS,
  ROSTER_PROFESSIONS,
  STATE_META,
  type CaBoardClinician,
  type CaBoardRoster,
  type CaBoardStats,
  type CaBoardUnmatched,
  type CaProfession,
  type RecruitingState,
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

const rosterCache = new Map<
  string,
  { stamp: string; roster: Promise<CaBoardRoster> }
>();

function rosterFileName(
  state: RecruitingState,
  profession: Exclude<CaProfession, "all">
) {
  return `${state}-${profession}-roster.json`;
}

async function readRosterFile(
  profession: Exclude<CaProfession, "all">,
  state: RecruitingState
): Promise<CaBoardRoster> {
  const file = rosterFileName(state, profession);
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

async function mergeRosters(
  professions: Exclude<CaProfession, "all">[],
  state: RecruitingState
): Promise<CaBoardRoster> {
  const rosters = await Promise.all(
    professions.map((profession) => loadCaBoardRoster(profession, state))
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
    const source =
      roster.profession === "all" ? undefined : roster.profession;
    unmatchedBoard.push(
      ...(roster.unmatchedBoard ?? []).map((row) => ({
        ...row,
        profession: source ?? row.profession,
      }))
    );
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
    product:
      state === "ca"
        ? "Combined California recruiting roster"
        : `Combined ${STATE_META[state].label} recruiting roster`,
    disclaimer:
      state === "ca"
        ? "Combined contactable California clinicians. OT, OTA, PT, and PTA come from DCA board files. Every other profession comes from NPPES practice listings."
        : `Combined contactable ${STATE_META[state].label} clinicians from NPPES practice listings.`,
    stats,
    clinicians,
    unmatchedBoard,
  };
}

async function rosterStamp(
  profession: Exclude<CaProfession, "all">,
  state: RecruitingState
): Promise<string> {
  const filePath = path.join(
    process.cwd(),
    "data",
    rosterFileName(state, profession)
  );
  const info = await stat(filePath);
  return `${info.mtimeMs}:${info.size}`;
}

export async function loadCaBoardRoster(
  profession: CaProfession,
  state: RecruitingState = "ca"
): Promise<CaBoardRoster> {
  if (profession === "all") return mergeRosters(ROSTER_PROFESSIONS, state);

  const stamp = await rosterStamp(profession, state);
  const cacheKey = `${state}:${profession}`;
  const cached = rosterCache.get(cacheKey);
  if (cached?.stamp === stamp) return cached.roster;

  const roster = readRosterFile(profession, state);
  rosterCache.set(cacheKey, { stamp, roster });
  return roster;
}

/** Combined roster for a chosen subset, in tab order. */
export function loadSelectedRosters(
  professions: Exclude<CaProfession, "all">[],
  state: RecruitingState = "ca"
): Promise<CaBoardRoster> {
  const ordered = CA_PROFESSIONS.filter(
    (profession): profession is Exclude<CaProfession, "all"> =>
      profession !== "all" && professions.includes(profession)
  );
  if (ordered.length === 0 || ordered.length === ROSTER_PROFESSIONS.length) {
    return loadCaBoardRoster("all", state);
  }
  if (ordered.length === 1) return loadCaBoardRoster(ordered[0], state);
  return mergeRosters(ordered, state);
}
