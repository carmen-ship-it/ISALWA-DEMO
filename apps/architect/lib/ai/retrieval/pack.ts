/**
 * RetrievalPack builder (Mission C).
 *
 * Two variants share one shape:
 *
 *  - `buildRetrievalPackSync` never awaits anything. It is what the
 *    Consulting Intelligence cycle (synchronous by contract — see
 *    `lib/consulting-intelligence/cycle.ts`) and the guided-discovery UI (a
 *    client component, which cannot reach the server-only embeddings API key
 *    in `lib/ai/config.ts`) actually call today. Its document-chunk tier
 *    ranks chunks by keyword overlap against the query — honest, zero
 *    network calls, always available.
 *  - `buildRetrievalPack` is the same pack, upgraded: it tries
 *    `retrieveRelevantChunks` (real embeddings through the central AI
 *    provider, see `lib/ai/retrieval/chunks.ts`) for the document-chunk tier
 *    first, and only falls back to the keyword ranker when no provider is
 *    configured or the call fails — a pack must never throw because
 *    embeddings are unavailable, the same rule the chunk store itself
 *    follows (`lib/documents/vectors.ts`). Only safe to call from a server
 *    context (an API route or server action); see `RETRIEVAL_PACK.md` for
 *    the upgrade path once one exists in front of the two call sites above.
 *
 * Every item is capped and carries provenance (`documentId` / `meetingId` /
 * `factKey` / `entityId`) back to the record it came from.
 */

import { nowIso } from "@/lib/utils";
import type { ReadinessLearningItem } from "@/lib/readiness";
import type {
  ConversationMemory,
  KnowledgeChunkRecord,
  KnowledgeEntity,
  KnowledgeEntityKind,
  WorkspaceKnowledge,
} from "@/types";
import { retrieveRelevantChunks } from "./chunks";
import type { RetrievalItem, RetrievalPack, RetrievalProvenance } from "./types";

export type { RetrievalItem, RetrievalPack, RetrievalProvenance } from "./types";

/** Total items a pack ever carries — a workspace's evidence trail, not a dump. */
export const MAX_RETRIEVAL_ITEMS = 8;

const MAX_PER_KIND = {
  answer: 3,
  document_chunk: 4,
  knowledge_entity: 3,
  readiness_gap: 2,
} as const;

const KNOWLEDGE_ENTITY_KIND_LABEL_ES: Record<KnowledgeEntityKind, string> = {
  Company: "empresa",
  Person: "persona",
  Department: "departamento",
  Customer: "cliente",
  Supplier: "proveedor",
  Product: "producto",
  Workflow: "proceso",
  Location: "ubicación",
  System: "sistema",
  PainPoint: "punto de dolor",
  Document: "documento",
  Meeting: "reunión",
};

const STOPWORDS = new Set([
  "para", "por", "con", "los", "las", "una", "uno", "del", "que", "como",
  "esta", "este", "esto", "sus", "todo", "toda", "todos", "todas", "pero",
  "mas", "muy", "hay", "son", "fue", "ser", "cada", "entre", "sobre",
  "cuando", "donde", "quien", "cual", "cuales", "the", "and", "for", "with",
  "that", "this", "from", "have", "has", "are", "was", "were", "cómo",
]);

function normalizeText(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function tokenize(text: string): Set<string> {
  const tokens = normalizeText(text)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));
  return new Set(tokens);
}

/** Keyword-overlap relevance, 0-100 — same scale as every strength figure elsewhere. */
function overlapScore(queryTerms: Set<string>, text: string): number {
  if (queryTerms.size === 0 || !text) return 0;
  const terms = tokenize(text);
  if (terms.size === 0) return 0;
  let hits = 0;
  for (const term of queryTerms) {
    if (terms.has(term)) hits += 1;
  }
  return Math.round((hits / queryTerms.size) * 100);
}

function emptyProvenance(): RetrievalProvenance {
  return {
    documentId: null,
    documentTitle: null,
    meetingId: null,
    factKey: null,
    entityId: null,
  };
}

/** Join whatever short context strings are available into one query — empty parts drop out. */
export function buildRetrievalQuery(
  ...parts: Array<string | null | undefined>
): string {
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" · ");
}

export interface BuildRetrievalPackInput {
  query: string;
  memory: ConversationMemory | null;
  knowledge: WorkspaceKnowledge | null;
  /** The Readiness Engine's own ranked list — never re-ranked here. */
  gaps?: ReadinessLearningItem[];
  /** Tags "answer" items to the meeting/session they were captured in. */
  meetingId?: string | null;
  limit?: number;
}

function collectAnswerItems(
  memory: ConversationMemory | null,
  meetingId: string | null,
  limit: number,
): RetrievalItem[] {
  if (!memory) return [];
  return [...memory.knownFacts]
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
    .slice(0, limit)
    .map(
      (fact): RetrievalItem => ({
        id: `retrieval_answer_${fact.id}`,
        kind: "answer",
        topic: fact.dimension ?? null,
        label: "su respuesta",
        statement: fact.statement,
        strength: Math.round(Math.max(0, Math.min(1, fact.confidence)) * 100),
        provenance: { ...emptyProvenance(), factKey: fact.key, meetingId },
      }),
    );
}

function assetTitleFor(
  knowledge: WorkspaceKnowledge | null,
  assetId: string,
): string | null {
  return knowledge?.assets.find((asset) => asset.id === assetId)?.title ?? null;
}

/**
 * A chunk's evidence label. A meeting transcript is not a document to the
 * client, and calling it one in retrieved evidence would misstate where the
 * knowledge came from — same honesty rule as everywhere else provenance is
 * shown (Mission 22 — Meeting transcription → evidence).
 */
function assetChunkLabelFor(
  knowledge: WorkspaceKnowledge | null,
  assetId: string,
  title: string | null,
): string {
  const type = knowledge?.assets.find((asset) => asset.id === assetId)?.type;
  const noun =
    type === "meeting_transcript"
      ? "reunión"
      : type === "manual_notes"
        ? "nota"
        : "documento";
  return title ? `${noun}: ${title}` : noun;
}

function toChunkItem(
  chunk: KnowledgeChunkRecord,
  strength: number,
  documentTitle: string | null,
  label: string,
): RetrievalItem {
  return {
    id: `retrieval_chunk_${chunk.id}`,
    kind: "document_chunk",
    topic: null,
    label,
    statement: chunk.text.slice(0, 320),
    strength,
    provenance: { ...emptyProvenance(), documentId: chunk.assetId, documentTitle },
  };
}

function collectChunkItemsLexical(
  knowledge: WorkspaceKnowledge | null,
  queryTerms: Set<string>,
  limit: number,
): RetrievalItem[] {
  if (!knowledge || knowledge.chunks.length === 0) return [];
  return knowledge.chunks
    .map((chunk) => ({ chunk, score: overlapScore(queryTerms, chunk.text) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => {
      const title = assetTitleFor(knowledge, entry.chunk.assetId);
      return toChunkItem(
        entry.chunk,
        entry.score,
        title,
        assetChunkLabelFor(knowledge, entry.chunk.assetId, title),
      );
    });
}

function toEntityItem(entity: KnowledgeEntity, strength: number): RetrievalItem {
  const kindLabel = KNOWLEDGE_ENTITY_KIND_LABEL_ES[entity.kind] ?? entity.kind.toLowerCase();
  return {
    id: `retrieval_entity_${entity.id}`,
    kind: "knowledge_entity",
    topic: null,
    label: `${kindLabel}: ${entity.name}`,
    statement: entity.summary ?? entity.name,
    strength,
    provenance: {
      ...emptyProvenance(),
      entityId: entity.id,
      documentId: entity.sourceAssetIds[0] ?? null,
    },
  };
}

function collectEntityItems(
  knowledge: WorkspaceKnowledge | null,
  queryTerms: Set<string>,
  limit: number,
): RetrievalItem[] {
  if (!knowledge || knowledge.entities.length === 0) return [];
  return knowledge.entities
    .map((entity) => ({
      entity,
      score: overlapScore(
        queryTerms,
        [entity.name, entity.summary ?? "", ...Object.values(entity.metadata ?? {})].join(" "),
      ),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ entity, score }) => toEntityItem(entity, score));
}

function collectGapItems(
  gaps: ReadinessLearningItem[],
  limit: number,
): RetrievalItem[] {
  return gaps.slice(0, limit).map(
    (gap): RetrievalItem => ({
      id: `retrieval_gap_${gap.id}`,
      kind: "readiness_gap",
      topic: gap.topic,
      label: `brecha: ${gap.label}`,
      statement: gap.question,
      strength: gap.state === "needs_information" ? 70 : 45,
      provenance: emptyProvenance(),
    }),
  );
}

function assemblePack(
  input: BuildRetrievalPackInput,
  chunkItems: RetrievalItem[],
  retrievalMode: "semantic" | "lexical",
): RetrievalPack {
  const meetingId = input.meetingId ?? null;
  const limit = input.limit ?? MAX_RETRIEVAL_ITEMS;
  const queryTerms = tokenize(input.query);

  const answers = collectAnswerItems(input.memory, meetingId, MAX_PER_KIND.answer);
  const entities = collectEntityItems(input.knowledge, queryTerms, MAX_PER_KIND.knowledge_entity);
  const gaps = collectGapItems(input.gaps ?? [], MAX_PER_KIND.readiness_gap);

  const candidates = [...answers, ...chunkItems, ...entities, ...gaps];
  const items = candidates.slice(0, limit);

  return {
    query: input.query,
    generatedAt: nowIso(),
    retrievalMode,
    items,
    truncated: candidates.length > items.length,
  };
}

/**
 * Synchronous pack — the one call the Consulting Intelligence cycle and the
 * guided-discovery UI actually make today (see the module doc comment for
 * why). Document chunks rank by keyword overlap, never by a network call.
 */
export function buildRetrievalPackSync(input: BuildRetrievalPackInput): RetrievalPack {
  const queryTerms = tokenize(input.query);
  const chunkItems = collectChunkItemsLexical(
    input.knowledge,
    queryTerms,
    MAX_PER_KIND.document_chunk,
  );
  return assemblePack(input, chunkItems, "lexical");
}

/**
 * Semantic-first pack — see the module doc comment for when this is safe to
 * call. Degrades to `buildRetrievalPackSync`'s keyword ranker whenever no
 * embeddings provider is configured or the provider call fails.
 */
export async function buildRetrievalPack(
  input: BuildRetrievalPackInput,
): Promise<RetrievalPack> {
  const chunks = input.knowledge?.chunks ?? [];
  if (chunks.length === 0 || !input.query.trim()) {
    return buildRetrievalPackSync(input);
  }

  try {
    const hits = await retrieveRelevantChunks(chunks, input.query, {
      limit: MAX_PER_KIND.document_chunk,
    });
    if (hits.length === 0) return buildRetrievalPackSync(input);

    const chunkItems = hits.map((hit) => {
      const title = assetTitleFor(input.knowledge, hit.chunk.assetId);
      return toChunkItem(
        hit.chunk,
        Math.round(Math.max(0, Math.min(1, hit.score)) * 100),
        title,
        assetChunkLabelFor(input.knowledge, hit.chunk.assetId, title),
      );
    });
    return assemblePack(input, chunkItems, "semantic");
  } catch {
    return buildRetrievalPackSync(input);
  }
}
