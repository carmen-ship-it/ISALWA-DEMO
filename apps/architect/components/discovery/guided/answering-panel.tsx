"use client";

import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TypingIndicator } from "@/components/shared/typing-indicator";
import type { Interview } from "@/types";

export function AnsweringPanel({
  interview,
  draft,
  onDraftChange,
  thinking,
  isPending,
  onRespond,
}: {
  interview: Interview;
  draft: string;
  onDraftChange: (value: string) => void;
  thinking: boolean;
  isPending: boolean;
  onRespond: (value: string) => void;
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
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
              Arquitecto
            </p>
            <div className="prose-architect mt-5 text-lg leading-relaxed text-neutral-900 sm:text-xl">
              {latestArchitect?.content}
            </div>
            {thinking || isPending || interview.phase === "synthesizing" ? (
              <div className="mt-8 flex items-center gap-3 text-sm text-neutral-500">
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
                  className="w-full resize-none rounded-3xl border border-neutral-200 bg-white px-5 py-4 text-base leading-relaxed text-neutral-900 shadow-[0_8px_30px_rgba(0,0,0,0.03)] outline-none transition focus:border-neutral-400"
                />
              ) : (
                <input
                  value={draft}
                  onChange={(event) => onDraftChange(event.target.value)}
                  placeholder={question.placeholder ?? "Su respuesta"}
                  className="w-full rounded-full border border-neutral-200 bg-white px-5 py-4 text-base text-neutral-900 shadow-[0_8px_30px_rgba(0,0,0,0.03)] outline-none transition focus:border-neutral-400"
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
