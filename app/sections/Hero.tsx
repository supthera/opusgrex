"use client";

import { ArrowRight, UserRound } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

import { AnimatedSection } from "@/app/components/AnimatedSection";
import {
  clinicianCards,
  facilityCards,
  partnerBadges,
} from "@/app/lib/data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function Hero() {
  return (
    <AnimatedSection className="overflow-hidden pt-28 pb-16 md:pt-36 md:pb-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid items-center gap-16 lg:grid-cols-2 lg:gap-12">
          <div>
            <h1 className="font-heading text-4xl font-semibold leading-tight tracking-tight text-slate-900 md:text-5xl lg:text-6xl">
              Hire Verified Clinical Talent, Nationwide.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
              OpusGrex connects hospitals and care facilities with licensed,
              credentialed healthcare professionals — ready to work when you
              need them.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Button
                size="lg"
                nativeButton={false}
                render={<Link href="/clinicians" />}
                className="h-12 bg-[#0F4C81] px-8 text-base text-white transition-all hover:scale-[1.02] hover:bg-[#0F4C81]/90"
              >
                Hire Staff
              </Button>
              <Button
                size="lg"
                variant="outline"
                nativeButton={false}
                render={<Link href="/#for-clinicians" />}
                className="h-12 border-slate-300 px-8 text-base text-slate-700 transition-all hover:scale-[1.02] hover:bg-white"
              >
                Join as a Clinician
              </Button>
            </div>
          </div>

          {/* Hero bento: clinicians ↔ facilities matching visual */}
          <div className="relative">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
              <div className="space-y-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Clinicians
                </p>
                {clinicianCards.map((card, i) => (
                  <motion.div
                    key={card.role}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: 0.5,
                      delay: 0.2 + i * 0.1,
                      ease: [0, 0, 0.2, 1],
                    }}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-[#0F4C81]/10">
                        <UserRound className="size-5 text-[#0F4C81]" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{card.role}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {card.badges.map((badge) => (
                            <Badge
                              key={badge}
                              variant="secondary"
                              className="bg-[#4A9B8E]/10 text-[10px] text-[#4A9B8E]"
                            >
                              {badge}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="relative flex h-full flex-col items-center justify-center py-8">
                <motion.div
                  animate={{ scale: [1, 1.15, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: [0, 0, 0.2, 1],
                  }}
                  className="absolute h-full w-px bg-[#4A9B8E]/40"
                />
                <motion.div
                  animate={{ x: [0, 4, 0] }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: [0, 0, 0.2, 1],
                  }}
                  className="relative z-10 flex size-10 items-center justify-center rounded-full bg-[#4A9B8E] text-white shadow-sm"
                >
                  <ArrowRight className="size-4" />
                </motion.div>
              </div>

              <div className="space-y-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Facilities
                </p>
                {facilityCards.map((card, i) => (
                  <motion.div
                    key={card.name}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: 0.5,
                      delay: 0.3 + i * 0.1,
                      ease: [0, 0, 0.2, 1],
                    }}
                    className="rounded-2xl border border-slate-200 bg-[#0F4C81]/5 p-4 shadow-sm"
                  >
                    <p className="font-medium text-slate-900">{card.name}</p>
                    <p className="mt-0.5 text-sm text-slate-500">{card.type}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-20 border-t border-slate-200 pt-12">
          <p className="text-center text-xs font-medium uppercase tracking-wider text-slate-400">
            Trusted by leading care organizations
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            {partnerBadges.map((name) => (
              <span
                key={name}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-400"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </AnimatedSection>
  );
}
