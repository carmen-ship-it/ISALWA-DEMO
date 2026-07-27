export { evaluateMaturity, emptyMaturity } from "./maturity";
export { evaluateRisks } from "./risk";
export { evaluateContradictions } from "./contradictions";
export { evaluateOpportunities } from "./opportunities";
export { evaluatePatterns } from "./patterns";
export { evaluateRecommendations } from "./recommendations";
export { evaluateConsultingConfidence } from "./confidence";
export { evaluateHealth, emptyHealth } from "./health";
export {
  syncConsultingWhiteboard,
  emptyConsultingWhiteboardFields,
} from "./whiteboard";
export {
  evaluateConsultingIntelligence,
  emptyConsultingIntelligence,
} from "./evaluate";

/** HOTFIX — presentation-boundary copy normalization, see normalize.ts. */
export {
  normalizeConsultingRisk,
  normalizeConsultingOpportunity,
  normalizeConsultingIntelligence,
  normalizeProcessBottleneck,
  normalizeBusinessProcesses,
  normalizeImplementationPhase,
  normalizeSolutionArchitecture,
} from "./normalize";

/** Mission 10 — senior consultant question reasoning (no LLM). */
export {
  selectNextConsultantQuestion,
  prioritizeQuestions,
  pickHighestValueQuestion,
  generateConsequenceQuestions,
  detectInformalTools,
  selectTopicFocus,
  estimateConfidenceGain,
  FULL_CONSULTANT_LIBRARY,
} from "./questions";
export type {
  LibraryQuestion,
  PrioritizedQuestion,
  QuestionIntent,
  ThinkingMode,
  TopicSelection,
  ConfidenceGainEstimate,
  InformalTool,
} from "./questions";
