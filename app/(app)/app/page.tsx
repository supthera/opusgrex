import type { Metadata } from "next";

import CaOtAppClient from "./CaOtAppClient";

export const metadata: Metadata = {
  title: "CA OT Recruiting App — OpusGrex",
  description:
    "Active California Occupational Therapists from DCA/CBOT, enriched with NPPES public contact info.",
};

export default function AppPage() {
  return (
    <main className="bg-[linear-gradient(180deg,#FAF9F6_0%,#F3F6F8_100%)] pb-16 pt-8">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-8">
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

        <div className="mt-8">
          <CaOtAppClient />
        </div>
      </div>
    </main>
  );
}
