import type {
  ConsultingIntelligence,
  ConversationMemory,
  WhiteboardState,
} from "@/types";

/**
 * Expand Living Whiteboard with consulting layers.
 * Keeps existing business-model fields; adds consulting intelligence.
 */
export function syncConsultingWhiteboard(
  base: WhiteboardState,
  memory: ConversationMemory,
  consulting: ConsultingIntelligence,
): WhiteboardState {
  return {
    ...base,
    facts: memory.knownFacts.map((f) => f.statement).slice(0, 8),
    hypotheses: memory.hypotheses
      .filter((h) => h.status === "active")
      .map((h) => h.statement)
      .slice(0, 6),
    risks: consulting.risks
      .slice(0, 6)
      .map((r) => `${r.title} (${r.severity})`),
    unknowns: [
      ...memory.score.stillNeed,
      ...memory.unknownFacts.map((u) => u.label),
    ].slice(0, 8),
    assumptions: memory.assumptions.map((a) => a.statement).slice(0, 6),
    contradictions: consulting.contradictions
      .map((c) => c.statement)
      .slice(0, 5),
    ideas: memory.improvementIdeas.map((i) => i.title).slice(0, 6),
    opportunities: consulting.opportunities
      .slice(0, 6)
      .map((o) => `${o.title} · ${o.horizon}`),
  };
}

export function emptyConsultingWhiteboardFields(): Pick<
  WhiteboardState,
  | "facts"
  | "hypotheses"
  | "risks"
  | "unknowns"
  | "assumptions"
  | "contradictions"
  | "ideas"
  | "opportunities"
> {
  return {
    facts: [],
    hypotheses: [],
    risks: [],
    unknowns: [],
    assumptions: [],
    contradictions: [],
    ideas: [],
    opportunities: [],
  };
}
