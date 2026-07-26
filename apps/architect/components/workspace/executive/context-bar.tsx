"use client";

import { Building2, Compass, Target } from "lucide-react";
import { understandingLevel } from "@/lib/presentation";

/**
 * Persistent context strip — always visible while working inside a
 * workspace. Answers "where am I / how far along / what matters next"
 * without requiring a tab switch. Presentation-only; every value is passed
 * in from data the workspace already computed (no new scores).
 */
export function ContextBar({
  companyName,
  stageLabel,
  understanding,
  nextGoal,
}: {
  companyName: string;
  stageLabel: string;
  understanding: number;
  nextGoal: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(understanding)));

  return (
    <div className="sticky top-0 z-40 -mx-6 flex h-11 items-center gap-4 overflow-x-auto border-b border-neutral-200/80 bg-neutral-950 px-6 text-[11px] text-neutral-300 [-ms-overflow-style:none] [scrollbar-width:none] sm:-mx-10 sm:px-10 [&::-webkit-scrollbar]:hidden">
      <span className="inline-flex shrink-0 items-center gap-1.5 font-medium text-white">
        <Building2 className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
        {companyName}
      </span>
      <span className="h-3 w-px shrink-0 bg-neutral-700" aria-hidden />
      <span className="inline-flex shrink-0 items-center gap-1.5">
        <Compass className="h-3.5 w-3.5 text-neutral-500" aria-hidden />
        <span className="uppercase tracking-[0.14em] text-neutral-500">
          Etapa
        </span>
        <span className="text-neutral-200">{stageLabel}</span>
      </span>
      <span className="h-3 w-px shrink-0 bg-neutral-700" aria-hidden />
      <span className="inline-flex shrink-0 items-center gap-1.5">
        <span className="uppercase tracking-[0.14em] text-neutral-500">
          Comprensión
        </span>
        <span className="text-neutral-200">
          {pct}% · {understandingLevel(pct).toLowerCase()}
        </span>
      </span>
      <span className="h-3 w-px shrink-0 bg-neutral-700" aria-hidden />
      <span className="inline-flex min-w-0 shrink-0 items-center gap-1.5">
        <Target className="h-3.5 w-3.5 text-neutral-500" aria-hidden />
        <span className="uppercase tracking-[0.14em] text-neutral-500">
          Siguiente
        </span>
        <span className="max-w-[36ch] truncate text-neutral-200">
          {nextGoal}
        </span>
      </span>
    </div>
  );
}
