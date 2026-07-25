import type {
  ConversationMemory,
  KnowledgeReasoningContext,
} from "@/types";
import { emptyConsultingIntelligence } from "@/lib/consulting";
import { createId, nowIso } from "@/lib/utils";

/**
 * Soft bridge into reasoning — extends ConversationMemory with knowledge evidence.
 * Does not modify lib/reasoning/think.ts. Interview starts already knowledge-aware.
 */
export function mergeKnowledgeIntoMemory(
  memory: ConversationMemory,
  context: KnowledgeReasoningContext,
): ConversationMemory {
  if (context.documentCount === 0) return memory;

  const knownFromKnowledge = context.themes.slice(0, 6).map((theme, index) => ({
    id: createId("fact"),
    key: `knowledge_theme_${index}`,
    statement: theme,
    evidence: ["Knowledge Center"],
    confidence: 0.8,
    createdAt: nowIso(),
  }));

  const existingKeys = new Set(memory.knownFacts.map((f) => f.statement.toLowerCase()));
  const mergedFacts = [
    ...memory.knownFacts,
    ...knownFromKnowledge.filter(
      (f) => !existingKeys.has(f.statement.toLowerCase()),
    ),
  ];

  const unknownLabels = new Set(
    memory.unknownFacts.map((u) => u.label.toLowerCase()),
  );
  const knowledgeUnknowns = context.unknownAreas
    .filter((area) => !unknownLabels.has(area.toLowerCase()))
    .map((area, index) => ({
      id: createId("unknown"),
      key: `knowledge_unknown_${index}`,
      label: area,
      priority: 88 - index,
      dimension: mapAreaToDimension(area),
      reason: "Low coverage in Knowledge Center — confirm in interview.",
    }));

  const stillNeed = Array.from(
    new Set([...memory.score.stillNeed, ...context.unknownAreas]),
  );

  const nextMemory: ConversationMemory = {
    ...memory,
    knownFacts: mergedFacts,
    unknownFacts: [...memory.unknownFacts, ...knowledgeUnknowns],
    questionsRemaining: [
      ...memory.questionsRemaining,
      ...knowledgeUnknowns,
    ],
    summary: {
      ...memory.summary,
      painPoints: Array.from(
        new Set([...memory.summary.painPoints, ...context.themes.slice(0, 4)]),
      ),
      missingInformation: stillNeed,
      belief:
        context.documentCount > 0
          ? `${memory.summary.belief} · Knowledge reviewed`
          : memory.summary.belief,
    },
    whiteboard: {
      ...memory.whiteboard,
      painPoints: Array.from(
        new Set([
          ...memory.whiteboard.painPoints,
          ...context.themes.slice(0, 4),
        ]),
      ),
      facts: memory.whiteboard.facts ?? [],
      hypotheses: memory.whiteboard.hypotheses ?? [],
      risks: memory.whiteboard.risks ?? [],
      unknowns: memory.whiteboard.unknowns ?? [],
      assumptions: memory.whiteboard.assumptions ?? [],
      contradictions: memory.whiteboard.contradictions ?? [],
      ideas: memory.whiteboard.ideas ?? [],
      opportunities: memory.whiteboard.opportunities ?? [],
    },
    score: {
      ...memory.score,
      stillNeed,
    },
    consulting: memory.consulting ?? emptyConsultingIntelligence(),
  };

  return nextMemory;
}

function mapAreaToDimension(
  area: string,
): ConversationMemory["unknownFacts"][number]["dimension"] {
  const normalized = area.toLowerCase();
  if (normalized.includes("customer")) return "customers";
  if (normalized.includes("sales")) return "sales";
  if (normalized.includes("finance")) return "finance";
  if (normalized.includes("hr") || normalized.includes("team")) return "team";
  return "operations";
}

/** Future seam: think() may accept this context explicitly. */
export interface ReasoningInputs {
  conversation: unknown;
  knowledge: KnowledgeReasoningContext | null;
  memory: ConversationMemory;
}
