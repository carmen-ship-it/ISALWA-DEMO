"use client";

import { MessageCircleQuestionMark } from "lucide-react";
import type { AdaptiveFollowUp } from "@/lib/discovery/adaptive-followup";

/**
 * Mission D — the one adaptive follow-up sentence, sitting in the exact spot
 * `EvidenceChips` (Mission C) already occupies in the guided interview. Same
 * rule as every other evidence surface in this panel: render nothing rather
 * than a generic filler sentence when there is no real evidence to cite.
 */
export function AdaptiveFollowUpNote({
  followUp,
}: {
  followUp: AdaptiveFollowUp | null | undefined;
}) {
  if (!followUp) return null;

  return (
    <div className="mb-4 flex gap-3 rounded-2xl bg-[var(--isalwa-tint-teal)]/70 px-4 py-3.5 ring-1 ring-[var(--isalwa-tint-teal-border)]">
      <MessageCircleQuestionMark
        className="mt-0.5 h-4 w-4 shrink-0 text-[var(--isalwa-tint-teal-ink)]"
        aria-hidden
      />
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--isalwa-tint-teal-ink)]">
          Seguimiento adaptativo
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--isalwa-slate)]">
          {followUp.citation}
        </p>
      </div>
    </div>
  );
}
