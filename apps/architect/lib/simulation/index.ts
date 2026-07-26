/**
 * Executive Simulator — Mission 17 public API.
 * Deterministic rules engine for “¿Qué pasa si…?” scenarios.
 * No AI. No forecasting / ML. Does not rewrite other engines.
 */

import { nowIso } from "@/lib/utils";
import { contributeAutomation } from "./automation";
import { contributeCapacity } from "./capacity";
import {
  investmentScale,
  investmentSummary,
  timelineSummary,
  timelineWeeks,
  contributeFinancial,
} from "./financial";
import { contributeInventory } from "./inventory";
import { contributeOperations } from "./operations";
import { contributeSales } from "./sales";
import { extractSimulationSignals } from "./signals";
import { contributeStaffing } from "./staffing";
import type {
  ConfidenceBand,
  DomainRuleFn,
  InvestmentBand,
  RuleContribution,
  Scenario,
  ScenarioId,
  SimulateWorkspace,
  SimulationDomain,
  SimulationResult,
  SimulationSignals,
  TimelineBand,
} from "./types";

export type {
  ConfidenceBand,
  InvestmentBand,
  Scenario,
  ScenarioId,
  SimulateWorkspace,
  SimulationConfidence,
  SimulationDomain,
  SimulationInvestment,
  SimulationResult,
  SimulationSignals,
  SimulationTimeline,
  TimelineBand,
} from "./types";

export { extractSimulationSignals, emptySignals } from "./signals";

/** Built-in scenarios — Spanish labels for executives. */
export const SCENARIOS: readonly Scenario[] = [
  {
    id: "hire_salespeople",
    name: "Contratar vendedores",
    description: "¿Qué pasa si contratamos más vendedores?",
    domains: ["staffing", "sales", "capacity", "inventory", "operations", "financial"],
  },
  {
    id: "automate_approvals",
    name: "Automatizar aprobaciones",
    description: "¿Qué pasa si automatizamos las aprobaciones?",
    domains: ["automation", "operations", "sales", "financial"],
  },
  {
    id: "open_warehouse",
    name: "Abrir almacén",
    description: "¿Qué pasa si abrimos un almacén nuevo?",
    domains: ["capacity", "inventory", "staffing", "operations", "financial"],
  },
  {
    id: "add_crm",
    name: "Agregar CRM",
    description: "¿Qué pasa si implementamos un CRM?",
    domains: ["sales", "automation", "operations", "financial"],
  },
  {
    id: "increase_production",
    name: "Aumentar producción",
    description: "¿Qué pasa si aumentamos la producción?",
    domains: ["capacity", "operations", "inventory", "staffing", "automation", "financial"],
  },
  {
    id: "reduce_staff",
    name: "Reducir personal",
    description: "¿Qué pasa si reducimos personal?",
    domains: ["staffing", "operations", "automation", "inventory", "financial"],
  },
  {
    id: "new_region",
    name: "Nueva región",
    description: "¿Qué pasa si abrimos una nueva región?",
    domains: ["sales", "capacity", "staffing", "inventory", "financial"],
  },
] as const;

const SCENARIO_BY_ID: Record<ScenarioId, Scenario> = Object.fromEntries(
  SCENARIOS.map((s) => [s.id, s]),
) as Record<ScenarioId, Scenario>;

const DOMAIN_RULES: DomainRuleFn[] = [
  contributeCapacity,
  contributeStaffing,
  contributeSales,
  contributeOperations,
  contributeInventory,
  contributeAutomation,
  contributeFinancial,
];

const BAND_RANK: Record<InvestmentBand, number> = {
  low: 1,
  moderate: 2,
  high: 3,
  very_high: 4,
};

const TIMELINE_RANK: Record<TimelineBand, number> = {
  "2_weeks": 1,
  "30_days": 2,
  "90_days": 3,
  "6_months": 4,
  "12_months": 5,
};

export function listScenarios(): readonly Scenario[] {
  return SCENARIOS;
}

export function getScenario(scenarioId: ScenarioId): Scenario | null {
  return SCENARIO_BY_ID[scenarioId] ?? null;
}

/**
 * Primary API — run a built-in scenario through the rules engine.
 * Optional workspace supplies signals that adjust (never invent) outcomes.
 */
export function simulate(
  scenarioId: ScenarioId,
  workspace?: SimulateWorkspace,
): SimulationResult {
  const scenario = SCENARIO_BY_ID[scenarioId];
  if (!scenario) {
    throw new Error(`Unknown simulation scenario: ${String(scenarioId)}`);
  }

  const signals = extractSimulationSignals(workspace ?? null);
  const contributions = DOMAIN_RULES.map((rule) => rule(scenarioId, signals)).filter(
    (c): c is RuleContribution => c != null,
  );

  const likelyImpact = uniqueStrings(contributions.flatMap((c) => c.likelyImpact));
  const risks = uniqueStrings(contributions.flatMap((c) => c.risks));
  const dependencies = uniqueStrings(contributions.flatMap((c) => c.dependencies));
  const signalsUsed = uniqueStrings(contributions.flatMap((c) => c.signalsUsed));
  const domainsApplied = uniqueDomains(contributions.map((c) => c.domain));

  const investmentBand = maxInvestment(
    contributions.map((c) => c.investmentBand).filter(Boolean) as InvestmentBand[],
  );
  const timelineBand = maxTimeline(
    contributions.map((c) => c.timelineBand).filter(Boolean) as TimelineBand[],
  );

  const confidence = buildConfidence(scenarioId, signals, contributions, signalsUsed);

  return {
    scenarioId,
    scenarioName: scenario.name,
    description: scenario.description,
    likelyImpact,
    risks,
    dependencies,
    investment: {
      band: investmentBand,
      summary: investmentSummary(investmentBand),
      scale: investmentScale(investmentBand),
    },
    timeline: {
      band: timelineBand,
      summary: timelineSummary(timelineBand),
      weeks: timelineWeeks(timelineBand),
    },
    confidence,
    signalsUsed,
    domainsApplied,
    generatedAt: nowIso(),
  };
}

/** Alias preferred by some callers / docs. */
export function runScenario(
  scenarioId: ScenarioId,
  workspace?: SimulateWorkspace,
): SimulationResult {
  return simulate(scenarioId, workspace);
}

function buildConfidence(
  scenarioId: ScenarioId,
  signals: SimulationSignals,
  contributions: RuleContribution[],
  signalsUsed: string[],
) {
  let score = 0.52;
  const delta = contributions.reduce((acc, c) => acc + c.confidenceDelta, 0);
  score += delta;

  score += signals.understanding * 0.12;
  score += Math.min(0.12, signalsUsed.length * 0.015);

  if (!signals.companyName && signals.understanding === 0 && signalsUsed.length === 0) {
    score -= 0.06;
  }

  score = clamp(score, 0.25, 0.92);

  const band: ConfidenceBand =
    score >= 0.7 ? "high" : score >= 0.5 ? "moderate" : "low";

  const rationale =
    signalsUsed.length === 0
      ? `Resultado basado en reglas del escenario «${scenarioId}» sin señales de workspace; confianza acotada.`
      : `Resultado ajustado con ${signalsUsed.length} señal(es) del workspace (reglas determinísticas, no pronóstico).`;

  return { band, score: round2(score), rationale };
}

function maxInvestment(bands: InvestmentBand[]): InvestmentBand {
  if (bands.length === 0) return "moderate";
  return bands.reduce((best, b) => (BAND_RANK[b] > BAND_RANK[best] ? b : best));
}

function maxTimeline(bands: TimelineBand[]): TimelineBand {
  if (bands.length === 0) return "90_days";
  return bands.reduce((best, b) => (TIMELINE_RANK[b] > TIMELINE_RANK[best] ? b : best));
}

function uniqueStrings(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

function uniqueDomains(items: SimulationDomain[]): SimulationDomain[] {
  return uniqueStrings(items) as SimulationDomain[];
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
