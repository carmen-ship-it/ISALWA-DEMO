"use client";

import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import type { ModuleInsightCard } from "@/lib/executive";

export function ModuleInsightCards({
  modules,
}: {
  modules: ModuleInsightCard[];
}) {
  if (modules.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        Module cards appear as discovery evidence accumulates.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
          Recommended Modules
        </p>
        <h3 className="architect-serif mt-3 text-3xl text-neutral-950">
          Not a list. A case for each module.
        </h3>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {modules.map((mod, i) => (
          <motion.div
            key={mod.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.4 }}
          >
            <Card className="h-full px-5 py-5">
              <p className="text-xl text-neutral-950">{mod.name}</p>
              <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-400">
                Why?
              </p>
              <ul className="mt-2 space-y-1.5">
                {mod.why.map((reason) => (
                  <li
                    key={reason}
                    className="flex gap-2 text-sm text-neutral-700"
                  >
                    <span className="text-neutral-400">✓</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-neutral-100 pt-4 text-xs text-neutral-500">
                <span>
                  Expected ROI{" "}
                  <span className="font-medium text-neutral-900">
                    {mod.expectedRoi}
                  </span>
                </span>
                <span>
                  Priority{" "}
                  <span className="font-medium text-neutral-900">
                    {mod.priority}
                  </span>
                </span>
                <span>
                  Confidence{" "}
                  <span className="font-medium text-neutral-900">
                    {Math.round(mod.confidence * 100)}%
                  </span>
                </span>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
