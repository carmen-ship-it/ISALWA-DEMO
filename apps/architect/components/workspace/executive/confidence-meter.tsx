"use client";

import { motion } from "motion/react";

export function ConfidenceMeter({
  value,
  label = "Business Understanding",
}: {
  value: number;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
          {label}
        </p>
        <p className="architect-serif text-3xl text-neutral-950">{clamped}%</p>
      </div>
      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-neutral-200/80">
        <motion.div
          className="h-full rounded-full bg-neutral-950"
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <p className="mt-3 font-mono text-[11px] tracking-widest text-neutral-400">
        {meterGlyphs(clamped)}
      </p>
    </div>
  );
}

function meterGlyphs(value: number): string {
  const filled = Math.round(value / 8);
  return `${"█".repeat(filled)}${"░".repeat(Math.max(0, 12 - filled))}`;
}
