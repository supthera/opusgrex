"use client";

import { motion } from "framer-motion";

import {
  AnimatedSection,
  fadeUpItem,
  StaggerGrid,
} from "@/app/components/AnimatedSection";
import { trustItems } from "@/app/lib/data";

export default function SecurityCompliance() {
  return (
    <AnimatedSection id="security" className="bg-slate-50 py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            Built with Clinical-Grade Standards
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Security and compliance aren&apos;t afterthoughts — they&apos;re
            foundational to every match on OpusGrex.
          </p>
        </div>

        <StaggerGrid className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {trustItems.map((item) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                variants={fadeUpItem}
                className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex size-12 items-center justify-center rounded-xl bg-[#0F4C81]/10">
                  <Icon className="size-6 text-[#0F4C81]" />
                </div>
                <h3 className="mt-6 font-heading text-base font-semibold leading-snug text-slate-900">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  {item.description}
                </p>
              </motion.div>
            );
          })}
        </StaggerGrid>
      </div>
    </AnimatedSection>
  );
}
