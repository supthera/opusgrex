"use client";

import { useEffect, useMemo, useState } from "react";
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

import type { CaOtClinician, CaOtRoster } from "@/app/lib/ca-ot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 50;

type RosterPayload = Pick<
  CaOtRoster,
  "generatedAt" | "disclaimer" | "stats" | "clinicians"
> & {
  backlogNoContactCount?: number;
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

function csvEscape(value: string | null | undefined) {
  const s = value ?? "";
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCsv(rows: CaOtClinician[]) {
  const headers = [
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
  const lines = [
    headers.join(","),
    ...rows.map((r) => {
      const record = r as unknown as Record<string, string | null | undefined>;
      return headers.map((h) => csvEscape(String(record[h] ?? ""))).join(",");
    }),
  ];
  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `opusgrex-ca-ot-contactable-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function CaOtAppClient() {
  const [roster, setRoster] = useState<RosterPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [confidence, setConfidence] = useState<"all" | "high" | "medium">(
    "all"
  );
  const [contact, setContact] = useState<"all" | "phone" | "email" | "both">(
    "all"
  );
  const [county, setCounty] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/ca-ot");
        if (!res.ok) throw new Error(`Failed to load roster (${res.status})`);
        const data = (await res.json()) as RosterPayload;
        if (!cancelled) {
          setRoster(data);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load roster");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const counties = useMemo(() => {
    if (!roster) return [];
    const set = new Set<string>();
    for (const c of roster.clinicians) {
      if (c.boardCounty) set.add(c.boardCounty);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [roster]);

  const filtered = useMemo(() => {
    if (!roster) return [];
    const q = query.trim().toLowerCase();
    return roster.clinicians.filter((c) => {
      if (confidence !== "all" && c.matchConfidence !== confidence) return false;
      if (county !== "all" && c.boardCounty !== county) return false;
      if (contact === "phone" && !c.phone) return false;
      if (contact === "email" && !c.email) return false;
      if (contact === "both" && !(c.phone && c.email)) return false;
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
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [roster, query, confidence, contact, county]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-20 text-slate-600 shadow-sm">
        <LoaderCircle className="size-5 animate-spin text-[#0F4C81]" />
        Loading CA OT roster…
      </div>
    );
  }

  if (error || !roster) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-900">
        {error || "Roster unavailable."}
      </div>
    );
  }

  const withPhone = roster.clinicians.filter((c) => c.phone).length;
  const withEmail = roster.clinicians.filter((c) => c.email).length;
  const high = roster.clinicians.filter(
    (c) => c.matchConfidence === "high"
  ).length;

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-[#4A9B8E]/25 bg-white/90 px-4 py-3 text-sm text-slate-700 shadow-sm">
        <strong className="text-slate-900">Data labels:</strong>{" "}
        {roster.disclaimer} Generated{" "}
        {new Date(roster.generatedAt).toLocaleString("en-US", {
          timeZone: "America/Los_Angeles",
        })}{" "}
        PT.
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Board-active OTs"
          value={roster.stats.boardActiveOt.toLocaleString()}
          hint="CA DCA Current Occupational Therapist"
        />
        <StatCard
          label="With public contact"
          value={roster.stats.matchedWithContact.toLocaleString()}
          hint="Primary table — phone and/or email via NPPES"
        />
        <StatCard
          label="Phone / email"
          value={`${withPhone.toLocaleString()} / ${withEmail.toLocaleString()}`}
          hint="Public NPPES practice phone · Direct email when listed"
        />
        <StatCard
          label="High-confidence match"
          value={high.toLocaleString()}
          hint="License number aligned board ↔ NPPES"
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
              {counties.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="button"
            variant="outline"
            className="h-10 gap-2"
            onClick={() => downloadCsv(filtered)}
            disabled={filtered.length === 0}
          >
            <Download className="size-4" />
            CSV
          </Button>
        </div>
        <p className="mt-3 text-sm text-slate-500">
          Showing {filtered.length.toLocaleString()} of{" "}
          {roster.clinicians.length.toLocaleString()} contactable rows ·{" "}
          {roster.stats.unmatchedActiveBoard.toLocaleString()} board-active OTs
          not yet matched to NPPES (excluded from table).
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
          <Table2 className="size-4 text-[#0F4C81]" />
          <h2 className="font-heading text-base font-semibold text-slate-900">
            Contactable active California OTs
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
                  NPI
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
                  Match
                </th>
                <th className="whitespace-nowrap px-3 py-3 font-semibold">
                  Expires
                </th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <ClinicianRow key={row.licenseNumber} row={row} />
              ))}
              {pageRows.length === 0 && (
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
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <p className="text-sm text-slate-500">
            Page {safePage} of {pageCount}
          </p>
          <Button
            variant="outline"
            disabled={safePage >= pageCount}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
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

function ClinicianRow({ row }: { row: CaOtClinician }) {
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
      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-slate-600">
        {row.npi}
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
