/**
 * AI Document Processing Pipeline — stage 5, vector storage.
 *
 * The store is the workspace record itself (`knowledge.chunks`), persisted
 * through the same `CompanyMemoryStore` every other engine already uses —
 * Supabase JSONB when configured, localStorage otherwise. No second
 * database, no second persistence path.
 *
 * That choice has a real limit and it is stated rather than hidden: a
 * workspace row is not a vector database, so only the first
 * `MAX_PERSISTED_VECTOR_CHUNKS` chunks keep their vectors. Chunks past the
 * budget are still stored — text, offsets, provenance — with
 * `embeddingStatus: "skipped"` and a note saying why. The documented upgrade
 * is a pgvector table behind this same module; `searchChunks` below is
 * already the interface that would sit in front of it.
 */

import { nowIso } from "@/lib/utils";
import type { ChunkEmbeddingStatus, KnowledgeChunkRecord } from "@/types";
import type { DocumentChunk } from "./chunking";

/**
 * ~64 chunks × 1536 dimensions at four decimals is roughly 0.8MB of JSON —
 * heavy for a workspace row but survivable, and enough to make semantic
 * search real for the documents a client uploads in one session.
 */
export const MAX_PERSISTED_VECTOR_CHUNKS = 64;

/** Total chunk records kept per workspace, oldest documents evicted first. */
export const MAX_PERSISTED_CHUNKS = 600;

const OVER_BUDGET_NOTE =
  "Vector budget for in-workspace storage reached — chunk text and offsets are stored, the vector is not. A dedicated vector store (pgvector) removes this limit.";

export interface BuildChunkRecordsInput {
  workspaceId: string;
  assetId: string;
  chunks: DocumentChunk[];
  vectors: number[][] | null;
  model: string | null;
  dimensions: number | null;
  /** Why vectors are absent, when they are. */
  pendingReason: string | null;
  pendingStatus?: ChunkEmbeddingStatus;
}

/**
 * Turn chunks (+ optional vectors) into persistable records. Ids are derived
 * from the asset id and the chunk index so reprocessing the same document
 * replaces its records instead of duplicating them.
 */
export function buildChunkRecords(
  input: BuildChunkRecordsInput,
): KnowledgeChunkRecord[] {
  const createdAt = nowIso();
  const fallbackStatus: ChunkEmbeddingStatus = input.pendingStatus ?? "pending";

  return input.chunks.map((chunk, index) => {
    const vector = input.vectors?.[index] ?? null;
    const withinBudget = index < MAX_PERSISTED_VECTOR_CHUNKS;

    let embeddingStatus: ChunkEmbeddingStatus;
    let embeddingNote: string | null;
    let storedVector: number[] | null;

    if (!vector) {
      embeddingStatus = fallbackStatus;
      embeddingNote = input.pendingReason;
      storedVector = null;
    } else if (withinBudget) {
      embeddingStatus = "ready";
      embeddingNote = null;
      storedVector = vector;
    } else {
      embeddingStatus = "skipped";
      embeddingNote = OVER_BUDGET_NOTE;
      storedVector = null;
    }

    return {
      id: `${input.assetId}_chunk_${chunk.index}`,
      workspaceId: input.workspaceId,
      assetId: input.assetId,
      index: chunk.index,
      text: chunk.text,
      charCount: chunk.charCount,
      startOffset: chunk.startOffset,
      endOffset: chunk.endOffset,
      embeddingStatus,
      embeddingModel: input.model,
      embeddingDimensions: input.dimensions,
      vector: storedVector,
      embeddingNote,
      createdAt,
    } satisfies KnowledgeChunkRecord;
  });
}

/**
 * Upsert one document's chunks. Records for the same asset are replaced
 * wholesale (a reprocessed document must not leave stale slices behind);
 * everything else is preserved. When the workspace exceeds the record cap,
 * the oldest chunks are evicted first — same bounded-growth convention as
 * the intake evidence log.
 */
export function upsertChunkRecords(
  existing: KnowledgeChunkRecord[],
  incoming: KnowledgeChunkRecord[],
): KnowledgeChunkRecord[] {
  const assetIds = new Set(incoming.map((record) => record.assetId));
  const retained = existing.filter((record) => !assetIds.has(record.assetId));
  const merged = [...retained, ...incoming];

  if (merged.length <= MAX_PERSISTED_CHUNKS) return merged;
  return merged.slice(merged.length - MAX_PERSISTED_CHUNKS);
}

export interface ChunkIndexSummary {
  total: number;
  ready: number;
  pending: number;
  skipped: number;
  failed: number;
  /** Distinct documents represented in the index. */
  documents: number;
}

export function summarizeChunkIndex(
  chunks: KnowledgeChunkRecord[],
): ChunkIndexSummary {
  const count = (status: ChunkEmbeddingStatus) =>
    chunks.filter((chunk) => chunk.embeddingStatus === status).length;

  return {
    total: chunks.length,
    ready: count("ready"),
    pending: count("pending"),
    skipped: count("skipped"),
    failed: count("failed"),
    documents: new Set(chunks.map((chunk) => chunk.assetId)).size,
  };
}

export interface ChunkSearchHit {
  chunk: KnowledgeChunkRecord;
  score: number;
}

function cosineSimilarity(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < length; i += 1) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Semantic search over the chunks that actually have vectors. Chunks in any
 * other state are not "low ranked" — they are simply not searchable, and are
 * excluded so a caller can never present an unembedded chunk as a match.
 */
export function searchChunks(
  chunks: KnowledgeChunkRecord[],
  queryVector: number[],
  limit = 5,
): ChunkSearchHit[] {
  return chunks
    .filter(
      (chunk): chunk is KnowledgeChunkRecord & { vector: number[] } =>
        chunk.embeddingStatus === "ready" && Array.isArray(chunk.vector),
    )
    .map((chunk) => ({ chunk, score: cosineSimilarity(queryVector, chunk.vector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
