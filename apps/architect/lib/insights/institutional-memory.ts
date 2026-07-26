/**
 * 5. Institutional Memory — expands a recommendation into "why we believe
 * this" plus the Interview → Document → Meeting → Evidence → Recommendation
 * chain. Reuses `lib/explanations` (Mission 14) for the belief chain and
 * `workspace.timeline` / `workspace.meetings` / `lib/knowledge` for the
 * provenance chain. No new justification logic — just assembly + framing.
 */

import { explainWorkspaceRecommendations } from "@/lib/explanations";
import { ensureWorkspaceKnowledge } from "@/lib/knowledge";
import type { CompanyWorkspace } from "@/types";
import type { InstitutionalMemoryEntry, InstitutionalMemoryStep } from "./types";

function buildProvenanceChain(workspace: CompanyWorkspace): InstitutionalMemoryStep[] {
  const knowledge = ensureWorkspaceKnowledge(workspace.knowledge);
  const discoveryEvents = workspace.timeline.filter((e) => e.category === "discovery");
  const processedDocs = knowledge.assets.filter((a) => a.status === "processed");
  const knownFacts = workspace.conversationMemory?.knownFacts.length ?? 0;
  const evidenceLog = knowledge.evidenceLog.length;
  const recommendationCount =
    (workspace.conversationMemory?.consulting.recommendations.length ?? 0) ||
    workspace.recommendations.length;

  return [
    {
      id: "interview",
      label: "Entrevista",
      detail:
        discoveryEvents.length > 0
          ? `${discoveryEvents.length} avance(s) de descubrimiento registrados`
          : "Aún sin avances de descubrimiento registrados",
      count: discoveryEvents.length,
    },
    {
      id: "document",
      label: "Documento",
      detail:
        processedDocs.length > 0
          ? `${processedDocs.length} documento(s) procesados en el conocimiento del negocio`
          : "Aún sin documentos procesados",
      count: processedDocs.length,
    },
    {
      id: "meeting",
      label: "Reunión",
      detail:
        workspace.meetings.length > 0
          ? `${workspace.meetings.length} reunión(es) registradas`
          : "Aún sin reuniones registradas",
      count: workspace.meetings.length,
    },
    {
      id: "evidence",
      label: "Evidencia",
      detail:
        knownFacts + evidenceLog > 0
          ? `${knownFacts} hecho(s) confirmados y ${evidenceLog} entrada(s) en el registro de evidencia`
          : "Aún sin evidencia consolidada",
      count: knownFacts + evidenceLog,
    },
    {
      id: "recommendation",
      label: "Recomendación",
      detail:
        recommendationCount > 0
          ? `${recommendationCount} recomendación(es) sostenidas por lo anterior`
          : "Aún sin recomendaciones formales",
      count: recommendationCount,
    },
  ];
}

export function deriveInstitutionalMemory(
  workspace: CompanyWorkspace,
): InstitutionalMemoryEntry[] {
  const explained = explainWorkspaceRecommendations(workspace).slice(0, 4);
  if (explained.length === 0) return [];

  const chain = buildProvenanceChain(workspace);

  return explained.map((rec) => ({
    id: rec.id,
    recommendationTitle: rec.title,
    whyWeBelieve: [rec.problem, rec.observedPattern, rec.businessConsequence].filter(
      (line): line is string => Boolean(line && line.trim().length > 0),
    ),
    evidenceQuotes: rec.evidence
      .slice(0, 4)
      .map((e) => e.quote ?? e.label)
      .filter((q): q is string => Boolean(q)),
    chain,
  }));
}
