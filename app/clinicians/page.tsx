import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, ShieldAlert, UserRound } from "lucide-react";

import {
  CLINICIAN_ROLES,
  NPPES_DISCLAIMER,
  ROLE_LABELS,
  parseClinicianRole,
  searchClinicians,
  type ClinicianRole,
} from "@/app/lib/nppes";
import { US_STATES } from "@/app/lib/us-states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Clinicians for Hire — OpusGrex",
  description:
    "Browse Physical Therapists, Physical Therapy Assistants, Occupational Therapists, and Occupational Therapy Assistants enumerated in the CMS NPI Registry.",
};

type SearchParams = Promise<{
  role?: string;
  state?: string;
  city?: string;
  lastName?: string;
  page?: string;
}>;

const DEFAULT_ROLE: ClinicianRole = "PT";
const DEFAULT_STATE = "CA";
const PAGE_SIZE = 25;

function buildQuery(params: Record<string, string | undefined>) {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) q.set(key, value);
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

export default async function CliniciansPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const role = parseClinicianRole(sp.role) ?? DEFAULT_ROLE;
  const state = (sp.state?.trim().toUpperCase() || DEFAULT_STATE).slice(0, 2);
  const city = sp.city?.trim() || undefined;
  const lastName = sp.lastName?.trim() || undefined;
  const page = Math.max(Number(sp.page ?? "1") || 1, 1);

  let error: string | null = null;
  let result = null;

  try {
    result = await searchClinicians({
      role,
      state,
      city,
      lastName,
      page,
      limit: PAGE_SIZE,
    });
  } catch (e) {
    error = e instanceof Error ? e.message : "Unable to load clinicians";
  }

  const baseFilters = {
    role,
    state,
    city,
    lastName,
  };

  return (
    <main className="min-h-screen pt-24 pb-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#4A9B8E]">
            Clinicians for hire
          </p>
          <h1 className="mt-3 font-heading text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
            OpusGrex therapy directory
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            Browse Physical Therapists, Physical Therapy Assistants,
            Occupational Therapists, and Occupational Therapy Assistants from
            the national NPI Registry — then connect through OpusGrex.
          </p>
        </div>

        <div className="mt-8 flex gap-3 rounded-2xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-950 md:items-start">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-700" />
          <p>
            <span className="font-medium">NPI-enumerated, not board-verified.</span>{" "}
            {NPPES_DISCLAIMER}
          </p>
        </div>

        <form
          method="get"
          className="mt-10 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2 lg:grid-cols-5 lg:items-end"
        >
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">Role</span>
            <select
              name="role"
              defaultValue={role}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-slate-900 outline-none focus:border-[#0F4C81] focus:ring-2 focus:ring-[#0F4C81]/20"
            >
              {CLINICIAN_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]} ({r})
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">State</span>
            <select
              name="state"
              defaultValue={state}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-slate-900 outline-none focus:border-[#0F4C81] focus:ring-2 focus:ring-[#0F4C81]/20"
            >
              {US_STATES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">City</span>
            <input
              name="city"
              type="text"
              defaultValue={city ?? ""}
              placeholder="Optional"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#0F4C81] focus:ring-2 focus:ring-[#0F4C81]/20"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">
              Last name
            </span>
            <input
              name="lastName"
              type="text"
              defaultValue={lastName ?? ""}
              placeholder="Optional"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#0F4C81] focus:ring-2 focus:ring-[#0F4C81]/20"
            />
          </label>

          <Button
            type="submit"
            className="h-10 bg-[#0F4C81] text-white hover:bg-[#0F4C81]/90"
          >
            Search
          </Button>
        </form>

        <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-heading text-xl font-semibold text-slate-900">
              {ROLE_LABELS[role]}s in{" "}
              {US_STATES.find((s) => s.code === state)?.name ?? state}
            </h2>
            {result && !error && (
              <p className="mt-1 text-sm text-slate-500">
                Showing {result.clinicians.length} NPI-enumerated clinician
                {result.clinicians.length === 1 ? "" : "s"}
                {result.hasMore ? " (more available)" : ""}
                {result.apiSkipCapped
                  ? " — NPPES API skip limit reached"
                  : ""}
                . Live data from the CMS NPI Registry API.
              </p>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-900">
            {error}. Try again in a moment, or narrow your filters.
          </div>
        )}

        {!error && result && result.clinicians.length === 0 && (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center">
            <p className="font-medium text-slate-900">No clinicians found</p>
            <p className="mt-2 text-sm text-slate-500">
              Try another state, city, or last name. National bulk ingest is not
              enabled in v1 — results come from live NPPES searches.
            </p>
          </div>
        )}

        {!error && result && result.clinicians.length > 0 && (
          <ul className="mt-6 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {result.clinicians.map((clinician) => (
              <li
                key={clinician.npi}
                className="flex flex-col gap-4 px-5 py-5 transition-colors hover:bg-slate-50/80 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#0F4C81]/10">
                    <UserRound className="size-5 text-[#0F4C81]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium text-slate-900">
                        {clinician.displayName}
                        {clinician.credential ? `, ${clinician.credential}` : ""}
                      </p>
                      <Badge
                        variant="secondary"
                        className="bg-[#4A9B8E]/10 text-[#4A9B8E]"
                      >
                        {clinician.role}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="border-slate-200 text-slate-500"
                      >
                        NPI-enumerated
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {clinician.taxonomyDesc}
                      {clinician.reportedLicenseNumber
                        ? ` · Reported license ${clinician.reportedLicenseNumber}${
                            clinician.reportedLicenseState
                              ? ` (${clinician.reportedLicenseState})`
                              : ""
                          }`
                        : ""}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                      <MapPin className="size-3.5 shrink-0" />
                      {[clinician.city, clinician.state, clinician.postalCode]
                        .filter(Boolean)
                        .join(", ") || "Location not listed"}
                      <span className="text-slate-300">·</span>
                      <span className="font-mono text-xs text-slate-400">
                        NPI {clinician.npi}
                      </span>
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {result && (result.page > 1 || result.hasMore) && (
          <div className="mt-8 flex items-center justify-between gap-4">
            {result.page > 1 ? (
              <Link
                href={`/clinicians${buildQuery({
                  ...baseFilters,
                  page: String(result.page - 1),
                })}`}
                className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Previous
              </Link>
            ) : (
              <span />
            )}
            <p className="text-sm text-slate-500">Page {result.page}</p>
            {result.hasMore ? (
              <Link
                href={`/clinicians${buildQuery({
                  ...baseFilters,
                  page: String(result.page + 1),
                })}`}
                className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Next
              </Link>
            ) : (
              <span />
            )}
          </div>
        )}

        <p className="mt-12 text-center text-xs text-slate-400">
          Data © CMS NPPES. OpusGrex does not scrape state licensing boards in
          this release.
        </p>
      </div>
    </main>
  );
}
