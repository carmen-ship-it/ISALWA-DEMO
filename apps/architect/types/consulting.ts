/**
 * Consulting Intelligence — Mission 5 domain contracts.
 * Deterministic senior-consultant evaluation. No LLM.
 */

export type MaturityDimension =
  | "sales"
  | "operations"
  | "finance"
  | "technology"
  | "leadership"
  | "documentation"
  | "automation"
  | "data"
  | "customer"
  | "people";

export type HealthDimension =
  | "commercial"
  | "operations"
  | "technology"
  | "people"
  | "processes"
  | "data"
  | "ai_readiness"
  | "execution";

export type ConsultingRiskPatternId =
  | "single_employee_owns_everything"
  | "excel_dependency"
  | "whatsapp_dependency"
  | "paper_forms"
  | "no_backups"
  | "manual_approvals"
  | "tribal_knowledge"
  | "no_documentation"
  | "duplicate_work"
  | "no_audit_trail"
  | "customer_concentration"
  | "supplier_concentration"
  | "manual_reporting";

export type RiskSeverity = "low" | "moderate" | "high" | "critical";

export type ConsultingOpportunityHorizon =
  | "Quick Wins"
  | "30-day"
  | "90-day"
  | "6-month"
  | "1-year"
  | "strategic";

export type OpportunityDifficulty = "low" | "moderate" | "high";

export interface ScoredDimension {
  id: MaturityDimension | HealthDimension;
  label: string;
  score: number;
  confidence: number;
  evidence: string[];
}

export interface MaturityModel {
  dimensions: ScoredDimension[];
  overall: number;
  confidence: number;
}

export interface ConsultingRisk {
  id: string;
  patternId: ConsultingRiskPatternId;
  title: string;
  severity: RiskSeverity;
  confidence: number;
  businessImpact: string;
  recommendedMitigation: string;
  evidence: string[];
}

export interface PotentialContradiction {
  id: string;
  /** Soft wording — never accusatory. */
  statement: string;
  claimA: string;
  claimB: string;
  confidence: number;
  evidence: string[];
}

export interface ConsultingOpportunity {
  id: string;
  title: string;
  horizon: ConsultingOpportunityHorizon;
  estimatedImpact: string;
  difficulty: OpportunityDifficulty;
  dependencies: string[];
  departmentsAffected: string[];
  evidence: string[];
  confidence: number;
}

export interface BusinessHealthModel {
  gauges: ScoredDimension[];
  overall: number;
  confidence: number;
}

export interface ConsultingPattern {
  id: string;
  label: string;
  description: string;
  confidence: number;
  evidence: string[];
}

export interface ConsultingRecommendation {
  id: string;
  title: string;
  rationale: string;
  priority: "now" | "next" | "later";
  relatedRiskIds: string[];
  relatedOpportunityIds: string[];
  evidence: string[];
}

export interface ConsultingConfidence {
  overall: number;
  maturityConfidence: number;
  riskConfidence: number;
  opportunityConfidence: number;
  evidenceDensity: number;
  notes: string[];
}

/** Continuously updated consulting evaluation attached to ConversationMemory. */
export interface ConsultingIntelligence {
  maturity: MaturityModel;
  health: BusinessHealthModel;
  risks: ConsultingRisk[];
  contradictions: PotentialContradiction[];
  opportunities: ConsultingOpportunity[];
  patterns: ConsultingPattern[];
  recommendations: ConsultingRecommendation[];
  confidence: ConsultingConfidence;
  updatedAt: string;
}
