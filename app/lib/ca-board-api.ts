import type {
  CaBoardClinician,
  CaBoardRoster,
  CaBoardUnmatched,
  CaProfession,
} from "@/app/lib/ca-board-types";
import { loadCaBoardRoster } from "@/app/lib/ca-board";

export type RosterQuery = {
  page?: string;
  pageSize?: string;
  q?: string;
  confidence?: string;
  contact?: string;
  county?: string;
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
  query: RosterQuery
) {
  const roster: CaBoardRoster = await loadCaBoardRoster(profession);
  const counties = [
    ...new Set(
      roster.clinicians.map((c) => c.boardCounty).filter(Boolean) as string[]
    ),
  ].sort((a, b) => a.localeCompare(b));

  if (query.export === "contactable") {
    const filtered = filterClinicians(roster.clinicians, query);
    const csv = toCsv(
      filtered as unknown as Array<Record<string, string | null | undefined>>,
      CONTACTABLE_HEADERS
    );
    return {
      kind: "csv" as const,
      filename: `opusgrex-ca-${profession}-contactable.csv`,
      body: csv,
    };
  }

  if (query.export === "backlog") {
    const unmatched: CaBoardUnmatched[] = roster.unmatchedBoard ?? [];
    const csv = toCsv(
      unmatched as unknown as Array<Record<string, string | null | undefined>>,
      BACKLOG_HEADERS
    );
    return {
      kind: "csv" as const,
      filename: `opusgrex-ca-${profession}-unmatched-backlog.csv`,
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
      counties,
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
