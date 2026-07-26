import type { ConversationMemory, DiscoveryDimension } from "@/types";
import type { LibraryQuestion } from "./question-library";

export interface ConfidenceGainEstimate {
  /** Expected lift in overall discovery confidence (0–100). */
  expectedGain: number;
  /** Dimension that benefits most. */
  dimension: DiscoveryDimension;
  /** Why this gain estimate. */
  rationale: string;
}

/**
 * Estimate how much asking a question would improve business understanding.
 * Deterministic — no LLM. Favors low-confidence applicable dimensions and
 * high library confidenceGain when the topic is still an evidence gap.
 */
export function estimateConfidenceGain(
  memory: ConversationMemory,
  question: LibraryQuestion,
): ConfidenceGainEstimate {
  const dim = memory.score.dimensions.find((d) => d.id === question.dimension);
  const dimConfidence = dim?.confidence ?? 0;
  const applicable = dim?.applicable !== false;
  const covered = dim?.covered ?? false;

  let expectedGain = question.confidenceGain;

  if (!applicable) {
    expectedGain = Math.max(2, Math.round(expectedGain * 0.35));
  } else if (!covered) {
    expectedGain += Math.round((100 - dimConfidence) / 20);
  } else if (dimConfidence < 55) {
    expectedGain += 3;
  } else if (dimConfidence > 80) {
    expectedGain = Math.max(3, Math.round(expectedGain * 0.5));
  }

  // Contradiction / consequence questions punch above catalog weight.
  if (
    question.intent === "contradiction" ||
    question.intent === "consequence"
  ) {
    expectedGain += 4;
  }

  if (question.intent === "hypothesis_validation") {
    const active = memory.hypotheses.filter((h) => h.status === "active");
    if (active.length > 0) expectedGain += 3;
  }

  // Consulting meta-confidence low → clarifying questions worth more.
  const consultingOverall = memory.consulting?.confidence?.overall ?? 0;
  if (consultingOverall > 0 && consultingOverall < 45) {
    expectedGain += 2;
  }

  expectedGain = Math.max(2, Math.min(22, expectedGain));

  return {
    expectedGain,
    dimension: question.dimension,
    rationale: !applicable
      ? "Dimensión poco aplicable — ganancia limitada."
      : !covered
        ? `Cierra vacío en ${dim?.label ?? question.dimension}.`
        : `Profundiza ${dim?.label ?? question.dimension} (confianza ${dimConfidence}%).`,
  };
}

/**
 * Highest-value unknown = largest expected confidence gain among candidates,
 * not merely the next catalog slot.
 */
export function rankByConfidenceGain(
  memory: ConversationMemory,
  questions: LibraryQuestion[],
): Array<LibraryQuestion & { confidenceEstimate: ConfidenceGainEstimate }> {
  return questions
    .map((question) => {
      const confidenceEstimate = estimateConfidenceGain(memory, question);
      return {
        ...question,
        confidenceGain: confidenceEstimate.expectedGain,
        confidenceEstimate,
      };
    })
    .sort(
      (a, b) =>
        b.confidenceEstimate.expectedGain - a.confidenceEstimate.expectedGain,
    );
}
