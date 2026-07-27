/**
 * AI Document Processing Pipeline — stage 4, embeddings.
 *
 * Replaces the throwing `EMBEDDING_PROVIDERS` stub from the Real Document
 * Uploads mission with a working client. Same rule as OCR: the key lives on
 * the server, so the browser posts chunk text to
 * `/api/documents/embeddings` and gets back either vectors or an honest
 * "no provider configured".
 *
 * When no provider answers, chunks are still stored (stage 5) with
 * `embeddingStatus: "pending"`. Nothing pretends to be searchable that is
 * not, and nothing has to be re-extracted when a key is added later.
 *
 * Configure with `ARCHITECT_EMBEDDINGS_API_KEY` (or the shared
 * `ARCHITECT_LLM_API_KEY` / `OPENAI_API_KEY`), optionally
 * `ARCHITECT_EMBEDDINGS_MODEL` and `ARCHITECT_LLM_BASE_URL`.
 */

export const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
export const DEFAULT_EMBEDDING_DIMENSIONS = 1536;

/** One request per batch; larger documents are sent in several batches. */
export const EMBEDDING_BATCH_SIZE = 32;

export type EmbeddingBatchStatus = "ready" | "pending" | "failed";

export interface EmbeddingBatchOutcome {
  status: EmbeddingBatchStatus;
  model: string;
  dimensions: number | null;
  /** Aligned 1:1 with the input texts. Null unless `status === "ready"`. */
  vectors: number[][] | null;
  /** Developer-facing explanation whenever `status !== "ready"`. */
  reason: string | null;
}

interface EmbeddingApiResponse {
  available?: boolean;
  model?: string;
  dimensions?: number;
  vectors?: number[][];
  reason?: string;
}

/**
 * Vectors are persisted inside the workspace record, so full float precision
 * would multiply its size for no retrieval benefit. Four decimals keeps
 * cosine similarity stable while roughly halving the stored payload.
 */
export function roundVector(vector: number[]): number[] {
  return vector.map((value) => Math.round(value * 10_000) / 10_000);
}

async function embedBatch(texts: string[]): Promise<EmbeddingBatchOutcome> {
  const response = await fetch("/api/documents/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inputs: texts }),
  });

  if (!response.ok) {
    return {
      status: "failed",
      model: DEFAULT_EMBEDDING_MODEL,
      dimensions: null,
      vectors: null,
      reason: `Embeddings endpoint returned ${response.status}.`,
    };
  }

  const payload = (await response.json()) as EmbeddingApiResponse;
  const model = payload.model ?? DEFAULT_EMBEDDING_MODEL;

  if (payload.available === false) {
    return {
      status: "pending",
      model,
      dimensions: payload.dimensions ?? null,
      vectors: null,
      reason:
        payload.reason ??
        "No embeddings provider is configured in this environment — chunks are stored without vectors.",
    };
  }

  const vectors = payload.vectors;
  if (!Array.isArray(vectors) || vectors.length !== texts.length) {
    return {
      status: "failed",
      model,
      dimensions: payload.dimensions ?? null,
      vectors: null,
      reason: "The provider returned a different number of vectors than chunks sent.",
    };
  }

  return {
    status: "ready",
    model,
    dimensions: payload.dimensions ?? vectors[0]?.length ?? null,
    vectors: vectors.map(roundVector),
    reason: null,
  };
}

/**
 * Embed every chunk of one document. Batches are sequential on purpose:
 * this runs while the client watches a progress list, and a burst of
 * parallel requests would only trade a rate-limit error for a small speedup.
 */
export async function embedDocumentChunks(
  texts: string[],
  onBatch?: (completed: number, total: number) => void,
): Promise<EmbeddingBatchOutcome> {
  if (texts.length === 0) {
    return {
      status: "ready",
      model: DEFAULT_EMBEDDING_MODEL,
      dimensions: null,
      vectors: [],
      reason: null,
    };
  }

  const collected: number[][] = [];
  let model = DEFAULT_EMBEDDING_MODEL;
  let dimensions: number | null = null;

  for (let offset = 0; offset < texts.length; offset += EMBEDDING_BATCH_SIZE) {
    const batch = texts.slice(offset, offset + EMBEDDING_BATCH_SIZE);
    let outcome: EmbeddingBatchOutcome;
    try {
      outcome = await embedBatch(batch);
    } catch (error) {
      return {
        status: "failed",
        model,
        dimensions,
        vectors: null,
        reason: error instanceof Error ? error.message : "Unknown embeddings error.",
      };
    }

    // A provider that is unavailable or failing will not become available
    // mid-document — report the whole document consistently instead of
    // leaving half the chunks searchable and half not.
    if (outcome.status !== "ready" || !outcome.vectors) {
      return { ...outcome, vectors: null };
    }

    collected.push(...outcome.vectors);
    model = outcome.model;
    dimensions = outcome.dimensions;
    onBatch?.(Math.min(offset + batch.length, texts.length), texts.length);
  }

  return { status: "ready", model, dimensions, vectors: collected, reason: null };
}
