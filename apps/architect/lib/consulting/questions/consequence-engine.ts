import type { ConversationMemory } from "@/types";
import {
  CONSEQUENCE_LIBRARY,
  enrichCandidate,
  type LibraryQuestion,
} from "./question-library";

export type InformalTool = "excel" | "whatsapp" | "paper";

const TOOL_PATTERNS: Record<InformalTool, RegExp> = {
  excel: /excel|spreadsheet|hoja[s]?\s+de\s+c[aá]lculo/i,
  whatsapp: /whats?\s*app/i,
  paper: /\bpaper\b|\bpapel\b|forms?\s+on\s+paper|formularios?\s+en\s+papel/i,
};

/**
 * Detect informal / load-bearing tools already in evidence.
 * Prefer WHY / ownership / risk over generic software inventory.
 */
export function detectInformalTools(memory: ConversationMemory): InformalTool[] {
  const blob = buildEvidenceBlob(memory);
  const software = memory.summary.currentSoftware.join(" ");
  const text = `${blob}\n${software}`;

  return (Object.keys(TOOL_PATTERNS) as InformalTool[]).filter((tool) =>
    TOOL_PATTERNS[tool].test(text),
  );
}

export function buildEvidenceBlob(memory: ConversationMemory): string {
  return [
    ...memory.knownFacts.map((f) => f.statement),
    ...memory.painPoints.map((p) => `${p.title} ${p.description}`),
    ...memory.hypotheses.map((h) => h.statement),
    ...memory.assumptions.map((a) => a.statement),
    ...memory.whiteboard.facts,
    ...memory.whiteboard.risks,
    ...(memory.consulting?.risks ?? []).map((r) => r.title),
  ].join("\n");
}

/**
 * Emit consequence-first questions when Excel / WhatsApp / Paper appear.
 * These outrank generic “what software do you use?” catalog items.
 */
export function generateConsequenceQuestions(
  memory: ConversationMemory,
): LibraryQuestion[] {
  const asked = new Set(memory.askedQuestionKeys);
  const tools = detectInformalTools(memory);
  if (tools.length === 0) return [];

  return CONSEQUENCE_LIBRARY.filter((item) => {
    if (asked.has(item.key)) return false;
    const triggers = item.triggers ?? [];
    return triggers.some((t) => t === "excel" || t === "whatsapp" || t === "paper")
      ? triggers.some((t) => tools.includes(t as InformalTool))
      : false;
  }).map((item) =>
    enrichCandidate(item, {
      reason: `${item.reason} Señal detectada: ${tools.join(", ")}.`,
    }),
  );
}

/**
 * When informal tools are already known, generic software inventory
 * is a low-value next question — demote or suppress it.
 */
export function shouldSuppressSoftwareInventory(
  memory: ConversationMemory,
): boolean {
  return (
    detectInformalTools(memory).length > 0 ||
    memory.summary.currentSoftware.length > 0
  );
}

/** Keys that are inventory-style vs consequence-style for the same trigger. */
const INVENTORY_FOLLOW_UP_KEYS = new Set([
  "excel_how_many",
  "excel_editors",
  "excel_versions",
  "wa_numbers",
  "wa_search",
  "current_software",
  "information_storage",
]);

/**
 * Re-score queued follow-ups: boost ownership/risk, soft-demote inventory counts.
 */
export function applyConsequenceBias(
  candidate: LibraryQuestion,
  memory: ConversationMemory,
): LibraryQuestion {
  const tools = detectInformalTools(memory);
  if (tools.length === 0) return candidate;

  if (candidate.intent === "consequence" || candidate.followUpOf) {
    const isInventory = INVENTORY_FOLLOW_UP_KEYS.has(candidate.key);
    const isWhy =
      candidate.intent === "consequence" ||
      /why|por qu[eé]|ownership|risk|deleted|departure|accountability/i.test(
        `${candidate.key} ${candidate.prompt}`,
      );

    if (isWhy) {
      return {
        ...candidate,
        priority: Math.min(100, candidate.priority + 6),
        businessValue:
          candidate.businessValue +
          " (prioridad: consecuencia de negocio sobre inventario).",
      };
    }

    if (isInventory) {
      return {
        ...candidate,
        priority: Math.max(50, candidate.priority - 12),
        reason:
          candidate.reason +
          " Inventario útil después de entender el porqué.",
      };
    }
  }

  if (
    shouldSuppressSoftwareInventory(memory) &&
    (candidate.key === "current_software" ||
      candidate.key === "information_storage")
  ) {
    return {
      ...candidate,
      priority: Math.max(40, candidate.priority - 25),
      reason:
        "Ya hay señales de herramientas; el inventario genérico aporta poco ahora.",
      estimatedImpact: "low",
      confidenceGain: Math.min(candidate.confidenceGain, 4),
    };
  }

  return candidate;
}
