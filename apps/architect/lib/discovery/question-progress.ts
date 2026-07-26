import { MAX_ADAPTIVE_QUESTIONS } from "@/lib/reasoning";
import type { Interview } from "@/types";

/**
 * Read-only "Question N of M" estimate for the Guided Assessment top bar.
 *
 * The underlying engine (Mission 10 — senior consultant question selection)
 * is adaptive: it has no fixed question order or fixed total, it stops as
 * soon as `memory.score.readyToConclude` is true. `MAX_ADAPTIVE_QUESTIONS`
 * is the engine's own hard cap (see lib/reasoning/think.ts) — the only
 * honest upper bound that exists, so M is presented as "hasta M" (up to M),
 * never as a promise of exactly M questions.
 *
 * Returns null outside the adaptive interview phase (identity/company
 * onboarding is a fixed 4-step sequence already shown by the stage
 * stepper, not a question count worth showing here).
 */
export interface QuestionProgress {
  current: number;
  max: number;
}

export function estimateQuestionProgress(
  interview: Interview,
): QuestionProgress | null {
  if (interview.phase !== "interview") return null;
  const current = Math.min(
    interview.conversation.interviewQuestionCount + 1,
    MAX_ADAPTIVE_QUESTIONS,
  );
  return { current, max: MAX_ADAPTIVE_QUESTIONS };
}
