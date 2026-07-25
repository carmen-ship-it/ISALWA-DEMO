"use client";

import { motion } from "motion/react";
import type { JourneyStage } from "@/lib/executive";

export function DiscoveryJourney({
  dayLabel,
  stages,
}: {
  dayLabel: string;
  stages: JourneyStage[];
}) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
        {dayLabel}
      </p>
      <ol className="mt-6 space-y-0">
        {stages.map((stage, index) => (
          <li key={stage.id}>
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08, duration: 0.35 }}
              className="flex gap-4"
            >
              <div className="flex w-6 flex-col items-center">
                <span
                  className={`mt-1.5 h-2.5 w-2.5 rounded-full ${
                    stage.complete
                      ? "bg-neutral-950"
                      : "border border-neutral-300 bg-white"
                  }`}
                />
                {index < stages.length - 1 ? (
                  <span className="my-1 w-px flex-1 bg-neutral-200" />
                ) : null}
              </div>
              <div className={index < stages.length - 1 ? "pb-7" : ""}>
                <p
                  className={`text-base ${
                    stage.complete ? "text-neutral-950" : "text-neutral-400"
                  }`}
                >
                  {stage.label}
                </p>
                <p className="mt-1 text-sm text-neutral-500">{stage.detail}</p>
                {index < stages.length - 1 ? (
                  <p className="mt-3 text-neutral-300">↓</p>
                ) : null}
              </div>
            </motion.div>
          </li>
        ))}
      </ol>
    </div>
  );
}
