"use client";

import { Lightbulb } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TypingIndicator } from "@/components/shared/typing-indicator";
import { EvidenceChips } from "@/components/discovery/guided/evidence-chips";
import { AdaptiveFollowUpNote } from "@/components/discovery/guided/adaptive-followup-note";
import type { RetrievalPack } from "@/lib/ai/retrieval";
import type { AdaptiveFollowUp } from "@/lib/discovery/adaptive-followup";
import type { Interview, Question } from "@/types";

/**
 * `question.helpText` already exists on the engine's Question shape
 * (built in domain/interview-engine.ts / lib/reasoning/planner from the
 * candidate's `reason` + `expectedLearning` + `businessValue`, joined by
 * " · "). It was previously computed but never rendered — this only
 * displays it, it invents nothing.
 */
function helpTextLines(question: Question): string[] {
  if (!question.helpText) return [];
  return question.helpText
    .split(" · ")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function AnsweringPanel({
  interview,
  draft,
  onDraftChange,
  thinking,
  isPending,
  onRespond,
  retrievalPack,
  adaptiveFollowUp,
}: {
  interview: Interview;
  draft: string;
  onDraftChange: (value: string) => void;
  thinking: boolean;
  isPending: boolean;
  onRespond: (value: string) => void;
  /** Mission C — evidence behind the current question, rendered as "Basado en…" chips. */
  retrievalPack?: RetrievalPack | null;
  /** Mission D — the one adaptive follow-up sentence grounded in that same pack. */
  adaptiveFollowUp?: AdaptiveFollowUp | null;
}) {
  const question = interview.conversation.currentQuestion;
  const latestArchitect = [...interview.conversation.turns]
    .reverse()
    .find((turn) => turn.role === "architect");

  return (
    <div>
      <AnimatePresence mode="wait">
        <motion.div
          key={latestArchitect?.id ?? "empty"}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <Card className="px-7 py-8 sm:px-10 sm:py-10">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/80">
              Arquitecto
            </p>
            <div className="prose-architect mt-5 text-lg leading-relaxed text-[var(--isalwa-kiln)] sm:text-xl">
              {latestArchitect?.content}
            </div>
            {thinking || isPending || interview.phase === "synthesizing" ? (
              <div className="mt-8 flex items-center gap-3 text-sm text-[var(--isalwa-slate)]/80">
                <TypingIndicator />
                <span>Actualizando la comprensión…</span>
              </div>
            ) : null}
          </Card>
        </motion.div>
      </AnimatePresence>

      {!thinking && question ? (
        <motion.div
          key={question.id}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
          className="mt-8"
        >
          <AdaptiveFollowUpNote followUp={adaptiveFollowUp} />
          <EvidenceChips pack={retrievalPack} />

          {helpTextLines(question).length > 0 ? (
            <div className="mb-5 flex gap-3 rounded-2xl bg-[var(--isalwa-tint-blue)]/70 px-4 py-3.5 ring-1 ring-[var(--isalwa-tint-blue-border)]">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[var(--isalwa-tint-blue-ink)]" aria-hidden />
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--isalwa-tint-blue-ink)]">
                  Por qué preguntamos esto
                </p>
                <ul className="mt-1.5 space-y-1">
                  {helpTextLines(question).map((line) => (
                    <li key={line} className="text-sm leading-relaxed text-[var(--isalwa-slate)]">
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}

          {question.kind === "choice" || question.kind === "confirmation" ? (
            <div className="flex flex-wrap gap-3">
              {question.choices?.map((choice) => (
                <Button
                  key={choice.id}
                  variant={choice.value === "yes" ? "default" : "secondary"}
                  size="lg"
                  onClick={() => onRespond(choice.value)}
                >
                  {choice.label}
                </Button>
              ))}
            </div>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                onRespond(draft);
              }}
            >
              {question.kind === "long_text" ? (
                <textarea
                  value={draft}
                  onChange={(event) => onDraftChange(event.target.value)}
                  placeholder={
                    question.placeholder ?? "Cuéntenos cómo es en la práctica…"
                  }
                  rows={5}
                  className="w-full resize-none rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-white px-5 py-4 text-base leading-relaxed text-[var(--isalwa-kiln)] shadow-[0_8px_30px_rgba(0,0,0,0.03)] outline-none transition focus:border-[var(--isalwa-glaze)]"
                />
              ) : (
                <input
                  value={draft}
                  onChange={(event) => onDraftChange(event.target.value)}
                  placeholder={question.placeholder ?? "Su respuesta"}
                  className="w-full rounded-full border border-[var(--isalwa-mist)] bg-white px-5 py-4 text-base text-[var(--isalwa-kiln)] shadow-[0_8px_30px_rgba(0,0,0,0.03)] outline-none transition focus:border-[var(--isalwa-glaze)]"
                />
              )}
              <Button type="submit" size="lg" disabled={!draft.trim()}>
                Continuar
              </Button>
            </form>
          )}
        </motion.div>
      ) : null}
    </div>
  );
}
