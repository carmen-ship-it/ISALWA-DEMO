/**
 * Consultant Readiness Engine — the platform brain.
 *
 * Not a chatbot and not an assistant: a single intelligence layer that answers
 * one question everywhere it is asked — *does ISALWA know enough to advise
 * this company with confidence?* — and, when the answer is no, says exactly
 * what is missing in the words a consultant would use.
 *
 * The engine owns the uncertainty; the client only ever sees guidance. No
 * confidence figures, no bands from the model, no AI vocabulary leaves this
 * module.
 *
 *   snapshot.ts  every evidence source normalized at one boundary
 *   evaluate.ts  topic states 🟢 / 🟡 / 🔴 + narrative + ask-vs-stop
 *   planner.ts   readiness filters for the adaptive interview
 *   gate.ts      blueprint gate + recommendation evidence transparency
 *   memory.ts    imported evidence contributed back into working memory
 *
 * Full write-up: `CONSULTANT_READINESS_ENGINE.md`.
 */

export {
  buildEvidenceSnapshot,
  snapshotFromMemory,
  snapshotFromWorkspace,
  type EvidenceSnapshotInput,
} from "./snapshot";

export { assessReadiness, evaluateReadiness } from "./evaluate";

export {
  assessMemoryReadiness,
  filterQuestionsByReadiness,
  pickTopicReadiness,
  topicInterviewAction,
  type ReadinessFilterCandidate,
} from "./planner";

export {
  blueprintReadinessGate,
  recommendationEvidenceBasis,
  type RecommendationEvidenceInput,
} from "./gate";

export { applyReadinessToMemory } from "./memory";

export {
  MINUTES_PER_CLARIFICATION,
  consistencyLabel,
  missingInformationLabel,
  readinessStateLabel,
} from "./topics";

export type {
  EvidenceInventory,
  EvidenceSignal,
  EvidenceSnapshot,
  EvidenceSourceKind,
  ReadinessAdvice,
  ReadinessAssessment,
  ReadinessConflict,
  ReadinessConsistency,
  ReadinessGate,
  ReadinessInterviewAction,
  ReadinessLearningItem,
  ReadinessSignal,
  ReadinessState,
  ReadinessTopicId,
  RecommendationEvidenceBasis,
  TopicReadiness,
} from "./types";
