import type { RetrievalItem, RetrievalItemKind, RetrievalPack } from "@/lib/ai/retrieval";
import type { Question } from "@/types";

/**
 * Mission D — one adaptive follow-up, phrased in Spanish, grounded in the
 * same `RetrievalPack` Mission C already builds next to the current
 * question (`RETRIEVAL_PACK.md`). This module adds nothing new to fetch or
 * store: it reads the pack the guided interview already has in memory and
 * turns its single strongest item into one natural consultant sentence —
 * "building on what you just told us" instead of a fixed questionnaire.
 *
 * Kind priority mirrors how a senior consultant actually follows up:
 * 1. `answer`   — what the client just said (short-term memory, Mission C's
 *                 own "unconditional on the query" tier) is the most natural
 *                 thing to build the next question on.
 * 2. `readiness_gap` — a capability gap the Readiness Engine already ranked
 *                 as worth closing (Mission A/G).
 * 3. `knowledge_entity` — a graph entity the query actually matched
 *                 (Mission B links feed these summaries).
 * 4. `document_chunk` — a matching line from something the client uploaded.
 *
 * Never invents a citation: returns `null` whenever the pack has nothing to
 * point at, exactly like `EvidenceChips` returns nothing for an empty pack.
 */
export interface AdaptiveFollowUp {
  /** The single `RetrievalPack` item this follow-up is grounded in. */
  item: RetrievalItem;
  /** One Spanish sentence citing that item, meant to sit above the question. */
  citation: string;
}

const CITATION_KIND_PRIORITY: RetrievalItemKind[] = [
  "answer",
  "readiness_gap",
  "knowledge_entity",
  "document_chunk",
];

const MAX_QUOTE_LENGTH = 140;

function quote(statement: string): string {
  const trimmed = statement.trim();
  if (trimmed.length <= MAX_QUOTE_LENGTH) return trimmed;
  return `${trimmed.slice(0, MAX_QUOTE_LENGTH).trimEnd()}…`;
}

function citationSentence(item: RetrievalItem): string {
  switch (item.kind) {
    case "answer":
      return `Retomando lo que nos contó — "${quote(item.statement)}" — profundicemos un poco más.`;
    case "readiness_gap":
      return `Seguimos con una brecha abierta: ${quote(item.statement)}`;
    case "knowledge_entity":
      return `Ya tenemos registrado ${item.label} en el mapa de conocimiento — conviene entender mejor cómo encaja.`;
    case "document_chunk":
      return `Un documento que compartió menciona: "${quote(item.statement)}" — vale la pena confirmarlo con usted.`;
    default:
      return quote(item.statement);
  }
}

/**
 * Pick the single strongest citable item from an already-built pack and
 * phrase it as one adaptive follow-up. `question` is accepted (not read
 * today) so a future revision can require topical overlap without changing
 * every call site — see `ADAPTIVE_FOLLOWUPS.md`.
 */
export function buildAdaptiveFollowUp(
  pack: RetrievalPack | null | undefined,
  question: Question | null | undefined,
): AdaptiveFollowUp | null {
  if (!pack || !question || pack.items.length === 0) return null;

  for (const kind of CITATION_KIND_PRIORITY) {
    const item = pack.items.find(
      (candidate) => candidate.kind === kind && candidate.statement.trim().length > 0,
    );
    if (item) {
      return { item, citation: citationSentence(item) };
    }
  }

  return null;
}
