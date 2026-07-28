/**
 * Retrieval facade — thin on purpose.
 *
 * This wraps the existing chunk vector store (`lib/documents/vectors.ts`)
 * with an AI-aware entry point: embed a query through the central provider,
 * then rank the workspace's already-embedded chunks against it. It does not
 * introduce a second retrieval system — Mission C will deepen this (context
 * windowing, re-ranking, citations) without changing this call shape.
 */
import { ai } from "@/lib/ai";
import { searchChunks, type ChunkSearchHit } from "@/lib/documents/vectors";
import type { KnowledgeChunkRecord } from "@/types";

export { searchChunks } from "@/lib/documents/vectors";
export type { ChunkSearchHit } from "@/lib/documents/vectors";

export interface RetrieveOptions {
  limit?: number;
}

/**
 * Embed `query` and rank it against chunks that already have vectors. Chunks
 * that are pending/skipped/failed are excluded — never presented as a match.
 *
 * Throws if no embeddings provider is configured; callers that need an
 * honest "not available" response should check that first (see
 * `/api/documents/embeddings`'s `available` flag pattern).
 */
export async function retrieveRelevantChunks(
  chunks: KnowledgeChunkRecord[],
  query: string,
  options: RetrieveOptions = {},
): Promise<ChunkSearchHit[]> {
  if (!query.trim() || chunks.length === 0) return [];

  const { vectors } = await ai.embed([query]);
  const queryVector = vectors[0];
  if (!queryVector) return [];

  return searchChunks(chunks, queryVector, options.limit ?? 5);
}
