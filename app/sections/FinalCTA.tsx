"use client";

import { AnimatedSection } from "@/app/components/AnimatedSection";
import { Button } from "@/components/ui/button";

export default function FinalCTA() {
  return (
    <AnimatedSection className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="rounded-3xl bg-[#0F4C81] px-8 py-16 text-center md:px-16 md:py-20">
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-white md:text-4xl">
            Stop Searching. Start Staffing.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            Join the healthcare facilities and clinicians already using OpusGrex
            to solve staffing, faster.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              size="lg"
              className="h-12 bg-white px-8 text-base text-[#0F4C81] transition-all hover:scale-[1.02] hover:bg-white/90"
            >
              Hire Staff
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 border-white/30 bg-transparent px-8 text-base text-white transition-all hover:scale-[1.02] hover:bg-white/10"
            >
              Join as a Clinician
            </Button>
          </div>
        </div>
      </div>
    </AnimatedSection>
  );
}
