import type { Metadata } from "next";
import Link from "next/link";

import CaOtAppClient from "@/app/app/CaOtAppClient";
import { loadCaOtRoster } from "@/app/lib/ca-ot";

export const metadata: Metadata = {
  title: "CA OT Recruiting App — OpusGrex",
  description:
    "Active California Occupational Therapists from DCA/CBOT, enriched with NPPES public contact info.",
};

export default async function AppPage() {
  const roster = await loadCaOtRoster();

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#FAF9F6_0%,#F3F6F8_100%)] pt-24 pb-16">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-[#4A9B8E]">
              Recruiting app
            </p>
            <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
              California active OTs
            </h1>
            <p className="mt-3 text-base leading-relaxed text-slate-600">
              Board-sourced <strong>Current</strong> Occupational Therapist
              licenses from California DCA / CBOT, enriched with NPPES practice
              phone and email when publicly listed. Separate from the marketing
              site.
            </p>
          </div>
          <Link
            href="/"
            className="text-sm font-medium text-slate-500 transition-colors hover:text-[#0F4C81]"
          >
            ← Marketing site
          </Link>
        </div>

        <div className="mt-6 rounded-2xl border border-[#4A9B8E]/25 bg-white/90 px-4 py-3 text-sm text-slate-700 shadow-sm">
          <strong className="text-slate-900">Data labels:</strong>{" "}
          {roster.disclaimer} Generated{" "}
          {new Date(roster.generatedAt).toLocaleString("en-US", {
            timeZone: "America/Los_Angeles",
          })}{" "}
          PT.
        </div>

        <div className="mt-8">
          <CaOtAppClient roster={roster} />
        </div>
      </div>
    </main>
  );
}
