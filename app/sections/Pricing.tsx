"use client";

import { Check } from "lucide-react";
import { motion } from "framer-motion";

import {
  AnimatedSection,
  fadeUpItem,
  StaggerGrid,
} from "@/app/components/AnimatedSection";
import { pricingTiers } from "@/app/lib/data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function Pricing() {
  return (
    <AnimatedSection id="pricing" className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            Simple, Transparent Pricing
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Choose the plan that fits your organization. No hidden agency
            markups.
          </p>
        </div>

        <StaggerGrid className="mt-16 grid gap-8 lg:grid-cols-3">
          {pricingTiers.map((tier) => (
            <motion.div key={tier.name} variants={fadeUpItem}>
              <Card
                className={cn(
                  "relative h-full rounded-2xl border-slate-200 py-0 shadow-sm transition-shadow hover:shadow-md",
                  tier.highlighted &&
                    "border-[#0F4C81] ring-2 ring-[#0F4C81]/20"
                )}
              >
                {tier.highlighted && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#4A9B8E] text-white">
                    Most Popular
                  </Badge>
                )}
                <CardHeader className="px-8 pt-8">
                  <CardTitle className="font-heading text-xl text-slate-900">
                    {tier.name}
                  </CardTitle>
                  <CardDescription className="text-slate-600">
                    {tier.description}
                  </CardDescription>
                  <p className="pt-4 font-heading text-3xl font-semibold text-slate-900">
                    {tier.price}
                  </p>
                </CardHeader>
                <CardContent className="px-8">
                  <ul className="space-y-3">
                    {tier.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-3 text-sm text-slate-600"
                      >
                        <Check className="mt-0.5 size-4 shrink-0 text-[#4A9B8E]" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="border-0 bg-transparent px-8 pb-8">
                  <Button
                    className={cn(
                      "w-full transition-all hover:scale-[1.02]",
                      tier.highlighted
                        ? "bg-[#0F4C81] text-white hover:bg-[#0F4C81]/90"
                        : "border-slate-300"
                    )}
                    variant={tier.highlighted ? "default" : "outline"}
                  >
                    {tier.cta}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </StaggerGrid>
      </div>
    </AnimatedSection>
  );
}
