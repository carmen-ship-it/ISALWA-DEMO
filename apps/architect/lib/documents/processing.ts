/**
 * Real Document Uploads — AI processing queue architecture.
 *
 * Scope for this mission: the queue contracts, per-document stage lifecycle,
 * and OCR/embeddings seams are real and wired end to end. The actual
 * content-level work (OCR, embeddings, LLM reasoning over document content)
 * is intentionally NOT implemented — same honesty convention as
 * `KNOWLEDGE_EXTRACTION_PROVIDERS` ("designed" vs "planned"): every contract
 * below either runs today (deterministic filename/type classification,
 * reused from `lib/knowledge/intake.ts` — no duplicate logic) or throws a
 * clearly labeled "not implemented" error so nothing pretends to have read a
 * document's contents. The next mission implements the "planned" half.
 */

import type { KnowledgeAsset } from "@/types";

export type DocumentProcessingStage = "queued" | "analyzing" | "completed" | "failed";

/**
 * One entry per uploaded document. This mission runs the queue in-process
 * (the browser awaits each stage directly, persisting the resulting
 * `KnowledgeAsset.status` after each transition) — there is no background
 * worker yet. The shape is deliberately worker-ready: a future queue table /
 * edge function can adopt this record as-is instead of a redesign.
 */
export interface DocumentProcessingJob {
  id: string;
  workspaceId: string;
  assetId: string;
  fileName: string;
  stage: DocumentProcessingStage;
  queuedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  error: string | null;
}

export function createDocumentProcessingJob(
  workspaceId: string,
  assetId: string,
  fileName: string,
): DocumentProcessingJob {
  return {
    id: `job_${assetId}`,
    workspaceId,
    assetId,
    fileName,
    stage: "queued",
    queuedAt: new Date().toISOString(),
    startedAt: null,
    finishedAt: null,
    error: null,
  };
}

/** Contract only — mirrors `KnowledgeExtractionProvider.extract` (lib/knowledge/extraction.ts). */
export interface OcrExtractionContract {
  id: "ocr";
  status: "planned";
  /** Will return recognized text + per-page confidence once implemented. Never called in this mission. */
  extract(asset: KnowledgeAsset): Promise<{ text: string; confidence: number }>;
}

export const OCR_EXTRACTION_CONTRACT: OcrExtractionContract = {
  id: "ocr",
  status: "planned",
  async extract(asset) {
    void asset;
    throw new Error(
      'OCR extraction is architecture-only in this mission — "Real Document Uploads" ships storage + queue, not content reading.',
    );
  },
};

export type EmbeddingProviderId = "text_embedding_v1";

/**
 * Contract for the future embeddings step (semantic search / RAG over
 * uploaded documents). No vector store, no model call — this exists so the
 * next mission has a fixed seam to implement against instead of inventing
 * one mid-build.
 */
export interface EmbeddingProviderContract {
  id: EmbeddingProviderId;
  status: "planned";
  dimensions: number;
  embed(input: { assetId: string; text: string }): Promise<number[]>;
}

export const EMBEDDING_PROVIDERS: readonly EmbeddingProviderContract[] = [
  {
    id: "text_embedding_v1",
    status: "planned",
    dimensions: 1536,
    async embed(input) {
      void input;
      throw new Error(
        "Embedding generation is architecture-only in this mission — no vector store exists yet.",
      );
    },
  },
];

export interface DocumentPipelineStageInfo {
  id: "upload" | "storage" | "queue" | "analyze" | "ocr" | "embeddings" | "knowledge_merge";
  title: string;
  description: string;
  status: "designed" | "planned";
}

/**
 * Per-document pipeline — a finer-grained view than `KNOWLEDGE_PIPELINE`
 * (lib/knowledge/pipeline.ts), scoped to what happens to one uploaded file.
 * Additive; does not replace or reorder the existing workspace-level
 * pipeline shown in the Knowledge Center.
 */
export const DOCUMENT_PROCESSING_PIPELINE: readonly DocumentPipelineStageInfo[] = [
  {
    id: "upload",
    title: "Upload",
    description: "Receive the file from drag-and-drop or file picker, with live progress.",
    status: "designed",
  },
  {
    id: "storage",
    title: "Storage",
    description: "Persist bytes in Supabase Storage (private bucket, RLS by workspace).",
    status: "designed",
  },
  {
    id: "queue",
    title: "Queue",
    description: "Register the document for processing — Queued until analysis starts.",
    status: "designed",
  },
  {
    id: "analyze",
    title: "Analyze",
    description: "Deterministic filename/type classification — no content is read yet.",
    status: "designed",
  },
  {
    id: "ocr",
    title: "OCR",
    description: "Recognize text inside scanned documents and images.",
    status: "planned",
  },
  {
    id: "embeddings",
    title: "Embeddings",
    description: "Generate vector embeddings for semantic search across documents.",
    status: "planned",
  },
  {
    id: "knowledge_merge",
    title: "Knowledge merge",
    description: "Fold extracted evidence into the existing Knowledge Engine and Company Memory.",
    status: "designed",
  },
];
