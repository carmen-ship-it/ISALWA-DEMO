"use client";

import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { ExecutiveDetail } from "@/components/workspace/executive-detail";
import { recommendationStrength, strengthHint } from "@/lib/presentation";
import type { ModuleInsightCard } from "@/lib/executive";

export function ModuleInsightCards({
  modules,
}: {
  modules: ModuleInsightCard[];
}) {
  if (modules.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        Capability recommendations appear as discovery evidence accumulates.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
          Recommended capabilities
        </p>
        <h3 className="architect-serif mt-3 text-3xl text-neutral-950">
          Not a catalog. A case for each capability.
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
              <p className="mt-2 text-sm text-neutral-600">
                {mod.businessValue ??
                  mod.why[0] ??
                  "Recommended based on discovery evidence."}
              </p>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-neutral-500">
                {mod.expectedRoi ? (
                  <span>
                    Expected impact{" "}
                    <span className="font-medium text-neutral-900">
                      {mod.expectedRoi}
                    </span>
                  </span>
                ) : null}
                {mod.priority ? (
                  <span>
                    Priority{" "}
                    <span className="font-medium text-neutral-900">
                      {mod.priority}
                    </span>
                  </span>
                ) : null}
                <span>
                  {recommendationStrength(mod.confidence)}
                </span>
              </div>
              <ExecutiveDetail
                className="mt-2"
                labelExpand="Why this capability"
                labelCollapse="Hide rationale"
              >
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-400">
                  Rationale
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
                <p className="mt-3 text-xs text-neutral-400">
                  {strengthHint(mod.confidence)}
                </p>
              </ExecutiveDetail>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
