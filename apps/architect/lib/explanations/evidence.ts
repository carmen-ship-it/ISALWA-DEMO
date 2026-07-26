/**
 * Deterministic evidence collection for explained recommendations.
 * Pulls only from existing workspace / consulting / blueprint / process models.
 */

import type {
  CompanyWorkspace,
  ConsultingOpportunity,
  ConsultingRecommendation,
  ConsultingRisk,
  Recommendation,
  SolutionModule,
} from "@/types";
import type { ExplanationEvidenceItem } from "./types";

export function collectRecommendationEvidence(
  workspace: CompanyWorkspace,
  opts: {
    recommendation?: ConsultingRecommendation | Recommendation;
    relatedRisks?: ConsultingRisk[];
    relatedOpportunities?: ConsultingOpportunity[];
    module?: SolutionModule;
    limit?: number;
  },
): ExplanationEvidenceItem[] {
  const limit = opts.limit ?? 8;
  const items: ExplanationEvidenceItem[] = [];
  const seen = new Set<string>();

  const push = (item: ExplanationEvidenceItem) => {
    const key = `${item.source}:${item.id ?? item.label}:${item.quote ?? ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    items.push(item);
  };

  const rec = opts.recommendation;
  if (rec && "evidence" in rec && Array.isArray(rec.evidence)) {
    for (const quote of rec.evidence.slice(0, 4)) {
      push({
        source: "recommendation",
        id: rec.id,
        label: "Evidencia de la recomendación",
        quote,
      });
    }
  }

  for (const risk of opts.relatedRisks ?? []) {
    push({
      source: "risk",
      id: risk.id,
      label: risk.title,
      quote: risk.businessImpact,
    });
    for (const quote of risk.evidence.slice(0, 2)) {
      push({
        source: "risk",
        id: risk.id,
        label: `Riesgo · ${risk.title}`,
        quote,
      });
    }
  }

  for (const opp of opts.relatedOpportunities ?? []) {
    push({
      source: "opportunity",
      id: opp.id,
      label: opp.title,
      quote: opp.estimatedImpact,
    });
    for (const quote of opp.evidence.slice(0, 2)) {
      push({
        source: "opportunity",
        id: opp.id,
        label: `Oportunidad · ${opp.title}`,
        quote,
      });
    }
  }

  if (opts.module) {
    for (const ref of opts.module.evidence.slice(0, 3)) {
      push({
        source: "solution",
        id: ref.id,
        label: ref.label,
      });
    }
    if (opts.module.purpose) {
      push({
        source: "solution",
        id: opts.module.id,
        label: `Capacidad · ${opts.module.name}`,
        quote: opts.module.purpose,
      });
    }
  }

  const consulting = workspace.conversationMemory?.consulting;
  for (const pattern of (consulting?.patterns ?? []).slice(0, 2)) {
    push({
      source: "pattern",
      id: pattern.id,
      label: pattern.label,
      quote: pattern.description,
    });
  }

  for (const pain of workspace.painPoints.slice(0, 3)) {
    push({
      source: "pain",
      id: pain.id,
      label: pain.title,
      quote: pain.description,
    });
  }

  for (const fact of (workspace.conversationMemory?.knownFacts ?? []).slice(
    0,
    3,
  )) {
    push({
      source: "fact",
      id: fact.id,
      label: fact.key,
      quote: fact.statement,
    });
  }

  const blueprint = workspace.blueprints.find(
    (b) => b.id === workspace.currentBlueprintId,
  );
  if (blueprint) {
    push({
      source: "blueprint",
      id: blueprint.id,
      label: `Blueprint v${blueprint.version}`,
    });
  }

  if (workspace.businessProcesses) {
    push({
      source: "process",
      id: workspace.businessProcesses.id,
      label: "Modelo de procesos de negocio",
    });
  }

  for (const meeting of workspace.meetings.slice(0, 2)) {
    const discovery = meeting.discoveries[0];
    push({
      source: "meeting",
      id: meeting.id,
      label: meeting.title,
      quote: discovery,
    });
  }

  for (const asset of (workspace.knowledge?.assets ?? []).slice(0, 2)) {
    push({
      source: "knowledge",
      id: asset.id,
      label: asset.title,
    });
  }

  return items.slice(0, limit);
}

export function evidenceQuotes(
  items: ExplanationEvidenceItem[],
  limit = 4,
): string[] {
  return items
    .map((i) => i.quote?.trim() || i.label)
    .filter(Boolean)
    .slice(0, limit);
}
