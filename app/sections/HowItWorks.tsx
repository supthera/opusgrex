"use client";

import { motion } from "framer-motion";

import {
  AnimatedSection,
  fadeUpItem,
  StaggerGrid,
} from "@/app/components/AnimatedSection";
import { howItWorksSteps } from "@/app/lib/data";

export default function HowItWorks() {
  return (
    <AnimatedSection id="how-it-works" className="bg-white py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            Clinical Staffing in Three Steps
          </h2>
        </div>

        <StaggerGrid className="relative mt-16 grid gap-12 md:grid-cols-3 md:gap-8">
          <div
            aria-hidden="true"
            className="absolute top-8 hidden h-px bg-slate-200 md:left-[16.67%] md:block md:w-[66.67%]"
          />

          {howItWorksSteps.map((step) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.step}
                variants={fadeUpItem}
                className="relative text-center"
              >
                <div className="mx-auto flex size-14 items-center justify-center rounded-full border-2 border-[#0F4C81] bg-white font-heading text-lg font-semibold text-[#0F4C81]">
                  {step.step}
                </div>
                <div className="mx-auto mt-6 flex size-12 items-center justify-center rounded-xl bg-[#4A9B8E]/10">
                  <Icon className="size-6 text-[#4A9B8E]" />
                </div>
                <h3 className="mt-6 font-heading text-xl font-semibold text-slate-900">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  {step.description}
                </p>
              </motion.div>
            );
          })}
        </StaggerGrid>
      </div>
    </AnimatedSection>
  );
}
