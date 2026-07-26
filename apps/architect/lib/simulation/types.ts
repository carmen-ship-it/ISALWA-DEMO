/**
 * Executive Simulator — Mission 17 contracts.
 * Deterministic what-if rules. No AI. No forecasting / ML.
 */

import type { CompanyWorkspace } from "@/types";

/** Built-in executive “what if…” scenarios. */
export type ScenarioId =
  | "hire_salespeople"
  | "automate_approvals"
  | "open_warehouse"
  | "add_crm"
  | "increase_production"
  | "reduce_staff"
  | "new_region";

export type SimulationDomain =
  | "capacity"
  | "staffing"
  | "sales"
  | "operations"
  | "inventory"
  | "automation"
  | "financial";

export type InvestmentBand = "low" | "moderate" | "high" | "very_high";

export type TimelineBand =
  | "2_weeks"
  | "30_days"
  | "90_days"
  | "6_months"
  | "12_months";

export type ConfidenceBand = "low" | "moderate" | "high";

export interface Scenario {
  id: ScenarioId;
  /** User-facing Spanish label. */
  name: string;
  /** Short Spanish prompt-style description. */
  description: string;
  /** Domains whose rules contribute to this scenario. */
  domains: readonly SimulationDomain[];
}

export interface SimulationInvestment {
  band: InvestmentBand;
  /** Human-readable Spanish summary (heuristic, not a quote). */
  summary: string;
  /** Optional relative scale 1–5 for UI bars. */
  scale: 1 | 2 | 3 | 4 | 5;
}

export interface SimulationTimeline {
  band: TimelineBand;
  /** Human-readable Spanish summary. */
  summary: string;
  /** Rough calendar weeks (deterministic heuristic). */
  weeks: number;
}

export interface SimulationConfidence {
  band: ConfidenceBand;
  /** 0–1 composite from base scenario + workspace signal coverage. */
  score: number;
  rationale: string;
}

export interface SimulationResult {
  scenarioId: ScenarioId;
  scenarioName: string;
  description: string;
  likelyImpact: string[];
  risks: string[];
  dependencies: string[];
  investment: SimulationInvestment;
  timeline: SimulationTimeline;
  confidence: SimulationConfidence;
  /** Which optional workspace signals influenced the result. */
  signalsUsed: string[];
  /** Domains that contributed rules. */
  domainsApplied: SimulationDomain[];
  generatedAt: string;
}

/**
 * Optional thin signals derived from a workspace.
 * Domain modules read this — not raw engines.
 */
export interface SimulationSignals {
  companyName: string | null;
  industry: string | null;
  understanding: number;
  departments: string[];
  currentSoftware: string[];
  companySizeBand: "unknown" | "small" | "medium" | "large";
  teamHint: string | null;
  geographyHint: string | null;
  hasCrm: boolean;
  hasErp: boolean;
  hasWhatsappDependency: boolean;
  hasExcelDependency: boolean;
  hasManualApprovals: boolean;
  consultingRiskIds: string[];
  painPointLabels: string[];
  automationScore: number | null;
  salesMaturity: number | null;
  operationsMaturity: number | null;
  peopleMaturity: number | null;
}

/** Internal contribution from one domain rules module. */
export interface RuleContribution {
  domain: SimulationDomain;
  likelyImpact: string[];
  risks: string[];
  dependencies: string[];
  signalsUsed: string[];
  /** Adjusts composite confidence (−0.25 … +0.25). */
  confidenceDelta: number;
  investmentBand?: InvestmentBand;
  timelineBand?: TimelineBand;
}

export type DomainRuleFn = (
  scenarioId: ScenarioId,
  signals: SimulationSignals,
) => RuleContribution | null;

export type SimulateWorkspace = CompanyWorkspace | null | undefined;
