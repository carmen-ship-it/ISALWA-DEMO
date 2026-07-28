/**
 * Mission 26 — Improvement Roadmap.
 *
 * Buckets the Consulting Intelligence opportunity list
 * (`workspace.conversationMemory.consulting.opportunities`) — the same list
 * `lib/executive/recommendations.ts` already ranks for the cockpit — into
 * Quick Wins / 30 days / 90 days / Long Term. `impact` reuses each
 * opportunity's own `estimatedImpact` text and `effort` its own
 * `difficulty`; neither is a new score. Falls back to
 * `workspace.opportunities` when Consulting Intelligence hasn't run yet.
 */

import type {
  CompanyWorkspace,
  ImprovementRoadmapContent,
  ImprovementRoadmapItem,
  LivingDeliverableEvidenceRef,
} from "@/types";

export interface ImprovementRoadmapGenerationResult {
  title: string;
  content: ImprovementRoadmapContent;
  evidence: LivingDeliverableEvidenceRef[];
  missingInformation: string[];
  contentSignalCount: number;
}

const EFFORT_LABEL: Record<string, string> = {
  low: "Esfuerzo bajo",
  moderate: "Esfuerzo moderado",
  high: "Esfuerzo alto",
};

export function generateImprovementRoadmap(
  workspace: CompanyWorkspace,
): ImprovementRoadmapGenerationResult {
  const consultingOpportunities = workspace.conversationMemory?.consulting?.opportunities ?? [];
  const needsMoreKnowledge: string[] = [];

  let quickWins: ImprovementRoadmapItem[] = [];
  let thirtyDay: ImprovementRoadmapItem[] = [];
  let ninetyDay: ImprovementRoadmapItem[] = [];
  let longTerm: ImprovementRoadmapItem[] = [];
  let evidence: LivingDeliverableEvidenceRef[] = [];

  if (consultingOpportunities.length > 0) {
    const toItem = (o: (typeof consultingOpportunities)[number]): ImprovementRoadmapItem => ({
      id: o.id,
      title: o.title,
      description: o.estimatedImpact,
      impact: o.estimatedImpact || null,
      effort: EFFORT_LABEL[o.difficulty] ?? null,
    });

    quickWins = consultingOpportunities.filter((o) => o.horizon === "Quick Wins").map(toItem);
    thirtyDay = consultingOpportunities.filter((o) => o.horizon === "30-day").map(toItem);
    ninetyDay = consultingOpportunities.filter((o) => o.horizon === "90-day").map(toItem);
    longTerm = consultingOpportunities
      .filter((o) => o.horizon === "6-month" || o.horizon === "1-year" || o.horizon === "strategic")
      .map(toItem);

    evidence = consultingOpportunities.slice(0, 10).flatMap((o) =>
      o.evidence.map((label) => ({ source: "consulting" as const, id: label, label })),
    );
  } else if (workspace.opportunities.length > 0) {
    const toItem = (o: (typeof workspace.opportunities)[number]): ImprovementRoadmapItem => ({
      id: o.id,
      title: o.title,
      description: o.description,
      impact: opportunityHorizonImpactLabel(o.impact),
      effort: null,
    });
    quickWins = workspace.opportunities.filter((o) => o.impact === "quick_win").map(toItem);
    thirtyDay = workspace.opportunities.filter((o) => o.impact === "medium").map(toItem);
    ninetyDay = [];
    longTerm = workspace.opportunities
      .filter((o) => o.impact === "high" || o.impact === "strategic")
      .map(toItem);
    evidence = [{ source: "memory", id: workspace.id, label: `${workspace.companyName} company memory` }];
    needsMoreKnowledge.push("Esfuerzo estimado por oportunidad (aún no clasificado por dificultad).");
  } else {
    needsMoreKnowledge.push(
      "Architect todavía no ha identificado oportunidades de mejora suficientes para construir una hoja de ruta.",
    );
  }

  const contentSignalCount = quickWins.length + thirtyDay.length + ninetyDay.length + longTerm.length;

  return {
    title: `Hoja de Ruta de Mejora de ${workspace.companyName}`,
    content: { quickWins, thirtyDay, ninetyDay, longTerm, needsMoreKnowledge },
    evidence,
    missingInformation: needsMoreKnowledge,
    contentSignalCount,
  };
}

const IMPACT_LABEL: Record<string, string> = {
  quick_win: "Impacto rápido",
  medium: "Impacto medio",
  high: "Impacto alto",
  strategic: "Impacto estratégico",
};

function opportunityHorizonImpactLabel(impact: string): string {
  return IMPACT_LABEL[impact] ?? impact;
}
