import {
  loadCaBoardRoster,
  type CaBoardClinician,
  type CaBoardRoster,
} from "@/app/lib/ca-board";

/** @deprecated Prefer CaBoardClinician */
export type CaOtClinician = CaBoardClinician;

/** @deprecated Prefer CaBoardRoster */
export type CaOtRoster = CaBoardRoster & {
  stats: CaBoardRoster["stats"] & {
    boardActiveOt?: number;
    nppesOtHarvested?: number;
  };
};

export async function loadCaOtRoster(): Promise<CaOtRoster> {
  const roster = await loadCaBoardRoster("ot");
  return {
    ...roster,
    stats: {
      ...roster.stats,
      boardActiveOt: roster.stats.boardActive,
      nppesOtHarvested: roster.stats.nppesHarvested,
    },
  };
}
