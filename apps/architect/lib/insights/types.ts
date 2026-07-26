/**
 * Executive Consulting Intelligence — Mission 3 domain contracts.
 * Pure derivation surface over existing engines (Memory, Knowledge, History,
 * Readiness, Blueprint, Solution, Consulting, intake evidence). No new
 * scoring engine, no LLM, no invented evidence. Every field traces back to a
 * concrete workspace fact — when there isn't one, callers render an honest
 * empty state instead of fabricating content.
 */

export type EvidenceSourceKind =
  | "known_fact"
  | "pain_point"
  | "risk"
  | "opportunity"
  | "pattern"
  | "contradiction"
  | "knowledge_asset"
  | "knowledge_rule"
  | "meeting"
  | "milestone"
  | "solution_module"
  | "blueprint"
  | "person"
  | "readiness";

export interface InsightEvidence {
  kind: EvidenceSourceKind;
  id: string;
  label: string;
  quote?: string;
}

/** 1. Business DNA */
export type BusinessDnaTraitId =
  | "decision_speed"
  | "approval_culture"
  | "documentation_culture"
  | "operational_discipline"
  | "automation_culture"
  | "growth_stage"
  | "technology_adoption";

export interface BusinessDnaTrait {
  id: BusinessDnaTraitId;
  label: string;
  observation: string;
  evidence: InsightEvidence[];
  strength: "alta" | "media" | "baja" | "emergente";
}

/** 2. Business Blind Spots */
export interface BusinessBlindSpot {
  id: string;
  title: string;
  observation: string;
  whyItMatters: string;
  evidence: InsightEvidence[];
}

/** 3. Who Should We Talk To Next */
export interface NextConversationRecommendation {
  id: string;
  personName: string | null;
  roleHint: string;
  departmentHint: string | null;
  reason: string;
  infoGainLabel: "alta" | "media" | "baja";
  evidence: InsightEvidence[];
}

/** 4. Three Things That Surprised Us */
export interface SurprisingObservation {
  id: string;
  title: string;
  narrative: string;
  evidence: InsightEvidence[];
}

/** 5. Institutional Memory */
export type InstitutionalMemoryStepId =
  | "interview"
  | "document"
  | "meeting"
  | "evidence"
  | "recommendation";

export interface InstitutionalMemoryStep {
  id: InstitutionalMemoryStepId;
  label: string;
  detail: string;
  count: number;
}

export interface InstitutionalMemoryEntry {
  id: string;
  recommendationTitle: string;
  whyWeBelieve: string[];
  evidenceQuotes: string[];
  chain: InstitutionalMemoryStep[];
}

/** 6. Business Evolution */
export interface BusinessEvolutionMoment {
  id: string;
  at: string;
  title: string;
  description: string;
  polarity: "progress" | "regression" | "neutral";
}

export interface BusinessEvolutionSummary {
  narrative: string;
  moments: BusinessEvolutionMoment[];
  understandingStart: number | null;
  understandingNow: number;
  visitCount: number;
}

/** 7. Future Readiness */
export interface FutureReadinessPrediction {
  id: string;
  struggle: string;
  why: string;
  evidence: InsightEvidence[];
  horizon: "corto plazo" | "mediano plazo" | "largo plazo";
}

/** 8. Knowledge Concentration */
export interface KnowledgeConcentrationNode {
  id: string;
  holder: string;
  kind: "person" | "department" | "system" | "sin_dueño_claro";
  knowledgeAreas: string[];
  concentrationRisk: "alta" | "media" | "baja";
  evidence: InsightEvidence[];
}

export interface KnowledgeConcentrationSummary {
  nodes: KnowledgeConcentrationNode[];
  headline: string;
}

/** 9. Business Intelligence Timeline ("We Learned" feed) */
export interface LearnedTimelineEntry {
  id: string;
  at: string;
  headline: string;
  detail: string;
  source: "meeting" | "document" | "milestone" | "recommendation";
}

/** Aggregate — one call derives the whole executive insights area. */
export interface ExecutiveInsights {
  generatedAt: string;
  businessDna: BusinessDnaTrait[];
  blindSpots: BusinessBlindSpot[];
  nextConversations: NextConversationRecommendation[];
  surprises: SurprisingObservation[];
  institutionalMemory: InstitutionalMemoryEntry[];
  businessEvolution: BusinessEvolutionSummary;
  futureReadiness: FutureReadinessPrediction[];
  knowledgeConcentration: KnowledgeConcentrationSummary;
  learnedTimeline: LearnedTimelineEntry[];
  /** True when there isn't yet enough evidence for a meaningful executive briefing. */
  isEarlyStage: boolean;
}
