/**
 * Presentation-boundary safety net — HOTFIX (see apps/architect/SPANISH_CLIENT_EXPERIENCE_100.md).
 *
 * Consulting risks, opportunities, recommendations, process bottlenecks and
 * solution roadmap phases are generated once (during discovery / blueprint
 * derivation) and then persisted on the workspace. Their *copy* only changes
 * when the underlying rule tables in `risk.ts` / `opportunities.ts` /
 * `bottlenecks.ts` / `solution/roadmap.ts` change — a workspace saved before
 * a copy fix (e.g. the pre-Spanish English copy) keeps that stale text
 * forever unless something re-derives it.
 *
 * These functions re-stamp the *display copy* from the current rule tables
 * using each object's stable identifier (`patternId`, rule-id prefix, `kind`,
 * `phase` number) while leaving ids/evidence/confidence/severity untouched.
 * They always win at the presentation boundary, regardless of what shape the
 * persisted copy is in. Called from `lib/repositories/migrate.ts` on every
 * bundle load — no engine logic is changed.
 */
import { titleFor as bottleneckTitleFor, impactFor as bottleneckImpactFor } from "@/lib/processes/bottlenecks";
import { opportunityHorizonLabel, stepNameLabel } from "@/lib/presentation";
import { OPPORTUNITY_RULES } from "./opportunities";
import { RISK_RULES } from "./risk";
import { ROADMAP_PHASE_DEFINITIONS } from "@/lib/solution/roadmap";
import type {
  BusinessProcessModel,
  ConsultingIntelligence,
  ConsultingOpportunity,
  ConsultingRecommendation,
  ConsultingRisk,
  ImplementationPhase,
  ProcessBottleneck,
  SolutionArchitecture,
} from "@/types";

const RISK_RULE_BY_PATTERN = new Map(RISK_RULES.map((rule) => [rule.patternId, rule]));

export function normalizeConsultingRisk(risk: ConsultingRisk): ConsultingRisk {
  const rule = RISK_RULE_BY_PATTERN.get(risk.patternId);
  if (!rule) return risk;
  return {
    ...risk,
    title: rule.title,
    businessImpact: rule.businessImpact,
    recommendedMitigation: rule.recommendedMitigation,
  };
}

function opportunityRuleFor(opportunity: ConsultingOpportunity) {
  return OPPORTUNITY_RULES.find((rule) => opportunity.id.startsWith(`${rule.id}_`));
}

export function normalizeConsultingOpportunity(
  opportunity: ConsultingOpportunity,
): ConsultingOpportunity {
  const rule = opportunityRuleFor(opportunity);
  if (!rule) return opportunity;
  return {
    ...opportunity,
    title: rule.title,
    estimatedImpact: rule.estimatedImpact,
    difficulty: rule.difficulty,
    dependencies: rule.dependencies,
    departmentsAffected: rule.departmentsAffected,
  };
}

function normalizeConsultingRecommendation(
  recommendation: ConsultingRecommendation,
  risksById: Map<string, ConsultingRisk>,
  opportunitiesById: Map<string, ConsultingOpportunity>,
): ConsultingRecommendation {
  const riskId = recommendation.relatedRiskIds[0];
  const risk = riskId ? risksById.get(riskId) : undefined;
  if (risk) {
    return {
      ...recommendation,
      title: risk.recommendedMitigation,
      rationale: `${risk.title}: ${risk.businessImpact}`,
    };
  }

  const opportunityId = recommendation.relatedOpportunityIds[0];
  const opportunity = opportunityId ? opportunitiesById.get(opportunityId) : undefined;
  if (opportunity) {
    return {
      ...recommendation,
      title: opportunity.title,
      rationale: `${opportunity.estimatedImpact} (${opportunityHorizonLabel(opportunity.horizon)}).`,
    };
  }

  return recommendation;
}

/** Re-stamps risks/opportunities/recommendations from current copy tables. */
export function normalizeConsultingIntelligence(
  consulting: ConsultingIntelligence,
): ConsultingIntelligence {
  const risks = consulting.risks.map(normalizeConsultingRisk);
  const opportunities = consulting.opportunities.map(normalizeConsultingOpportunity);
  const risksById = new Map(risks.map((r) => [r.id, r]));
  const opportunitiesById = new Map(opportunities.map((o) => [o.id, o]));
  const recommendations = consulting.recommendations.map((rec) =>
    normalizeConsultingRecommendation(rec, risksById, opportunitiesById),
  );

  return { ...consulting, risks, opportunities, recommendations };
}

/** Re-stamps process bottleneck copy from the current `kind` → Spanish tables. */
export function normalizeProcessBottleneck(
  bottleneck: ProcessBottleneck,
): ProcessBottleneck {
  // Bottleneck titles are either the bare pattern label, or
  // `${patternLabel} · ${stepName}` when tied to a specific blueprint step —
  // re-translate both halves independently since `stepName` may still be a
  // raw English blueprint step name (e.g. "Approval", "Lead / inquiry").
  const separatorIndex = bottleneck.title.indexOf(" · ");
  const stepNameRaw =
    separatorIndex >= 0 ? bottleneck.title.slice(separatorIndex + 3) : null;
  const title =
    stepNameRaw != null
      ? `${bottleneckTitleFor(bottleneck.kind)} · ${stepNameLabel(stepNameRaw)}`
      : bottleneckTitleFor(bottleneck.kind);
  return {
    ...bottleneck,
    title,
    businessImpact: bottleneckImpactFor(bottleneck.kind),
  };
}

const ROADMAP_PHASE_BY_NUMBER = new Map(
  ROADMAP_PHASE_DEFINITIONS.map((def) => [def.phase, def]),
);

/** Re-stamps roadmap phase name/goals/business value from the current definitions, keyed by phase number. */
export function normalizeImplementationPhase(
  phase: ImplementationPhase,
): ImplementationPhase {
  const def = ROADMAP_PHASE_BY_NUMBER.get(phase.phase);
  if (!def) return phase;
  return {
    ...phase,
    name: def.name,
    goals: def.goals,
    dependencies: def.dependencies,
    businessValue: def.businessValue,
    estimatedComplexity: def.estimatedComplexity,
  };
}

export function normalizeBusinessProcesses(
  businessProcesses: BusinessProcessModel,
): BusinessProcessModel {
  return {
    ...businessProcesses,
    bottlenecks: businessProcesses.bottlenecks.map(normalizeProcessBottleneck),
  };
}

export function normalizeSolutionArchitecture(
  solutionArchitecture: SolutionArchitecture,
): SolutionArchitecture {
  return {
    ...solutionArchitecture,
    roadmap: solutionArchitecture.roadmap.map(normalizeImplementationPhase),
  };
}
