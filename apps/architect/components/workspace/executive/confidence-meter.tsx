"use client";

import { motion } from "motion/react";
import {
  strengthBand,
  understandingLevel,
  understandingSentence,
} from "@/lib/presentation";

export function ConfidenceMeter({
  value,
  label = "Business understanding",
}: {
  value: number;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const level = understandingLevel(clamped);
  const band = strengthBand(clamped, "percent");
  const width =
    band === "High" ? 92 : band === "Medium" ? 62 : band === "Low" ? 34 : 16;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
          {label}
        </p>
        <p className="architect-serif text-3xl text-neutral-950">{level}</p>
      </div>
      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-neutral-200/80">
        <motion.div
          className="h-full rounded-full bg-neutral-950"
          initial={{ width: 0 }}
          animate={{ width: `${width}%` }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          aria-hidden
        />
      </div>
      <p className="mt-3 text-sm leading-relaxed text-neutral-600">
        {understandingSentence(clamped)}
      </p>
    </div>
  );
}
