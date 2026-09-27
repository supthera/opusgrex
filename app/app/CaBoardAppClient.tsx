"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
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
  PROFESSION_META,
  parseProfession,
  type CaBoardClinician,
  type CaBoardStats,
  type CaProfession,
} from "@/app/lib/ca-board-types";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;

type PagePayload = {
  generatedAt: string;
  profession: CaProfession;
  disclaimer: string;
  stats: CaBoardStats;
  counties: string[];
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
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-2 font-heading text-3xl font-semibold text-slate-900">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function buildApiUrl(
  profession: CaProfession,
  opts: {
    page: number;
    q: string;
    confidence: string;
    contact: string;
    county: string;
    exportType?: "contactable" | "backlog";
  }
) {
  const params = new URLSearchParams();
  if (opts.exportType) {
    params.set("export", opts.exportType);
  } else {
    params.set("page", String(opts.page));
    params.set("pageSize", String(PAGE_SIZE));
  }
  if (opts.q.trim()) params.set("q", opts.q.trim());
  if (opts.confidence !== "all") params.set("confidence", opts.confidence);
  if (opts.contact !== "all") params.set("contact", opts.contact);
  if (opts.county !== "all") params.set("county", opts.county);
  return `${PROFESSION_META[profession].apiPath}?${params.toString()}`;
}

export default function CaBoardAppClient({
  initialProfession = "ot",
}: {
  initialProfession?: CaProfession;
}) {
  const searchParams = useSearchParams();
  const profession: CaProfession = parseProfession(
    searchParams.get("profession"),
    initialProfession
  );

  const [roster, setRoster] = useState<PagePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [confidence, setConfidence] = useState<"all" | "high" | "medium">(
    "all"
  );
  const [contact, setContact] = useState<"all" | "phone" | "email" | "both">(
    "all"
  );
  const [county, setCounty] = useState("all");
  const [page, setPage] = useState(1);

  const meta = PROFESSION_META[profession];

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setQuery("");
    setDebouncedQuery("");
    setConfidence("all");
    setContact("all");
    setCounty("all");
    setPage(1);
  }, [profession]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const url = buildApiUrl(profession, {
          page,
          q: debouncedQuery,
          confidence,
          contact,
          county,
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
  }, [profession, page, debouncedQuery, confidence, contact, county]);

  if (loading && !roster) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-10 text-slate-600 shadow-sm">
        <LoaderCircle className="size-5 animate-spin text-[#0F4C81]" />
        Loading California {meta.shortTitle.toLowerCase()}…
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
    buildApiUrl(profession, {
      page: 1,
      q: debouncedQuery,
      confidence,
      contact,
      county,
      exportType,
    });

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-[#4A9B8E]/25 bg-white/90 px-4 py-3 text-sm text-slate-700 shadow-sm">
        <strong className="text-slate-900">Data labels:</strong>{" "}
        {roster.disclaimer} Generated{" "}
        {new Date(roster.generatedAt).toLocaleString("en-US", {
          timeZone: "America/Los_Angeles",
        })}{" "}
        Pacific.
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={`Board-active ${meta.plural}`}
          value={roster.stats.boardActive.toLocaleString()}
          hint={meta.boardHint}
        />
        <StatCard
          label="With public contact"
          value={roster.stats.matchedWithContact.toLocaleString()}
          hint={`${matchRate}% of board-active · phone and/or email via NPPES`}
        />
        <StatCard
          label="Showing now"
          value={roster.total.toLocaleString()}
          hint="Contactable rows after current filters"
        />
        <StatCard
          label="Unmatched backlog"
          value={roster.unmatchedCount.toLocaleString()}
          hint="Board-active, not yet matched to NPPES"
        />
      </div>

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
              placeholder="Name, license, NPI, phone, city…"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#0F4C81] focus:ring-2 focus:ring-[#0F4C81]/20"
            />
          </label>
          <label className="block text-sm lg:w-40">
            <span className="mb-1.5 block font-medium text-slate-700">
              Match
            </span>
            <select
              value={confidence}
              onChange={(e) => {
                setConfidence(e.target.value as typeof confidence);
                setPage(1);
              }}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-slate-900 outline-none focus:border-[#0F4C81] focus:ring-2 focus:ring-[#0F4C81]/20"
            >
              <option value="all">All</option>
              <option value="high">High (license #)</option>
              <option value="medium">Medium (name)</option>
            </select>
          </label>
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
          <label className="block text-sm lg:w-48">
            <span className="mb-1.5 block font-medium text-slate-700">
              Board county
            </span>
            <select
              value={county}
              onChange={(e) => {
                setCounty(e.target.value);
                setPage(1);
              }}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-slate-900 outline-none focus:border-[#0F4C81] focus:ring-2 focus:ring-[#0F4C81]/20"
            >
              <option value="all">All counties</option>
              {roster.counties.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <a
            href={exportHref("contactable")}
            className={cn(buttonVariants({ variant: "outline" }), "h-10 gap-2")}
          >
            <Download className="size-4" />
            CSV
          </a>
          <a
            href={exportHref("backlog")}
            className={cn(buttonVariants({ variant: "outline" }), "h-10 gap-2")}
          >
            <Download className="size-4" />
            Unmatched backlog
          </a>
        </div>
        <p className="mt-3 text-sm text-slate-500">
          Showing page {roster.page} · {roster.total.toLocaleString()}{" "}
          contactable after filters ·{" "}
          {roster.stats.boardActive.toLocaleString()} board-active Current ·{" "}
          {roster.unmatchedCount.toLocaleString()} unmatched (excluded from
          table).
          {loading ? " Updating…" : null}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
          <Table2 className="size-4 text-[#0F4C81]" />
          <h2 className="font-heading text-base font-semibold text-slate-900">
            Contactable active California {meta.plural}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="whitespace-nowrap px-3 py-3 font-semibold">
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
                <ClinicianRow key={row.licenseNumber} row={row} />
              ))}
              {roster.clinicians.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
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
          Primary key is <strong>CA license number</strong>. NPI is secondary
          from NPPES enrichment.
        </div>
        <div className="rounded-2xl border border-slate-200 bg-[#0F4C81]/5 px-4 py-4 text-sm text-slate-700">
          <ShieldCheck className="mb-2 size-4 text-[#4A9B8E]" />
          <strong>Board-sourced Current</strong> license status — not inferred
          from NPI alone.
        </div>
        <div className="rounded-2xl border border-slate-200 bg-[#0F4C81]/5 px-4 py-4 text-sm text-slate-700">
          <Phone className="mb-2 size-4 text-[#0F4C81]" />
          Table only includes rows with a public{" "}
          <strong>phone and/or email</strong> from NPPES.
        </div>
      </div>
    </div>
  );
}

function ClinicianRow({ row }: { row: CaBoardClinician }) {
  return (
    <tr className="border-t border-slate-100 hover:bg-slate-50/80">
      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-slate-800">
        {row.licenseNumber}
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
