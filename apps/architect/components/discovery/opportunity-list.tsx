"use client";

import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import type { Opportunity, OpportunityImpact } from "@/types";

function impactLabel(impact: OpportunityImpact): string {
  switch (impact) {
    case "quick_win":
      return "Victoria rápida";
    case "medium":
      return "Impacto medio";
    case "high":
      return "Impacto alto";
    case "strategic":
      return "Estratégico";
  }
}

export function OpportunityList({
  opportunities,
}: {
  opportunities: Opportunity[];
}) {
  if (opportunities.length === 0) {
    return (
      <Card className="px-5 py-5 text-sm text-[var(--isalwa-slate)]/80">
        Las oportunidades aparecen a medida que los patrones se aclaran.
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {opportunities.map((opportunity, index) => (
        <motion.div
          key={opportunity.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: index * 0.05 }}
        >
          <Card className="px-5 py-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--isalwa-slate)]/80">
              {impactLabel(opportunity.impact)}
            </p>
            <h3 className="mt-2 text-sm font-medium text-[var(--isalwa-kiln)]">
              {opportunity.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--isalwa-slate)]">
              {opportunity.description}
            </p>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
