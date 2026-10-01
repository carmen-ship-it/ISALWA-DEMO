"use client";

import type { PlanificacionGovernanceStatus } from "@/types";
import { GOVERNANCE_STATUS_LABELS } from "@/lib/planificacion/content";
import { cn } from "@/lib/utils";

const TONE: Record<PlanificacionGovernanceStatus, string> = {
  propuesta: "bg-[var(--isalwa-mist)]/60 text-[var(--isalwa-slate)]",
  requiere_confirmacion:
    "bg-[var(--isalwa-tint-amber)]/70 text-[var(--isalwa-tint-amber-ink)]",
  decision_isalwa:
    "bg-[var(--isalwa-tint-amber)]/50 text-[var(--isalwa-tint-amber-ink)]",
  en_revision: "bg-[var(--isalwa-glaze)]/15 text-[var(--isalwa-kiln)]",
  aprobado: "bg-[var(--isalwa-tint-green)]/50 text-[var(--isalwa-kiln)]",
  rechazado: "bg-[var(--isalwa-tint-red)]/40 text-[var(--isalwa-danger)]",
};

export function PlanificacionGovernanceBadge({
  status,
}: {
  status: PlanificacionGovernanceStatus;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em]",
        TONE[status],
      )}
    >
      {GOVERNANCE_STATUS_LABELS[status]}
    </span>
  );
}
