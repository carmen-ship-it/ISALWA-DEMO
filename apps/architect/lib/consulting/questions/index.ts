/**
 * Mission 10 — Senior Consultant Thinking (question reasoning).
 *
 * Public API for selecting the highest-value next question from evidence.
 * Deterministic. No LLM. Extends planner — does not replace absorb/think engines.
 */

export {
  FULL_CONSULTANT_LIBRARY,
  CONSEQUENCE_LIBRARY,
  CONTRADICTION_LIBRARY,
  HYPOTHESIS_LIBRARY,
  EXECUTIVE_LIBRARY,
  OPERATIONAL_LIBRARY,
  DEPARTMENT_BALANCE_LIBRARY,
  enrichCandidate,
  libraryByKey,
} from "./question-library";
export type {
  LibraryQuestion,
  QuestionIntent,
  ThinkingMode,
} from "./question-library";

export {
  detectInformalTools,
  generateConsequenceQuestions,
  shouldSuppressSoftwareInventory,
  applyConsequenceBias,
  buildEvidenceBlob,
} from "./consequence-engine";
export type { InformalTool } from "./consequence-engine";

export {
  estimateConfidenceGain,
  rankByConfidenceGain,
} from "./confidence-engine";
export type { ConfidenceGainEstimate } from "./confidence-engine";

export {
  selectTopicFocus,
  starvedDimensions,
  inferThinkingMode,
  generateTopicQuestions,
  departmentBalanceBoost,
  thinkingModeBoost,
} from "./topic-selection";
export type { TopicSelection } from "./topic-selection";

export {
  scoreQuestion,
  prioritizeQuestions,
  pickHighestValueQuestion,
} from "./question-priority";
export type { PrioritizedQuestion } from "./question-priority";

import type { ConversationMemory, QuestionCandidate } from "@/types";
import { pickHighestValueQuestion } from "./question-priority";

/**
 * Entry point used by `planNextQuestion`.
 * Returns a QuestionCandidate with Mission 10 metadata populated.
 *
 * When to stop asking altogether stays where it already lives — the
 * conclusion threshold in `computeDiscoveryScore`. Readiness narrows *which*
 * question is worth asking, it does not move that bar.
 */
export function selectNextConsultantQuestion(
  memory: ConversationMemory,
  catalog: QuestionCandidate[] = [],
): QuestionCandidate | null {
  const picked = pickHighestValueQuestion(memory, catalog);
  if (!picked) return null;

  const {
    score: _score,
    scoreBreakdown: _breakdown,
    intent: _intent,
    thinkingMode: _mode,
    triggers: _triggers,
    ...candidate
  } = picked;

  return candidate;
}
