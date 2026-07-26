import type {
  ConversationMemory,
  DiscoveryDimension,
  DimensionStatus,
} from "@/types";
import {
  DEPARTMENT_BALANCE_LIBRARY,
  EXECUTIVE_LIBRARY,
  OPERATIONAL_LIBRARY,
  enrichCandidate,
  type LibraryQuestion,
  type ThinkingMode,
} from "./question-library";

export interface TopicSelection {
  /** Preferred dimensions ordered by evidence starvation. */
  starvedDimensions: DiscoveryDimension[];
  thinkingMode: ThinkingMode;
  /** Human-readable focus for planner diagnostics. */
  focusReason: string;
}

/**
 * Infer executive vs operational lens from evidence density.
 * Founder/owner language and decision/cash facts → executive.
 * Handoffs, tools, weekly friction → operational.
 */
export function inferThinkingMode(memory: ConversationMemory): ThinkingMode {
  const blob = [
    ...memory.knownFacts.map((f) => f.statement),
    memory.summary.belief,
    ...memory.painPoints.map((p) => p.description),
  ]
    .join("\n")
    .toLowerCase();

  const executiveHits =
    (blob.match(
      /director|dueñ|founder|owner|decisi[oó]n|efectivo|margen|p&l|junta|estrateg/gi,
    )?.length ?? 0) +
    (memory.summary.revenueStage ? 1 : 0);

  const operationalHits =
    (blob.match(
      /pedido|aprobaci[oó]n|excel|whatsapp|papel|turno|operari|almac[eé]n|entrega|handoff/gi,
    )?.length ?? 0) + memory.summary.currentSoftware.length;

  if (executiveHits >= operationalHits + 2) return "executive";
  if (operationalHits >= executiveHits + 2) return "operational";
  return "balanced";
}

function applicableDimensions(memory: ConversationMemory): DimensionStatus[] {
  return memory.score.dimensions.filter((d) => d.applicable !== false);
}

/**
 * Department balancing — avoid interviewing one function to death
 * while finance / team / customers stay unknown.
 */
export function starvedDimensions(
  memory: ConversationMemory,
): DiscoveryDimension[] {
  return applicableDimensions(memory)
    .slice()
    .sort((a, b) => {
      const coverBias = Number(a.covered) - Number(b.covered);
      if (coverBias !== 0) return coverBias;
      return a.confidence - b.confidence;
    })
    .map((d) => d.id);
}

export function selectTopicFocus(memory: ConversationMemory): TopicSelection {
  const starved = starvedDimensions(memory);
  const thinkingMode = inferThinkingMode(memory);
  const top = starved[0];
  const label =
    memory.score.dimensions.find((d) => d.id === top)?.label ?? top ?? "negocio";

  return {
    starvedDimensions: starved,
    thinkingMode,
    focusReason: `Mayor vacío de evidencia: ${label}. Modo: ${thinkingMode}.`,
  };
}

/**
 * Candidate questions that rebalance departments or match thinking mode.
 */
export function generateTopicQuestions(
  memory: ConversationMemory,
): LibraryQuestion[] {
  const asked = new Set(memory.askedQuestionKeys);
  const focus = selectTopicFocus(memory);
  const uncovered = new Set(
    applicableDimensions(memory)
      .filter((d) => !d.covered || d.confidence < 50)
      .map((d) => d.id),
  );

  const balance = DEPARTMENT_BALANCE_LIBRARY.filter(
    (item) =>
      !asked.has(item.key) &&
      uncovered.has(item.dimension) &&
      focus.starvedDimensions.indexOf(item.dimension) <= 3,
  );

  const modePool =
    focus.thinkingMode === "executive"
      ? EXECUTIVE_LIBRARY
      : focus.thinkingMode === "operational"
        ? OPERATIONAL_LIBRARY
        : [...EXECUTIVE_LIBRARY, ...OPERATIONAL_LIBRARY];

  const modeQuestions = modePool.filter((item) => {
    if (asked.has(item.key)) return false;
    const dim = memory.score.dimensions.find((d) => d.id === item.dimension);
    if (dim?.applicable === false) return false;
    // Prefer mode questions on weak dimensions.
    return !dim?.covered || (dim?.confidence ?? 0) < 65;
  });

  return [...balance, ...modeQuestions].map((item) =>
    enrichCandidate(item, {
      reason: `${item.reason} ${focus.focusReason}`,
    }),
  );
}

/** Soft score boost when a candidate hits a starved dimension. */
export function departmentBalanceBoost(
  memory: ConversationMemory,
  dimension: DiscoveryDimension,
): number {
  const order = starvedDimensions(memory);
  const index = order.indexOf(dimension);
  if (index < 0) return 0;
  if (index === 0) return 18;
  if (index === 1) return 12;
  if (index === 2) return 7;
  return 2;
}

/** Soft score boost when question thinking mode matches inferred mode. */
export function thinkingModeBoost(
  memory: ConversationMemory,
  question: LibraryQuestion,
): number {
  const mode = inferThinkingMode(memory);
  if (question.thinkingMode === mode) return 8;
  if (question.thinkingMode === "balanced" || mode === "balanced") return 3;
  return 0;
}
