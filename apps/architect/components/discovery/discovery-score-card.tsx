"use client";

import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import type { DiscoveryScore } from "@/types";
import { cn } from "@/lib/utils";

export function DiscoveryScoreCard({ score }: { score: DiscoveryScore }) {
  return (
    <Card className="overflow-hidden px-5 py-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
        Business Understanding
      </p>
      <div className="mt-3 flex items-end gap-2">
        <motion.span
          key={score.overall}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="architect-serif text-5xl leading-none text-neutral-950"
        >
          {score.overall}
        </motion.span>
        <span className="mb-1 text-lg text-neutral-400">%</span>
      </div>

      <ul className="mt-6 space-y-2.5">
        {score.dimensions.map((dimension) => (
          <li
            key={dimension.id}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="flex items-center gap-2 text-neutral-700">
              <span
                className={cn(
                  "inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px]",
                  dimension.covered
                    ? "bg-neutral-900 text-white"
                    : "border border-neutral-300 text-neutral-400",
                )}
                aria-hidden
              >
                {dimension.covered ? "✓" : "○"}
              </span>
              {dimension.label}
            </span>
            <span className="text-xs text-neutral-400">
              {dimension.confidence}%
            </span>
          </li>
        ))}
      </ul>

      {score.stillNeed.length > 0 ? (
        <div className="mt-5 border-t border-neutral-100 pt-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-500">
            Still need
          </p>
          <ul className="mt-2 space-y-1">
            {score.stillNeed.slice(0, 4).map((item) => (
              <li key={item} className="text-sm text-neutral-600">
                • {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}
