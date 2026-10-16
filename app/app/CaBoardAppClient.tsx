"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronDown,
  Download,
  LoaderCircle,
  Mail,
  Phone,
  Search,
  ShieldCheck,
  Table2,
  Users,
} from "lucide-react";

import {
  CA_PROFESSIONS,
  PROFESSION_META,
  ROSTER_PROFESSIONS,
  STATE_META,
  parseProfession,
  parseRosterProfessions,
  parseState,
  type CaBoardClinician,
  type CaBoardStats,
  type CaProfession,
} from "@/app/lib/ca-board-types";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;

type RosterProfession = Exclude<CaProfession, "all">;

const PICKABLE: RosterProfession[] = CA_PROFESSIONS.filter(
  (profession): profession is RosterProfession => profession !== "all"
);

type PagePayload = {
  generatedAt: string;
  profession: CaProfession;
  disclaimer: string;
  stats: CaBoardStats;
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  clinicians: CaBoardClinician[];
  unmatchedCount: number;
};

function StatCard({
  label,
  value,
  hint,
  accent,
  badge,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent: string;
  badge?: string;
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className={`h-1 ${accent}`} />
      <div className="flex flex-1 flex-col px-5 pb-4 pt-3.5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </p>
          {badge ? (
            <span className="shrink-0 rounded-full bg-[#4A9B8E]/15 px-2 py-0.5 text-xs font-semibold text-[#2f6f65]">
              {badge}
            </span>
          ) : null}
        </div>
        <p className="mt-2 font-heading text-3xl font-semibold tracking-tight text-slate-900">
          {value}
        </p>
        {hint ? (
          <p className="mt-2 text-sm leading-5 text-slate-500">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}

function selectionFromUrl(
  profession: CaProfession,
  professionsParam: string | null
): RosterProfession[] {
  if (profession === "all") {
    const picked = parseRosterProfessions(professionsParam);
    if (
      picked &&
      picked.length > 0 &&
      picked.length < ROSTER_PROFESSIONS.length
    ) {
      return picked;
    }
    return PICKABLE;
  }
  return [profession];
}

function buildApiUrl(
  state: ReturnType<typeof parseState>,
  selected: RosterProfession[],
  opts: {
    page: number;
    q: string;
    contact: string;
    exportType?: "contactable" | "backlog";
  }
) {
  const subset =
    selected.length > 1 && selected.length < ROSTER_PROFESSIONS.length;
  const profession: CaProfession = subset
    ? "all"
    : selected.length === 1
      ? selected[0]
      : "all";
  const params = new URLSearchParams();
  if (opts.exportType) {
    params.set("export", opts.exportType);
  } else {
    params.set("page", String(opts.page));
    params.set("pageSize", String(PAGE_SIZE));
  }
  if (opts.q.trim()) params.set("q", opts.q.trim());
  if (opts.contact !== "all") params.set("contact", opts.contact);
  if (subset) params.set("professions", selected.join(","));
  return `/api/roster/${state}/${profession}?${params.toString()}`;
}

function ProfessionFilter({
  selected,
  onChange,
}: {
  selected: RosterProfession[];
  onChange: (next: RosterProfession[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const allOn = selected.length === PICKABLE.length;
  const label = allOn
    ? "All professions"
    : selected.map((key) => PROFESSION_META[key].label).join(", ");

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle(key: RosterProfession) {
    const checked = selected.includes(key);
    if (checked) {
      if (selected.length === 1) return;
      onChange(selected.filter((item) => item !== key));
      return;
    }
    onChange([...selected, key]);
  }

  return (
    <div ref={rootRef} className="relative text-sm lg:w-52">
      <span id="profession-filter-label" className="mb-1.5 block font-medium text-slate-700">
        Professions
      </span>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-labelledby="profession-filter-label"
        title={label}
        onClick={() => setOpen((value) => !value)}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 text-left text-slate-900 outline-none focus:border-[#0F4C81] focus:ring-2 focus:ring-[#0F4C81]/20"
      >
        <span className="truncate">{label}</span>
        <ChevronDown className="size-4 shrink-0 text-slate-500" />
      </button>
      {open ? (
        <div
          role="group"
          aria-label="Professions"
          className="absolute z-30 mt-1 w-full min-w-[12rem] rounded-lg border border-slate-200 bg-white p-1 shadow-md"
        >
          <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-slate-800 hover:bg-slate-50">
            <input
              type="checkbox"
              className="size-4 accent-[#0F4C81]"
              checked={allOn}
              onChange={() => {
                if (!allOn) onChange(PICKABLE);
              }}
            />
            All professions
          </label>
          {PICKABLE.map((key) => {
            const checked = selected.includes(key);
            return (
              <label
                key={key}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-slate-800 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  className="size-4 accent-[#0F4C81]"
                  checked={checked}
                  disabled={checked && selected.length === 1}
                  onChange={() => toggle(key)}
                />
                {PROFESSION_META[key].label}
              </label>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default function CaBoardAppClient({
  initialProfession = "ot",
}: {
  initialProfession?: CaProfession;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const profession: CaProfession = parseProfession(
    searchParams.get("profession"),
    initialProfession
  );
  const state = parseState(searchParams.get("state"));
  const stateLabel = STATE_META[state].label;
  const professionsParam = searchParams.get("professions");
  const selected = useMemo(
    () => selectionFromUrl(profession, professionsParam),
    [profession, professionsParam]
  );
  const multi = selected.length > 1;

  const [roster, setRoster] = useState<PagePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [contact, setContact] = useState<"all" | "phone" | "email" | "both">(
    "all"
  );
  const [page, setPage] = useState(1);

  const meta = PROFESSION_META[profession];
  const nppesSourced =
    state !== "ca" || profession === "lvn" || profession === "rn";
  const selectionLabel = multi
    ? selected.map((key) => PROFESSION_META[key].label).join(", ")
    : meta.label;

  function writeSelection(next: RosterProfession[]) {
    const ordered = PICKABLE.filter((key) => next.includes(key));
    if (ordered.length === 0) return;
    const params = new URLSearchParams(searchParams.toString());
    if (ordered.length === 1) {
      const only = ordered[0];
      if (only === "ot") params.delete("profession");
      else params.set("profession", only);
      params.delete("professions");
    } else if (ordered.length === PICKABLE.length) {
      params.set("profession", "all");
      params.delete("professions");
    } else {
      params.set("profession", "all");
      params.set("professions", ordered.join(","));
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    setPage(1);
  }

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setQuery("");
    setDebouncedQuery("");
    setContact("all");
    setPage(1);
  }, [profession, state]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const url = buildApiUrl(state, selected, {
          page,
          q: debouncedQuery,
          contact,
        });
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to load roster (${res.status})`);
        const data = (await res.json()) as PagePayload;
        if (!cancelled) setRoster(data);
      } catch (e) {
        if (!cancelled) {
          setRoster(null);
          setError(e instanceof Error ? e.message : "Failed to load roster");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state, selected, page, debouncedQuery, contact]);

  if (loading && !roster) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-10 text-slate-600 shadow-sm">
        <LoaderCircle className="size-5 animate-spin text-[#0F4C81]" />
        Loading {stateLabel} {meta.shortTitle.toLowerCase()}…
      </div>
    );
  }

  if (error || !roster) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
        {error || "Roster unavailable."} Run{" "}
        <code className="rounded bg-red-100 px-1">
          npm run build:ca-{profession}
        </code>{" "}
        if the data file is missing.
      </div>
    );
  }

  const matchRate =
    roster.stats.boardActive > 0
      ? Math.round(
          (roster.stats.matchedWithContact / roster.stats.boardActive) * 100
        )
      : 0;

  const exportHref = (exportType: "contactable" | "backlog") =>
    buildApiUrl(state, selected, {
      page: 1,
      q: debouncedQuery,
      contact,
      exportType,
    });

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <label className="block flex-1 text-sm">
            <span className="mb-1.5 flex items-center gap-1.5 font-medium text-slate-700">
              <Search className="size-3.5" />
              Search
            </span>
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Name, license, NPI, phone, city, county…"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#0F4C81] focus:ring-2 focus:ring-[#0F4C81]/20"
            />
          </label>
          <ProfessionFilter selected={selected} onChange={writeSelection} />
          <label className="block text-sm lg:w-40">
            <span className="mb-1.5 block font-medium text-slate-700">
              Contact
            </span>
            <select
              value={contact}
              onChange={(e) => {
                setContact(e.target.value as typeof contact);
                setPage(1);
              }}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-slate-900 outline-none focus:border-[#0F4C81] focus:ring-2 focus:ring-[#0F4C81]/20"
            >
              <option value="all">Any contact</option>
              <option value="phone">Phone</option>
              <option value="email">Email</option>
              <option value="both">Phone + email</option>
            </select>
          </label>
          <a
            href={exportHref("contactable")}
            className={cn(buttonVariants({ variant: "outline" }), "h-10 gap-2")}
          >
            <Download className="size-4" />
            CSV
          </a>
          <span className="group/tip relative inline-flex">
            <a
              href={exportHref("backlog")}
              className={cn(buttonVariants({ variant: "outline" }), "h-10 gap-2")}
              aria-describedby="unmatched-backlog-tip"
            >
              <Download className="size-4" />
              Unmatched backlog
            </a>
            <span
              id="unmatched-backlog-tip"
              role="tooltip"
              className="pointer-events-none absolute top-full right-0 z-20 mt-2 hidden w-80 rounded-lg border border-slate-200 bg-white p-3 text-left text-xs leading-relaxed font-normal text-slate-600 shadow-md group-hover/tip:block"
            >
              {nppesSourced
                ? "Unmatched backlog downloads clinicians in the NPPES listing who have no public phone, so they stay out of the table."
                : "Unmatched backlog downloads a CSV of board-active licensees who were not matched to an NPPES record. They have no public phone or email, so they are left out of the table."}{" "}
              For {selectionLabel}, that is the count shown on the Unmatched
              backlog card.
            </span>
          </span>
        </div>
        <p className="mt-3 text-sm text-slate-500">
          Showing page {roster.page} ·{" "}
          {roster.stats.boardActive.toLocaleString()}{" "}
          {nppesSourced
            ? "NPPES-enumerated"
            : profession === "all"
              ? "in the combined rosters"
              : "board-active Current"}{" "}
          · {roster.total.toLocaleString()} contactable after filters ·{" "}
          {roster.unmatchedCount.toLocaleString()} unmatched (excluded from
          table).
          {loading ? " Updating…" : null}
        </p>
      </div>

      <div className="grid items-stretch gap-4 md:grid-cols-3">
        <StatCard
          label={
            nppesSourced
              ? `NPPES ${meta.plural}`
              : profession === "all"
                ? "In these rosters"
                : `Board-active ${meta.plural}`
          }
          value={roster.stats.boardActive.toLocaleString()}
          accent="bg-[#0F4C81]"
          hint={
            state !== "ca"
              ? `NPPES ${stateLabel} practice listing`
              : multi && selected.length < PICKABLE.length
                ? selectionLabel
                : meta.boardHint
          }
        />
        <StatCard
          label="With public contact"
          value={roster.stats.matchedWithContact.toLocaleString()}
          accent="bg-[#4A9B8E]"
          badge={`${matchRate}%`}
          hint="Public phone or email from NPPES"
        />
        <StatCard
          label="Unmatched backlog"
          value={roster.unmatchedCount.toLocaleString()}
          accent="bg-slate-400"
          hint={
            nppesSourced
              ? "No public phone, so they stay out of the table"
              : "No NPPES match, so they stay out of the table"
          }
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
          <Table2 className="size-4 text-[#0F4C81]" />
          <h2 className="font-heading text-base font-semibold text-slate-900">
            Contactable {stateLabel}{" "}
            {multi && selected.length < PICKABLE.length
              ? selectionLabel
              : meta.plural}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {multi ? (
                  <th
                    className="w-px whitespace-nowrap px-2 py-3 text-center text-[10px] font-semibold tracking-wide"
                    title="Profession"
                  >
                    <span className="sr-only">Profession</span>
                    <span aria-hidden="true">Prof.</span>
                  </th>
                ) : null}
                <th className="w-px whitespace-nowrap px-2 py-3 text-center font-semibold">
                  License #
                </th>
                <th className="whitespace-nowrap px-3 py-3 font-semibold">
                  Name
                </th>
                <th className="whitespace-nowrap px-3 py-3 font-semibold">
                  Phone
                </th>
                <th className="whitespace-nowrap px-3 py-3 font-semibold">
                  Email
                </th>
                <th className="whitespace-nowrap px-3 py-3 font-semibold">
                  Practice
                </th>
                <th className="whitespace-nowrap px-3 py-3 font-semibold">
                  Board city
                </th>
                <th className="whitespace-nowrap px-3 py-3 font-semibold">
                  NPI
                </th>
                <th className="whitespace-nowrap px-3 py-3 font-semibold">
                  Match
                </th>
                <th className="whitespace-nowrap px-3 py-3 font-semibold">
                  Expires
                </th>
              </tr>
            </thead>
            <tbody>
              {roster.clinicians.map((row) => (
                <ClinicianRow
                  key={`${row.profession ?? profession}-${row.licenseNumber}-${row.npi}`}
                  row={row}
                  showProfession={multi}
                />
              ))}
              {roster.clinicians.length === 0 && (
                <tr>
                  <td
                    colSpan={multi ? 10 : 9}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    No rows match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
          <Button
            variant="outline"
            disabled={roster.page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <p className="text-sm text-slate-500">
            Page {roster.page} of {roster.pageCount}
          </p>
          <Button
            variant="outline"
            disabled={roster.page >= roster.pageCount || loading}
            onClick={() =>
              setPage((p) => Math.min(roster.pageCount, p + 1))
            }
          >
            Next
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-[#0F4C81]/5 px-4 py-4 text-sm text-slate-700">
          <Users className="mb-2 size-4 text-[#0F4C81]" />
          {state === "ca" ? (
            <>
              <span className="block">
                Primary key is <strong>California license number</strong>.
              </span>
              <span className="block">
                NPI is secondary from NPPES enrichment.
              </span>
            </>
          ) : (
            <>
              <span className="block">
                Primary key is <strong>NPI</strong>.
              </span>
              <span className="block">
                State license number is stored when the NPPES file includes it.
              </span>
            </>
          )}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-[#0F4C81]/5 px-4 py-4 text-sm text-slate-700">
          <ShieldCheck className="mb-2 size-4 text-[#4A9B8E]" />
          {state === "ca" ? (
            <>
              <span className="block">
                <strong>Board-sourced Current</strong> license status.
              </span>
              <span className="block">Not inferred from NPI alone.</span>
            </>
          ) : (
            <>
              <span className="block">
                <strong>NPPES practice listing</strong> for {stateLabel}.
              </span>
              <span className="block">Not a state board license-status file.</span>
            </>
          )}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-[#0F4C81]/5 px-4 py-4 text-sm text-slate-700">
          <Phone className="mb-2 size-4 text-[#0F4C81]" />
          <span className="block">
            Table only includes rows with a public{" "}
            <strong>phone and/or email</strong>.
          </span>
          <span className="block">Contact comes from NPPES.</span>
        </div>
      </div>
    </div>
  );
}

function ClinicianRow({
  row,
  showProfession,
}: {
  row: CaBoardClinician;
  showProfession: boolean;
}) {
  return (
    <tr className="border-t border-slate-100 hover:bg-slate-50/80">
      {showProfession ? (
        <td className="w-px px-2 py-2.5 text-center">
          <Badge
            variant="secondary"
            className="w-12 justify-center bg-[#0F4C81]/10 px-0 text-[#0F4C81]"
          >
            {row.profession ? PROFESSION_META[row.profession].label : "—"}
          </Badge>
        </td>
      ) : null}
      <td className="w-px whitespace-nowrap px-2 py-2.5 text-center font-mono text-xs text-slate-800">
        {row.licenseNumber || "—"}
      </td>
      <td className="px-3 py-2.5">
        <div className="font-medium text-slate-900">{row.displayName}</div>
        {row.credential ? (
          <div className="text-xs text-slate-500">{row.credential}</div>
        ) : null}
      </td>
      <td className="whitespace-nowrap px-3 py-2.5">
        {row.phone ? (
          <a
            href={`tel:${row.phone}`}
            className="inline-flex items-center gap-1 text-[#0F4C81] hover:underline"
          >
            <Phone className="size-3.5" />
            {row.phone}
          </a>
        ) : (
          <span className="text-slate-300">—</span>
        )}
      </td>
      <td className="px-3 py-2.5">
        {row.email ? (
          <a
            href={`mailto:${row.email}`}
            className="inline-flex max-w-[14rem] items-center gap-1 truncate text-[#0F4C81] hover:underline"
            title={row.email}
          >
            <Mail className="size-3.5 shrink-0" />
            <span className="truncate">{row.email}</span>
          </a>
        ) : (
          <span className="text-slate-300">—</span>
        )}
      </td>
      <td className="px-3 py-2.5 text-slate-600">
        {[row.practiceCity, row.practiceState, row.practiceZip]
          .filter(Boolean)
          .join(", ") || "—"}
      </td>
      <td className="px-3 py-2.5 text-slate-600">
        {[row.boardCity, row.boardCounty].filter(Boolean).join(" · ") || "—"}
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-slate-600">
        {row.npi}
      </td>
      <td className="px-3 py-2.5">
        <Badge
          variant="secondary"
          className={
            row.matchConfidence === "high"
              ? "bg-[#4A9B8E]/15 text-[#2f6f65]"
              : "bg-slate-100 text-slate-600"
          }
        >
          {row.matchConfidence}
        </Badge>
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">
        {row.expirationDate || "—"}
      </td>
    </tr>
  );
}
