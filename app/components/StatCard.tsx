"use client";

import { motion } from "framer-motion";

import { fadeUpItem } from "@/app/components/AnimatedSection";

interface StatCardProps {
  value: string;
  label: string;
}

export function StatCard({ value, label }: StatCardProps) {
  return (
    <motion.div
      variants={fadeUpItem}
      className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm transition-shadow hover:shadow-md"
    >
      <p className="font-heading text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
        {value}
      </p>
      <p className="mt-2 text-sm font-medium text-slate-600">{label}</p>
    </motion.div>
  );
}
