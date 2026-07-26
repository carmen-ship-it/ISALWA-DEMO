"use client";

import { Check } from "lucide-react";
import {
  GUIDED_STAGES,
  GUIDED_STAGE_ORDER,
  type GuidedStageId,
  type StageCompletion,
} from "@/lib/discovery/stages";
import { cn } from "@/lib/utils";

export function StageStepper({
  currentStageId,
  completion,
  onSelect,
}: {
  currentStageId: GuidedStageId;
  completion: Record<GuidedStageId, StageCompletion>;
  onSelect: (stageId: GuidedStageId) => void;
}) {
  return (
    <ol
      className="flex snap-x gap-2 overflow-x-auto pb-1"
      aria-label="Etapas de la evaluación guiada"
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
                "flex items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-2 text-sm transition-colors",
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
  );
}
