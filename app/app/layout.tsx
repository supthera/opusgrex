"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback } from "react";

import {
  CA_PROFESSIONS,
  parseProfession,
  type CaProfession,
} from "@/app/lib/ca-board-types";

function ProfessionTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = parseProfession(searchParams.get("profession"));

  const setProfession = useCallback(
    (next: CaProfession) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "ot") params.delete("profession");
      else params.set("profession", next);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  return (
    <div
      className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5"
      role="tablist"
      aria-label="Profession"
    >
      {CA_PROFESSIONS.map((key) => {
        const selected = active === key;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => setProfession(key)}
            className={
              selected
                ? "rounded-md bg-[#0F4C81] px-2.5 py-1.5 text-xs font-semibold uppercase text-white"
                : "rounded-md px-2.5 py-1.5 text-xs font-semibold uppercase text-slate-600 hover:text-[#0F4C81]"
            }
          >
            {key}
          </button>
        );
      })}
    </div>
  );
}

export default function AppShellLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#FAF9F6]/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-4 px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/app"
              className="font-heading text-lg font-semibold tracking-tight text-[#0F4C81]"
            >
              OpusGrex
            </Link>
            <span className="hidden rounded-md bg-[#0F4C81]/10 px-2 py-0.5 text-xs font-medium text-[#0F4C81] sm:inline">
              CA recruiting
            </span>
            <Suspense
              fallback={
                <div className="h-8 w-[180px] rounded-lg border border-slate-200 bg-white" />
              }
            >
              <ProfessionTabs />
            </Suspense>
          </div>
          <Link
            href="/"
            className="shrink-0 text-sm font-medium text-slate-500 transition-colors hover:text-[#0F4C81]"
          >
            Marketing site
          </Link>
        </div>
      </header>
      {children}
    </div>
  );
}
