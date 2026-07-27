import type {
  CompanyWorkspace,
  KnowledgeReasoningContext,
  WorkspaceKnowledge,
} from "@/types";
import { coverageAreaLabel } from "@/lib/presentation";
import { ensureWorkspaceKnowledge } from "./coverage";

/**
 * Assemble Knowledge for the consultant brain.
 * Reasoning is not rewritten — callers pre-seed / brief from this context.
 */
export function buildKnowledgeReasoningContext(
  workspace: CompanyWorkspace,
): KnowledgeReasoningContext {
  const knowledge = ensureWorkspaceKnowledge(workspace.knowledge);
  const processed = knowledge.assets.filter((a) => a.status === "processed");
  const briefingLines = buildKnowledgeBriefingLines(knowledge);

  return {
    workspaceId: workspace.id,
    documentCount: processed.length,
    themes: knowledge.themes,
    unknownAreas: knowledge.unknownAreas,
    entityNames: knowledge.entities.map((e) => e.name),
    coverage: knowledge.coverage,
    briefingLines,
    lastAnalysisAt: knowledge.lastAnalysisAt,
  };
}

export function buildKnowledgeBriefingLines(
  knowledge: WorkspaceKnowledge,
): string[] {
  const processed = knowledge.assets.filter((a) => a.status === "processed");
  if (processed.length === 0) return [];

  const lines: string[] = [
    `Revisé ${processed.length} documento${processed.length === 1 ? "" : "s"} antes de esta sesión.`,
  ];

  if (knowledge.themes.length > 0) {
    lines.push(
      `Encontré ${knowledge.themes.length} tema${knowledge.themes.length === 1 ? "" : "s"} operativo${knowledge.themes.length === 1 ? "" : "s"} recurrente${knowledge.themes.length === 1 ? "" : "s"}.`,
    );
  }

  const focus =
    knowledge.unknownAreas.find((area) =>
      /purchas|operations|finance|production/i.test(area),
    ) ?? knowledge.unknownAreas[0];

  if (focus) {
    lines.push(`Todavía tengo preguntas sobre ${coverageAreaLabel(focus).toLowerCase()}.`);
  }

  return lines;
}

export function hasProcessedKnowledge(
  knowledge: WorkspaceKnowledge | null | undefined,
): boolean {
  const ensured = ensureWorkspaceKnowledge(knowledge);
  return ensured.assets.some((a) => a.status === "processed");
}
