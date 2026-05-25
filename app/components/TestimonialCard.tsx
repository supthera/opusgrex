"use client";

import { motion } from "framer-motion";

import { fadeUpItem } from "@/app/components/AnimatedSection";

interface TestimonialCardProps {
  quote: string;
  author: string;
  role: string;
}

export function TestimonialCard({ quote, author, role }: TestimonialCardProps) {
  return (
    <motion.blockquote
      variants={fadeUpItem}
      className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-shadow hover:shadow-md"
    >
      <p className="flex-1 text-base leading-relaxed text-slate-600">
        &ldquo;{quote}&rdquo;
      </p>
      <footer className="mt-6 border-t border-slate-100 pt-6">
        <cite className="not-italic">
          <p className="font-medium text-slate-900">{author}</p>
          <p className="mt-0.5 text-sm text-slate-500">{role}</p>
        </cite>
      </footer>
    </motion.blockquote>
  );
}
