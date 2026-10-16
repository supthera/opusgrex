import type { Metadata } from "next";
import { Suspense } from "react";

import CaBoardAppClient from "./CaBoardAppClient";
import {
  PROFESSION_META,
  ROSTER_PROFESSIONS,
  STATE_META,
  parseProfession,
  parseRosterProfessions,
  parseState,
} from "@/app/lib/ca-board-types";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const state = parseState(params.state);
  const label = STATE_META[state].label;
  return {
    title: `${STATE_META[state].code} Clinician Recruiting App — OpusGrex`,
    description: `${label} OT, OTA, PT, PTA, LVN, and RN clinicians for recruiting.`,
  };
}

export default async function AppPage({
  searchParams,
}: {
  searchParams: Promise<{
    profession?: string;
    professions?: string;
    state?: string;
  }>;
}) {
  const params = await searchParams;
  const profession = parseProfession(params.profession);
  const state = parseState(params.state);
  const stateLabel = STATE_META[state].label;
  const meta = PROFESSION_META[profession];
  const picked = parseRosterProfessions(params.professions);
  const subset =
    profession === "all" &&
    picked != null &&
    picked.length > 1 &&
    picked.length < ROSTER_PROFESSIONS.length;
  const eyebrow = subset
    ? picked.map((key) => PROFESSION_META[key].label).join(", ")
    : meta.shortTitle;

  return (
    <main className="bg-[linear-gradient(180deg,#FAF9F6_0%,#F3F6F8_100%)] pb-16 pt-8">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#4A9B8E]">
            Recruiting app · {eyebrow}
          </p>
          <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            {profession === "all"
              ? `${stateLabel} Clinicians`
              : `${stateLabel} ${meta.plural}`}
          </h1>
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
