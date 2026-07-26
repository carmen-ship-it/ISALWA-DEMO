/**
 * Mission 14 — build ExplainedRecommendation from Recommendation + workspace context.
 * Pure projection. Does not mutate consulting / blueprint / process / solution engines.
 */

import { moduleLabel } from "@/lib/presentation";
import {
  assessReadiness,
  recommendationEvidenceBasis,
  type ReadinessAssessment,
} from "@/lib/readiness";
import type {
  CompanyWorkspace,
  ConsultingRecommendation,
  Recommendation,
  SolutionModule,
} from "@/types";
import {
  businessConsequenceFromContext,
  businessValueFromContext,
  futureDependenciesFromContext,
  observedPatternFromContext,
  problemFromContext,
  recommendationStatement,
  supportingFactsFromWorkspace,
} from "./business-value";
import { buildExplanationConfidence } from "./confidence";
import {
  collectRecommendationEvidence,
  evidenceQuotes,
} from "./evidence";
import {
  roiFromConsulting,
  roiFromModuleIndex,
  roiFromWorkspaceRecommendation,
} from "./roi";
import type {
  ExplanationConfidence,
  ExplanationEvidenceItem,
  ExplainedRecommendation,
} from "./types";

/**
 * Evidence transparency, delegated to the Consultant Readiness Engine so the
 * client-facing wording lives in exactly one place. The support figure is the
 * one the explanation layer already computed — readiness only translates it
 * into "sobre qué se apoya esto" language, and asks for what is missing when
 * the footing is thin.
 */
function buildEvidenceBasis(
  evidence: ExplanationEvidenceItem[],
  confidence: ExplanationConfidence,
  readiness: ReadinessAssessment | null,
) {
  return recommendationEvidenceBasis(
    {
      sources: evidence.map((item) => item.source),
      support: confidence.score,
    },
    readiness,
  );
}

function isConsultingRecommendation(
  rec: Recommendation | ConsultingRecommendation,
): rec is ConsultingRecommendation {
  return (
    "relatedRiskIds" in rec &&
    "relatedOpportunityIds" in rec &&
    Array.isArray(rec.relatedRiskIds)
  );
}

/**
 * Explain a single recommendation (workspace or consulting) with workspace evidence.
 */
export function explainRecommendation(
  recommendation: Recommendation | ConsultingRecommendation,
  workspace: CompanyWorkspace,
  readiness: ReadinessAssessment | null = null,
): ExplainedRecommendation {
  if (isConsultingRecommendation(recommendation)) {
    return explainConsultingRecommendation(recommendation, workspace, readiness);
  }
  return explainWorkspaceRecommendation(recommendation, workspace, readiness);
}

export function explainConsultingRecommendation(
  recommendation: ConsultingRecommendation,
  workspace: CompanyWorkspace,
  readiness: ReadinessAssessment | null = null,
): ExplainedRecommendation {
  const consulting = workspace.conversationMemory?.consulting;
  const relatedRisks = (consulting?.risks ?? []).filter((r) =>
    recommendation.relatedRiskIds.includes(r.id),
  );
  const relatedOpportunities = (consulting?.opportunities ?? []).filter((o) =>
    recommendation.relatedOpportunityIds.includes(o.id),
  );
  const pattern = consulting?.patterns[0];

  const matchingModule = findMatchingModule(workspace, recommendation.title);
  const evidence = collectRecommendationEvidence(workspace, {
    recommendation,
    relatedRisks,
    relatedOpportunities,
    module: matchingModule ?? undefined,
  });

  const quotes = evidenceQuotes(evidence);
  const knownFacts = (workspace.conversationMemory?.knownFacts ?? [])
    .slice(0, 4)
    .map((f) => f.statement);
  const painTitles = workspace.painPoints.slice(0, 3).map((p) => p.title);

  const confidence = buildExplanationConfidence({
    workspace,
    evidenceCount: evidence.length,
    relatedRisks,
    relatedOpportunities,
    moduleConfidence: matchingModule?.confidence,
  });

  return {
    id: recommendation.id,
    title: recommendation.title,
    priority: recommendation.priority,
    problem: problemFromContext({
      title: recommendation.title,
      risks: relatedRisks,
      opportunities: relatedOpportunities,
      rationale: recommendation.rationale,
      painTitles,
    }),
    evidence,
    observedPattern: observedPatternFromContext({
      patternLabel: pattern?.label,
      patternDescription: pattern?.description,
      risks: relatedRisks,
      opportunities: relatedOpportunities,
    }),
    businessConsequence: businessConsequenceFromContext({
      risks: relatedRisks,
      opportunities: relatedOpportunities,
      rationale: recommendation.rationale,
    }),
    recommendation: recommendationStatement({
      title: recommendation.title,
      mitigation: relatedRisks[0]?.recommendedMitigation,
      rationale: recommendation.rationale,
    }),
    expectedRoi: roiFromConsulting(recommendation, relatedOpportunities),
    confidence,
    evidenceBasis: buildEvidenceBasis(evidence, confidence, readiness),
    businessValue: businessValueFromContext({
      risks: relatedRisks,
      opportunities: relatedOpportunities,
      rationale: recommendation.rationale,
      module: matchingModule ?? undefined,
    }),
    supportingFacts: supportingFactsFromWorkspace({
      evidenceQuotes: quotes,
      knownFacts,
      painTitles,
      rationale: recommendation.rationale,
    }),
    futureDependencies: futureDependenciesFromContext({
      opportunities: relatedOpportunities,
      module: matchingModule ?? undefined,
      recommendation,
    }),
  };
}

export function explainWorkspaceRecommendation(
  recommendation: Recommendation,
  workspace: CompanyWorkspace,
  readiness: ReadinessAssessment | null = null,
): ExplainedRecommendation {
  const relatedPains = workspace.painPoints.filter((p) =>
    recommendation.relatedPainPoints.includes(p.id),
  );
  const painTitles =
    relatedPains.length > 0
      ? relatedPains.map((p) => p.title)
      : workspace.painPoints.slice(0, 2).map((p) => p.title);

  const matchingOpp = workspace.opportunities.find(
    (o) =>
      o.title.toLowerCase() === recommendation.title.toLowerCase() ||
      recommendation.rationale.toLowerCase().includes(o.title.toLowerCase()),
  );

  const evidence = collectRecommendationEvidence(workspace, {
    recommendation,
  });

  for (const pain of relatedPains.slice(0, 3)) {
    evidence.push({
      source: "pain",
      id: pain.id,
      label: pain.title,
      quote: pain.description,
    });
  }

  const quotes = evidenceQuotes(evidence);
  const knownFacts = (workspace.conversationMemory?.knownFacts ?? [])
    .slice(0, 4)
    .map((f) => f.statement);

  const confidence = buildExplanationConfidence({
    workspace,
    evidenceCount: evidence.length,
  });

  return {
    id: recommendation.id,
    title: recommendation.title,
    priority: recommendation.priority,
    problem: problemFromContext({
      title: recommendation.title,
      risks: [],
      opportunities: [],
      rationale: recommendation.rationale,
      painTitles,
    }),
    evidence: evidence.slice(0, 8),
    observedPattern: observedPatternFromContext({
      risks: [],
      opportunities: [],
    }),
    businessConsequence: businessConsequenceFromContext({
      risks: [],
      opportunities: [],
      rationale: recommendation.rationale,
    }),
    recommendation: recommendationStatement({
      title: recommendation.title,
      rationale: recommendation.rationale,
    }),
    expectedRoi: roiFromWorkspaceRecommendation(
      recommendation,
      matchingOpp?.impact,
    ),
    confidence,
    evidenceBasis: buildEvidenceBasis(evidence, confidence, readiness),
    businessValue: businessValueFromContext({
      risks: [],
      opportunities: [],
      rationale: recommendation.rationale,
    }),
    supportingFacts: supportingFactsFromWorkspace({
      evidenceQuotes: quotes,
      knownFacts,
      painTitles,
      rationale: recommendation.rationale,
    }),
    futureDependencies: futureDependenciesFromContext({
      opportunities: [],
      recommendation,
    }),
  };
}

export function explainSolutionModule(
  module: SolutionModule,
  workspace: CompanyWorkspace,
  index = 0,
  readiness: ReadinessAssessment | null = null,
): ExplainedRecommendation {
  const consulting = workspace.conversationMemory?.consulting;
  const relatedOpportunities = (consulting?.opportunities ?? [])
    .filter((o) =>
      matchesLoose(module.name, `${o.title} ${o.estimatedImpact}`),
    )
    .slice(0, 2);
  const relatedRisks = (consulting?.risks ?? [])
    .filter((r) =>
      matchesLoose(
        module.name,
        `${r.title} ${r.businessImpact} ${r.recommendedMitigation}`,
      ),
    )
    .slice(0, 2);

  const phaseEntry = workspace.solutionArchitecture?.roadmap.find((p) =>
    p.modules.some((n) => n.toLowerCase() === module.name.toLowerCase()),
  );

  const relatedPains = workspace.painPoints
    .filter((p) =>
      matchesLoose(module.name, `${p.title} ${p.description} ${p.category}`),
    )
    .slice(0, 3);
  const painTitles = relatedPains.map((p) => p.title);

  const evidence = collectRecommendationEvidence(workspace, {
    relatedRisks,
    relatedOpportunities,
    module,
  });

  const priority =
    index < 2 ? "now" : index < 4 ? "next" : ("later" as const);

  const quotes = evidenceQuotes(evidence);
  const knownFacts = (workspace.conversationMemory?.knownFacts ?? [])
    .slice(0, 3)
    .map((f) => f.statement);

  const confidence = buildExplanationConfidence({
    workspace,
    evidenceCount: evidence.length,
    relatedRisks,
    relatedOpportunities,
    moduleConfidence: module.confidence,
  });

  return {
    id: module.id,
    title: moduleLabel(module.name),
    priority,
    problem: problemFromContext({
      title: moduleLabel(module.name),
      risks: relatedRisks,
      opportunities: relatedOpportunities,
      painTitles,
      rationale: module.purpose,
    }),
    evidence,
    observedPattern: observedPatternFromContext({
      patternLabel: consulting?.patterns[0]?.label,
      patternDescription: consulting?.patterns[0]?.description,
      risks: relatedRisks,
      opportunities: relatedOpportunities,
    }),
    businessConsequence: businessConsequenceFromContext({
      risks: relatedRisks,
      opportunities: relatedOpportunities,
      rationale: module.purpose,
    }),
    recommendation: recommendationStatement({
      title: `Implementar la capacidad ${moduleLabel(module.name)}`,
      rationale: module.purpose,
    }),
    expectedRoi: roiFromModuleIndex(
      index,
      phaseEntry?.businessValue ?? null,
      priority,
    ),
    confidence,
    evidenceBasis: buildEvidenceBasis(evidence, confidence, readiness),
    businessValue: businessValueFromContext({
      risks: relatedRisks,
      opportunities: relatedOpportunities,
      module,
      phaseBusinessValue: phaseEntry?.businessValue ?? null,
    }),
    supportingFacts: supportingFactsFromWorkspace({
      evidenceQuotes: quotes,
      knownFacts,
      painTitles,
      rationale: module.purpose,
    }),
    futureDependencies: futureDependenciesFromContext({
      opportunities: relatedOpportunities,
      module,
    }),
  };
}

/**
 * Prefer consulting recommendations; fall back to workspace recommendations.
 */
export function explainWorkspaceRecommendations(
  workspace: CompanyWorkspace,
): ExplainedRecommendation[] {
  const consultingRecs =
    workspace.conversationMemory?.consulting?.recommendations ?? [];
  // One readiness pass for the whole list — every card then tells the client
  // the same story about what the file still needs.
  const readiness = assessReadiness(workspace);

  if (consultingRecs.length > 0) {
    return consultingRecs
      .slice(0, 8)
      .map((rec) => explainConsultingRecommendation(rec, workspace, readiness));
  }

  return workspace.recommendations
    .slice(0, 8)
    .map((rec) => explainWorkspaceRecommendation(rec, workspace, readiness));
}

export function explainSolutionModules(
  workspace: CompanyWorkspace,
): ExplainedRecommendation[] {
  const modules = workspace.solutionArchitecture?.modules ?? [];
  const readiness = assessReadiness(workspace);
  return modules
    .slice(0, 6)
    .map((mod, index) =>
      explainSolutionModule(mod, workspace, index, readiness),
    );
}

function findMatchingModule(
  workspace: CompanyWorkspace,
  title: string,
): SolutionModule | null {
  const modules = workspace.solutionArchitecture?.modules ?? [];
  return (
    modules.find((m) => matchesLoose(m.name, title)) ??
    modules.find((m) => matchesLoose(title, m.name)) ??
    null
  );
}

function matchesLoose(a: string, b: string): boolean {
  const left = a.toLowerCase();
  const right = b.toLowerCase();
  if (right.includes(left) || left.includes(right)) return true;
  const aliases: Record<string, RegExp> = {
    crm: /customer|crm|lead|pipeline|sales/i,
    sales: /sales|quote|order|pipeline|comercial/i,
    purchasing: /purchas|supplier|vendor|compra/i,
    inventory: /inventor|stock|warehouse|sku/i,
    finance: /financ|invoice|collect|account|cobran/i,
    production: /product|manufactur|shop floor/i,
    collections: /collect|receivable|cobran/i,
    hr: /\bhr\b|people|employee|persona/i,
    approvals: /approv|aprob/i,
  };
  const re = aliases[left];
  return re ? re.test(right) : false;
}
