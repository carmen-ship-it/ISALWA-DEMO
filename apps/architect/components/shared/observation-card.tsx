"use client";

import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import type { Observation } from "@/types";
import { cn } from "@/lib/utils";

const severityStyles: Record<Observation["severity"], string> = {
  info: "border-l-[var(--isalwa-slate)]/40",
  notable: "border-l-[var(--isalwa-slate)]",
  critical: "border-l-[var(--isalwa-kiln)]",
};

export function ObservationCard({
  observation,
  index = 0,
}: {
  observation: Observation;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.06, ease: "easeOut" }}
    >
      <Card
        className={cn(
          "border-l-4 px-5 py-4",
          severityStyles[observation.severity],
        )}
      >
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/80">
          Observación
        </p>
        <h3 className="mt-2 text-base font-medium text-[var(--isalwa-kiln)]">
          {observation.title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--isalwa-slate)]">
          {observation.body}
        </p>
        {observation.evidence.length > 0 ? (
          <p className="mt-3 text-xs leading-relaxed text-[var(--isalwa-slate)]/60">
            Evidencia: “{observation.evidence[0]}”
          </p>
        ) : null}
        {observation.risk ? (
          <div className="mt-4 rounded-2xl bg-[var(--isalwa-porcelain)] px-3 py-2">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--isalwa-slate)]/80">
              Riesgo
            </p>
            <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{observation.risk}</p>
          </div>
        ) : null}
        {observation.recommendation ? (
          <div className="mt-2 rounded-2xl bg-[var(--isalwa-porcelain)] px-3 py-2">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--isalwa-slate)]/80">
              Recomendación
            </p>
            <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
              {observation.recommendation}
            </p>
          </div>
        ) : null}
      </Card>
    </motion.div>
  );
}
