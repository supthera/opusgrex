import type { Metadata } from "next";
import { Suspense } from "react";

import CaBoardAppClient from "./CaBoardAppClient";
import {
  PROFESSION_META,
  parseProfession,
} from "@/app/lib/ca-board-types";

export const metadata: Metadata = {
  title: "CA OT / OTA / PT / PTA Recruiting App — OpusGrex",
  description:
    "Active California Occupational and Physical Therapists and Assistants from DCA boards, enriched with NPPES public contact info.",
};

export default async function AppPage({
  searchParams,
}: {
  searchParams: Promise<{ profession?: string }>;
}) {
  const params = await searchParams;
  const profession = parseProfession(params.profession);
  const meta = PROFESSION_META[profession];

  return (
    <main className="bg-[linear-gradient(180deg,#FAF9F6_0%,#F3F6F8_100%)] pb-16 pt-8">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#4A9B8E]">
            Recruiting app · {meta.shortTitle}
          </p>
          <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            California active {meta.plural}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-slate-600">
            Board-sourced <strong>Current</strong> {meta.shortTitle} from
            California DCA, enriched with NPPES practice phone and email when
            publicly listed. Use the{" "}
            <strong>OT / OTA / PT / PTA</strong> switch in the header to change
            profession.
          </p>
        </div>

        <div className="mt-8">
          <Suspense
            fallback={
              <div className="rounded-2xl border border-slate-200 bg-white px-5 py-10 text-slate-600 shadow-sm">
                Loading roster…
              </div>
            }
          >
            <CaBoardAppClient initialProfession={profession} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
