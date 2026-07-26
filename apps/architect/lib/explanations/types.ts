/**
 * Mission 14 — Explained recommendations.
 * Deterministic justification layer over existing evidence. No LLM.
 */

export type ExplanationEvidenceSource =
  | "consulting"
  | "risk"
  | "opportunity"
  | "pattern"
  | "blueprint"
  | "solution"
  | "process"
  | "pain"
  | "fact"
  | "meeting"
  | "knowledge"
  | "recommendation";

export interface ExplanationEvidenceItem {
  source: ExplanationEvidenceSource;
  id?: string;
  label: string;
  quote?: string;
}

export type RoiBand = "alto" | "moderado" | "estratégico" | "emergente";

export type ConfidenceBand = "alta" | "media" | "baja" | "emergente";

export type ExplainedPriority = "now" | "next" | "later";

export interface ExpectedRoi {
  band: RoiBand;
  summary: string;
  drivers: string[];
}

export interface ExplanationConfidence {
  /** 0–1 unit score */
  score: number;
  band: ConfidenceBand;
  summary: string;
  factors: string[];
}

/**
 * Full executive justification for a single recommendation.
 * Answers: Why? Evidence? Confidence? Business Value? ROI? Dependencies?
 */
export interface ExplainedRecommendation {
  id: string;
  title: string;
  priority: ExplainedPriority | null;
  problem: string;
  evidence: ExplanationEvidenceItem[];
  observedPattern: string;
  businessConsequence: string;
  recommendation: string;
  expectedRoi: ExpectedRoi;
  confidence: ExplanationConfidence;
  businessValue: string;
  supportingFacts: string[];
  futureDependencies: string[];
}
