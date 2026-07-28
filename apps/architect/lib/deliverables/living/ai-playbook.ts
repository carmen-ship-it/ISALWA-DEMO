/**
 * Mission 26 — AI Playbook.
 *
 * Reuses `explainWorkspaceRecommendations` (Mission 14,
 * `lib/explanations/recommendation.ts`) verbatim — no second recommendation
 * engine. Every entry keeps the explanation layer's own confidence band and
 * evidence, reframed as "where AI/automation helps first."
 */

import { explainWorkspaceRecommendations } from "@/lib/explanations";
import type {
  AiPlaybookContent,
  AiPlaybookItem,
  CompanyWorkspace,
  LivingDeliverableEvidenceRef,
} from "@/types";

export interface AiPlaybookGenerationResult {
  title: string;
  content: AiPlaybookContent;
  evidence: LivingDeliverableEvidenceRef[];
  missingInformation: string[];
  contentSignalCount: number;
}

export function generateAiPlaybook(
  workspace: CompanyWorkspace,
): AiPlaybookGenerationResult {
  const explained = explainWorkspaceRecommendations(workspace);
  const needsMoreKnowledge: string[] = [];

  if (explained.length === 0) {
    needsMoreKnowledge.push(
      "Architect todavía no tiene suficientes recomendaciones para priorizar dónde ayuda la IA primero.",
    );
  }

  const items: AiPlaybookItem[] = explained.map((rec) => ({
    id: rec.id,
    title: rec.title,
    rationale: `${rec.recommendation} ${rec.businessValue}`.trim(),
    priority: rec.priority,
    confidenceBand: rec.confidence.band,
  }));

  const evidence: LivingDeliverableEvidenceRef[] = explained
    .flatMap((rec) => rec.evidence)
    .slice(0, 12)
    .map((e) => ({
      source: "consulting" as const,
      id: e.id ?? e.label,
      label: e.label,
    }));

  return {
    title: `Playbook de IA de ${workspace.companyName}`,
    content: { items, needsMoreKnowledge },
    evidence,
    missingInformation: needsMoreKnowledge,
    contentSignalCount: items.length,
  };
}
