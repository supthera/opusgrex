"use client";

import { motion } from "framer-motion";

import {
  AnimatedSection,
  StaggerGrid,
} from "@/app/components/AnimatedSection";
import { StatCard } from "@/app/components/StatCard";
import { TestimonialCard } from "@/app/components/TestimonialCard";
import { stats, testimonials } from "@/app/lib/data";

export default function SocialProof() {
  return (
    <AnimatedSection className="bg-white py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            Trusted Across the Care Continuum
          </h2>
        </div>

        <StaggerGrid className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.label} value={stat.value} label={stat.label} />
          ))}
        </StaggerGrid>

        <StaggerGrid className="mt-16 grid gap-8 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <TestimonialCard
              key={testimonial.author}
              quote={testimonial.quote}
              author={testimonial.author}
              role={testimonial.role}
            />
          ))}
        </StaggerGrid>
      </div>
    </AnimatedSection>
  );
}
