import { loadCaBoardRoster, loadSelectedRosters } from "@/app/lib/ca-board";
import {
  ROSTER_PROFESSIONS,
  parseRosterProfessions,
  type CaBoardClinician,
  type CaBoardRoster,
  type CaBoardUnmatched,
  type CaProfession,
  type RecruitingState,
} from "@/app/lib/ca-board-types";

export type RosterQuery = {
  page?: string;
  pageSize?: string;
  q?: string;
  confidence?: string;
  contact?: string;
  county?: string;
  professions?: string;
  export?: string;
};

function filterClinicians(
  rows: CaBoardClinician[],
  query: RosterQuery
): CaBoardClinician[] {
  const q = (query.q || "").trim().toLowerCase();
  const confidence = query.confidence || "all";
  const contact = query.contact || "all";
  const county = query.county || "all";

  return rows.filter((c) => {
    if (confidence !== "all" && c.matchConfidence !== confidence) return false;
    if (contact === "phone" && !c.phone) return false;
    if (contact === "email" && !c.email) return false;
    if (contact === "both" && !(c.phone && c.email)) return false;
    if (county !== "all" && c.boardCounty !== county) return false;
    if (!q) return true;
    const hay = [
      c.displayName,
      c.licenseNumber,
      c.npi,
      c.phone,
      c.email,
      c.practiceCity,
      c.boardCity,
      c.boardCounty,
      c.credential,
      c.profession,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

function csvEscape(value: string | null | undefined) {
  const s = value ?? "";
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(
  rows: Array<Record<string, string | null | undefined>>,
  headers: string[]
) {
  return [
    headers.join(","),
    ...rows.map((r) =>
      headers.map((h) => csvEscape(String(r[h] ?? ""))).join(",")
    ),
  ].join("\n");
}

const CONTACTABLE_HEADERS = [
  "licenseNumber",
  "displayName",
  "credential",
  "npi",
  "phone",
  "email",
  "practiceCity",
  "practiceState",
  "practiceZip",
  "boardCity",
  "boardCounty",
  "expirationDate",
  "matchConfidence",
  "matchMethod",
  "licenseStatus",
];

const BACKLOG_HEADERS = [
  "licenseNumber",
  "displayName",
  "licenseStatus",
  "licenseType",
  "expirationDate",
  "boardCity",
  "boardCounty",
  "boardState",
  "boardZip",
];

export async function buildRosterResponse(
  profession: CaProfession,
  query: RosterQuery,
  state: RecruitingState = "ca"
) {
  const selected = parseRosterProfessions(query.professions);
  const roster: CaBoardRoster = selected
    ? await loadSelectedRosters(selected, state)
    : await loadCaBoardRoster(profession, state);
  const fileSlug =
    selected &&
    selected.length > 0 &&
    selected.length < ROSTER_PROFESSIONS.length
      ? selected.join("-")
      : profession;
  const includeProfession =
    (selected ? selected.length : profession === "all" ? ROSTER_PROFESSIONS.length : 1) >
    1;
  if (query.export === "contactable") {
    const filtered = filterClinicians(roster.clinicians, query);
    const headers = includeProfession
      ? ["profession", ...CONTACTABLE_HEADERS]
      : CONTACTABLE_HEADERS;
    const csv = toCsv(
      filtered as unknown as Array<Record<string, string | null | undefined>>,
      headers
    );
    return {
      kind: "csv" as const,
      filename: `opusgrex-${state}-${fileSlug}-contactable.csv`,
      body: csv,
    };
  }

  if (query.export === "backlog") {
    const unmatched: CaBoardUnmatched[] = roster.unmatchedBoard ?? [];
    const headers = includeProfession
      ? ["profession", ...BACKLOG_HEADERS]
      : BACKLOG_HEADERS;
    const csv = toCsv(
      unmatched as unknown as Array<Record<string, string | null | undefined>>,
      headers
    );
    return {
      kind: "csv" as const,
      filename: `opusgrex-${state}-${fileSlug}-unmatched-backlog.csv`,
      body: csv,
    };
  }

  const filtered = filterClinicians(roster.clinicians, query);
  const pageSize = Math.min(
    100,
    Math.max(1, Number(query.pageSize || 50) || 50)
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(
    pageCount,
    Math.max(1, Number(query.page || 1) || 1)
  );
  const start = (page - 1) * pageSize;

  return {
    kind: "json" as const,
    body: {
      generatedAt: roster.generatedAt,
      profession: roster.profession,
      disclaimer: roster.disclaimer,
      stats: roster.stats,
      total: filtered.length,
      page,
      pageSize,
      pageCount,
      clinicians: filtered.slice(start, start + pageSize),
      backlogNoContactCount: roster.stats.matchedNoContact,
      unmatchedCount: roster.stats.unmatchedActiveBoard,
    },
  };
}
