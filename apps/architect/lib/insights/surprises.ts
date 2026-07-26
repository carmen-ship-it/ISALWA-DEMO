/**
 * 4. Three Things That Surprised Us — McKinsey-style observations built from
 * the same Consulting Engine outputs (risks, opportunities, hypotheses)
 * already sitting on ConversationMemory. No new detection — only a sharper,
 * "what stood out" narrative lens over evidence that already exists.
 */

import type { CompanyWorkspace } from "@/types";
import { consultingOf, evidence, opportunityEvidence, riskEvidence } from "./shared";
import type { SurprisingObservation } from "./types";

const SEVERITY_WEIGHT: Record<string, number> = {
  critical: 4,
  high: 3,
  moderate: 2,
  low: 1,
};

export function deriveSurprises(workspace: CompanyWorkspace): SurprisingObservation[] {
  const memory = workspace.conversationMemory;
  const consulting = consultingOf(workspace);
  if (!memory || !consulting) return [];

  const candidates: Array<{ weight: number; item: SurprisingObservation }> = [];

  const topRisk = consulting.risks
    .slice()
    .sort(
      (a, b) =>
        (SEVERITY_WEIGHT[b.severity] ?? 0) * b.confidence -
        (SEVERITY_WEIGHT[a.severity] ?? 0) * a.confidence,
    )[0];
  if (topRisk) {
    candidates.push({
      weight: (SEVERITY_WEIGHT[topRisk.severity] ?? 0) * topRisk.confidence,
      item: {
        id: `surprise_${topRisk.id}`,
        title: "Un riesgo más presente de lo esperado",
        narrative: `Descubrimos que "${topRisk.title}" no es un caso aislado: ${topRisk.businessImpact}`,
        evidence: riskEvidence(topRisk),
      },
    });
  }

  const topOpportunity = consulting.opportunities
    .filter((o) => o.horizon === "Quick Wins" || o.horizon === "30-day")
    .sort((a, b) => b.confidence - a.confidence)[0];
  if (topOpportunity) {
    candidates.push({
      weight: topOpportunity.confidence * 3,
      item: {
        id: `surprise_${topOpportunity.id}`,
        title: "Una ganancia rápida escondida a simple vista",
        narrative: `Contrario a lo que suele tomar meses, "${topOpportunity.title}" parece alcanzable en el corto plazo: ${topOpportunity.estimatedImpact}`,
        evidence: opportunityEvidence(topOpportunity),
      },
    });
  }

  const confirmedHypothesis = memory.hypotheses
    .filter((h) => h.status === "confirmed" && h.evidence.length > 0)
    .sort((a, b) => b.confidence - a.confidence)[0];
  if (confirmedHypothesis) {
    candidates.push({
      weight: confirmedHypothesis.confidence * 2.5,
      item: {
        id: `surprise_${confirmedHypothesis.id}`,
        title: "Una corazonada que resultó cierta",
        narrative: `Lo que empezó como una sospecha se confirmó con evidencia directa: ${confirmedHypothesis.statement}`,
        evidence: confirmedHypothesis.evidence
          .slice(0, 2)
          .map((quote) => evidence("known_fact", confirmedHypothesis.id, "Hipótesis confirmada", quote)),
      },
    });
  }

  const secondRisk = consulting.risks
    .filter((r) => r.id !== topRisk?.id)
    .sort(
      (a, b) =>
        (SEVERITY_WEIGHT[b.severity] ?? 0) * b.confidence -
        (SEVERITY_WEIGHT[a.severity] ?? 0) * a.confidence,
    )[0];
  if (secondRisk && candidates.length < 3) {
    candidates.push({
      weight: (SEVERITY_WEIGHT[secondRisk.severity] ?? 0) * secondRisk.confidence * 0.9,
      item: {
        id: `surprise_${secondRisk.id}`,
        title: "Un segundo patrón que merece atención",
        narrative: `También encontramos que "${secondRisk.title}" aparece con más fuerza de la esperada: ${secondRisk.businessImpact}`,
        evidence: riskEvidence(secondRisk),
      },
    });
  }

  return candidates
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map((c) => c.item);
}
