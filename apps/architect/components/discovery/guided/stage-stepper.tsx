"use client";

import { Check } from "lucide-react";
import { motion } from "motion/react";
import {
  GUIDED_STAGES,
  GUIDED_STAGE_ORDER,
  type GuidedStageId,
  type StageCompletion,
} from "@/lib/discovery/stages";
import { cn } from "@/lib/utils";

/** Meta stage — never counts toward "how far along" progress. */
const PROGRESS_STAGES = GUIDED_STAGE_ORDER.filter((id) => id !== "finish");

export function StageStepper({
  currentStageId,
  completion,
  onSelect,
}: {
  currentStageId: GuidedStageId;
  completion: Record<GuidedStageId, StageCompletion>;
  onSelect: (stageId: GuidedStageId) => void;
}) {
  const coveredCount = PROGRESS_STAGES.filter((id) => completion[id]?.covered).length;
  const progressPct = Math.round((coveredCount / PROGRESS_STAGES.length) * 100);

  return (
    <div>
      <ol
        className="flex snap-x gap-2 overflow-x-auto pb-1"
        aria-label="Etapas del descubrimiento guiado"
      >
        {GUIDED_STAGE_ORDER.map((stageId, index) => {
          const stage = GUIDED_STAGES[stageId];
          const isCurrent = stageId === currentStageId;
          const isCovered = completion[stageId]?.covered ?? false;

          return (
            <li key={stageId} className="snap-start">
              <button
                type="button"
                onClick={() => onSelect(stageId)}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  // Mission 19 — slightly taller touch target (py-2.5) so
                  // every stage chip clears a comfortable ~44px tap area on
                  // mobile, without changing the chip's compact desktop feel.
                  "flex items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-2.5 text-sm transition-colors",
                  isCurrent
                    ? "bg-[var(--isalwa-kiln)] text-white"
                    : isCovered
                      ? "bg-[var(--isalwa-tint-green)] text-[var(--isalwa-tint-green-ink)] ring-1 ring-[var(--isalwa-tint-green-border)] hover:bg-[var(--isalwa-tint-green-border)]"
                      : "bg-white text-[var(--isalwa-slate)]/80 ring-1 ring-[var(--isalwa-mist)] hover:bg-[var(--isalwa-porcelain)] hover:text-[var(--isalwa-slate)]",
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-medium",
                    isCurrent
                      ? "bg-white/15 text-white"
                      : isCovered
                        ? "bg-[var(--isalwa-success)] text-white"
                        : "border border-[var(--isalwa-mist)] text-[var(--isalwa-slate)]/60",
                  )}
                  aria-hidden
                >
                  {isCovered && !isCurrent ? <Check className="h-3 w-3" /> : index + 1}
                </span>
                {stage.shortLabel}
              </button>
            </li>
          );
        })}
      </ol>

      {/*
        Mission 19 — calm aggregate progress, the same glaze→kiln gradient
        fill and easing `WorkspaceTabs`/`Progress` already use, so "how far
        along is this evaluation" reads as one continuous motion instead of
        only inferred from which chips have turned green.
      */}
      <div className="isalwa-risk-bar mt-3 !h-1">
        <motion.span
          className="!rounded-full bg-[linear-gradient(90deg,var(--isalwa-glaze)_0%,var(--isalwa-kiln)_100%)]"
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(4, progressPct)}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
      <p className="mt-1.5 text-[11px] text-[var(--isalwa-slate)]/60">
        {coveredCount} de {PROGRESS_STAGES.length} etapas cubiertas
      </p>
    </div>
  );
}
