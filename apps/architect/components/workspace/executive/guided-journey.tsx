"use client";

import { Check } from "lucide-react";
import { motion } from "motion/react";
import type { WorkspaceTabId } from "@/components/workspace/workspace-tabs";
import { cn } from "@/lib/utils";

export interface GuidedJourneyStage {
  id: string;
  label: string;
  detail: string;
  complete: boolean;
  /** Tab this stage lives in — click to jump there. */
  tab: WorkspaceTabId;
}

/**
 * The five-stage consulting journey, always in the same order:
 * understand → identify opportunities → design future model → recommend
 * software → implementation roadmap. Presentation only — completion flags
 * come from data the workspace already derived (lib/executive).
 */
export function GuidedJourney({
  stages,
  activeTab,
  onSelectStage,
}: {
  stages: GuidedJourneyStage[];
  activeTab: WorkspaceTabId;
  onSelectStage: (tab: WorkspaceTabId) => void;
}) {
  const activeStageIndex = stages.findIndex((s) => s.tab === activeTab);
  const firstIncomplete = stages.findIndex((s) => !s.complete);
  const highlightIndex =
    activeStageIndex >= 0
      ? activeStageIndex
      : firstIncomplete >= 0
        ? firstIncomplete
        : stages.length - 1;

  return (
    <ol className="grid gap-3 sm:grid-cols-5">
      {stages.map((stage, index) => {
        const isCurrent = index === highlightIndex;
        return (
          <li key={stage.id}>
            <motion.button
              type="button"
              onClick={() => onSelectStage(stage.tab)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.35 }}
              aria-current={isCurrent ? "step" : undefined}
              className={cn(
                "isalwa-t-fast flex h-full w-full flex-col gap-2 rounded-[var(--isalwa-radius-panel)] border px-4 py-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--isalwa-glaze)]/45 focus-visible:ring-offset-2",
                isCurrent
                  ? "border-[var(--isalwa-kiln)] bg-[var(--isalwa-kiln)] text-white shadow-[var(--isalwa-shadow-resting)]"
                  : stage.complete
                    ? "isalwa-surface-green text-[var(--isalwa-kiln)] hover:border-[var(--isalwa-tint-green-ink)]/40"
                    : "border-[var(--isalwa-mist)] bg-white/60 text-[var(--isalwa-slate)]/80 hover:border-[var(--isalwa-slate)]/40",
              )}
            >
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-medium",
                    isCurrent
                      ? "bg-white text-[var(--isalwa-kiln)]"
                      : stage.complete
                        ? "bg-[var(--isalwa-success)] text-white"
                        : "border border-[var(--isalwa-mist)] text-[var(--isalwa-slate)]/60",
                  )}
                  aria-hidden
                >
                  {stage.complete && !isCurrent ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-medium uppercase tracking-[0.14em]",
                    isCurrent ? "text-white/55" : "text-[var(--isalwa-slate)]/60",
                  )}
                >
                  Paso {index + 1} de {stages.length}
                </span>
              </span>
              <span className="text-sm font-medium leading-snug">
                {stage.label}
              </span>
              <span
                className={cn(
                  "text-xs leading-relaxed",
                  isCurrent ? "text-white/70" : "text-[var(--isalwa-slate)]/80",
                )}
              >
                {stage.detail}
              </span>
            </motion.button>
          </li>
        );
      })}
    </ol>
  );
}
