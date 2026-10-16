"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

import {
  CA_PROFESSIONS,
  PROFESSION_META,
  RECRUITING_STATES,
  STATE_META,
  parseProfession,
  parseState,
  type CaProfession,
  type RecruitingState,
} from "@/app/lib/ca-board-types";

function ProfessionTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = parseProfession(searchParams.get("profession"));

  const setProfession = useCallback(
    (next: CaProfession) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("professions");
      if (next === "ot") params.delete("profession");
      else params.set("profession", next);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  return (
    <div
      className="flex max-w-full items-center overflow-x-auto rounded-lg border border-slate-200 bg-white p-0.5"
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
                ? "rounded-md bg-[#0F4C81] px-2.5 py-1.5 text-xs font-semibold uppercase whitespace-nowrap text-white"
                : "rounded-md px-2.5 py-1.5 text-xs font-semibold uppercase whitespace-nowrap text-slate-600 hover:text-[#0F4C81]"
            }
          >
            {PROFESSION_META[key].label}
          </button>
        );
      })}
    </div>
  );
}

function StateMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const state = parseState(searchParams.get("state"));
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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

  const selectState = useCallback(
    (next: RecruitingState) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "ca") params.delete("state");
      else params.set("state", next);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      setOpen(false);
    },
    [pathname, router, searchParams]
  );

  return (
    <div ref={rootRef} className="relative hidden sm:block">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="State"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-1 rounded-md bg-[#0F4C81]/10 px-2 py-0.5 text-xs font-medium text-[#0F4C81]"
      >
        {STATE_META[state].label}
        <ChevronDown className="size-3" />
      </button>
      {open ? (
        <div
          role="listbox"
          aria-label="State"
          className="absolute left-0 z-50 mt-1 min-w-[9.5rem] rounded-lg border border-slate-200 bg-white p-1 shadow-md"
        >
          {RECRUITING_STATES.map((key) => {
            const selected = key === state;
            return (
              <button
                key={key}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => selectState(key)}
                className={
                  selected
                    ? "flex w-full rounded-md bg-[#0F4C81] px-2.5 py-1.5 text-left text-xs font-semibold text-white"
                    : "flex w-full rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                }
              >
                {STATE_META[key].label}
              </button>
            );
          })}
        </div>
      ) : null}
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
            <Suspense
              fallback={
                <span className="hidden rounded-md bg-[#0F4C81]/10 px-2 py-0.5 text-xs font-medium text-[#0F4C81] sm:inline">
                  California
                </span>
              }
            >
              <StateMenu />
            </Suspense>
            <Suspense
              fallback={
                <div className="h-8 w-[320px] rounded-lg border border-slate-200 bg-white" />
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
