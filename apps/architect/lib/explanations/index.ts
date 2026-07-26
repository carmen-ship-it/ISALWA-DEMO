/**
 * Mission 14 — Explain Every Recommendation.
 * Deterministic justification layer. No LLM. Spanish executive copy for UI.
 */

export {
  explainRecommendation,
  explainConsultingRecommendation,
  explainWorkspaceRecommendation,
  explainSolutionModule,
  explainWorkspaceRecommendations,
  explainSolutionModules,
} from "./recommendation";

export {
  collectRecommendationEvidence,
  evidenceQuotes,
} from "./evidence";

export {
  roiFromConsulting,
  roiFromModuleIndex,
  roiFromWorkspaceRecommendation,
  roiSummaryEs,
  priorityLabelEs,
  roiBandLabelEs,
} from "./roi";

export {
  buildExplanationConfidence,
  confidenceBand,
  confidenceBandLabelEs,
  confidenceSummaryEs,
} from "./confidence";

export {
  problemFromContext,
  observedPatternFromContext,
  businessConsequenceFromContext,
  businessValueFromContext,
  recommendationStatement,
  supportingFactsFromWorkspace,
  futureDependenciesFromContext,
} from "./business-value";

export type {
  ConfidenceBand,
  ExpectedRoi,
  ExplainedPriority,
  ExplainedRecommendation,
  ExplanationConfidence,
  ExplanationEvidenceItem,
  ExplanationEvidenceSource,
  RoiBand,
} from "./types";
