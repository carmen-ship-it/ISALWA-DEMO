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
                  ? "bg-neutral-950 text-white"
                  : isCovered
                    ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100 hover:bg-emerald-100"
                    : "bg-white text-neutral-500 ring-1 ring-neutral-200 hover:bg-neutral-50 hover:text-neutral-800",
              )}
            >
              <span
                className={cn(
                  "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-medium",
                  isCurrent
                    ? "bg-white/15 text-white"
                    : isCovered
                      ? "bg-emerald-600 text-white"
                      : "border border-neutral-300 text-neutral-400",
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
