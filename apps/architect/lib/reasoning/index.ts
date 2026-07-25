export { think, createEmptyMemory } from "./think";
export type { ThoughtResult } from "./think";
export { absorbAnswerIntoMemory } from "./memory/absorb";
export { computeDiscoveryScore, CONCLUSION_THRESHOLD } from "./confidence/score";
export { planNextQuestion, formatThinkingPreamble } from "./planner/next-question";
export { generateInsights } from "./observations/insights";
export { generateOpportunities, impactLabel } from "./recommendations/opportunities";
export { detectIndustry, industryLabel } from "./industry/detect";
export {
  detectSignals,
  extractTools,
  mergeSignals,
} from "./industry/signals";

/**
 * Mission 3 seam — reasoning consumes Conversation + Knowledge + Memory.
 * Knowledge is merged into ConversationMemory before turns via
 * `mergeKnowledgeIntoMemory` (lib/knowledge). think() itself is unchanged.
 */
export type { KnowledgeReasoningContext } from "@/types";

/**
 * Mission 5 — consulting intelligence lives in lib/consulting.
 * think() calls evaluateConsultingIntelligence after each absorb.
 */
export type { ConsultingIntelligence } from "@/types";
