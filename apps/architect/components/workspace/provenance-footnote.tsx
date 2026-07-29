"use client";

import { useTranslations } from "@/lib/i18n";
import type { ProvenanceTier } from "@/lib/presentation";
import { cn } from "@/lib/utils";

/**
 * Shared one-line provenance footnote — reused across Blueprint, Company
 * Model, Solution Architecture, Business Processes, and the Operating
 * System so every AI-derived section names its footing the same way
 * (`lib/presentation/provenance.ts`). Matches the existing footnote pattern
 * introduced for relationship provenance (`animated-blueprint.tsx`,
 * `solution-architecture-panel.tsx`): a subtle italic line, never a badge
 * on every row.
 */
export function ProvenanceFootnote({
  tier,
  className,
}: {
  tier: ProvenanceTier;
  className?: string;
}) {
  const { t } = useTranslations();
  return (
    <p className={cn("mt-3 text-xs italic text-[var(--isalwa-slate)]/60", className)}>
      {t(`provenance.footnote.${tier}`)}
    </p>
  );
}
