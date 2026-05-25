"use client";

import { motion } from "framer-motion";
import { Building2, Stethoscope } from "lucide-react";

import {
  AnimatedSection,
  fadeUpItem,
  StaggerGrid,
} from "@/app/components/AnimatedSection";
import { clinicianFeatures, employerFeatures } from "@/app/lib/data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function FeatureGrid({
  features,
  variant,
}: {
  features: readonly string[];
  variant: "employer" | "clinician";
}) {
  const isEmployer = variant === "employer";

  return (
    <StaggerGrid className="mt-8 grid gap-4 sm:grid-cols-2">
      {features.map((feature, i) => (
        <motion.div
          key={feature}
          variants={fadeUpItem}
          className={
            isEmployer
              ? i % 2 === 0
                ? "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                : "rounded-2xl border border-slate-200 bg-[#0F4C81]/5 p-6 shadow-sm transition-shadow hover:shadow-md"
              : i % 2 === 0
                ? "rounded-2xl border border-slate-200 bg-[#4A9B8E]/5 p-6 shadow-sm transition-shadow hover:shadow-md"
                : "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          }
        >
          <p className="font-medium text-slate-900">{feature}</p>
        </motion.div>
      ))}
    </StaggerGrid>
  );
}

export default function DualAudience() {
  return (
    <AnimatedSection className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            Built for Healthcare — On Both Sides
          </h2>
        </div>

        <Tabs defaultValue="employers" className="mt-12">
          <TabsList className="mx-auto flex w-full max-w-md">
            <TabsTrigger value="employers" className="flex-1 gap-2">
              <Building2 className="size-4" />
              For Employers
            </TabsTrigger>
            <TabsTrigger value="clinicians" className="flex-1 gap-2">
              <Stethoscope className="size-4" />
              For Clinicians
            </TabsTrigger>
          </TabsList>

          <TabsContent value="employers" id="for-employers">
            <FeatureGrid features={employerFeatures} variant="employer" />
          </TabsContent>

          <TabsContent value="clinicians" id="for-clinicians">
            <FeatureGrid features={clinicianFeatures} variant="clinician" />
          </TabsContent>
        </Tabs>
      </div>
    </AnimatedSection>
  );
}
