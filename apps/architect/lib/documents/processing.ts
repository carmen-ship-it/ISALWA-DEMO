/**
 * AI Document Processing Pipeline — queue contracts and stage lifecycle.
 *
 * This is the Real Document Uploads queue, grown up. That mission shipped
 * the seams (`DocumentProcessingJob`, an OCR contract and an embeddings
 * contract that both threw "not implemented"). This one fills them in:
 * every step below either runs for real today or reports, per document, the
 * concrete reason it could not — a missing API key, an unreadable binary
 * format, an empty file. Nothing throws to signal "unbuilt" any more,
 * because nothing here is unbuilt.
 *
 * The honesty convention is unchanged, only more precise. A step is:
 *   `completed` it ran and did the work
 *   `skipped`   it did not apply, or a prerequisite (a key, some text) was
 *               absent — always with the reason attached
 *   `failed`    it applied, was configured, and did not succeed
 *
 * Orchestration lives in `pipeline.ts`; this module owns the shapes.
 */

import type { KnowledgeAsset } from "@/types";
import {
  DEFAULT_EMBEDDING_DIMENSIONS,
  DEFAULT_EMBEDDING_MODEL,
  embedDocumentChunks,
  type EmbeddingBatchOutcome,
} from "./embeddings";
import { runDocumentOcr, type OcrOutcome } from "./ocr";

/**
 * Coarse per-document state, unchanged from Real Document Uploads so the
 * upload list and `KnowledgeAsset.status` keep the same vocabulary.
 */
export type DocumentProcessingStage = "queued" | "analyzing" | "completed" | "failed";

/**
 * The ten steps, in execution order.
 *
 * One ordering note: vector storage runs *after* the knowledge merge, not
 * before it. Chunk records are keyed by `KnowledgeAsset.id`, and that id is
 * assigned by the merge — writing chunks first would mean inventing a key
 * and reconciling it afterwards. Chunking and embedding, which need only
 * text, still happen before the merge.
 */
export type DocumentPipelineStepId =
  | "ocr"
  | "extract_text"
  | "chunk"
  | "embed"
  | "detect"
  | "knowledge_graph"
  | "store_vectors"
  | "readiness"
  | "insights"
  | "recommendations";

export const DOCUMENT_PIPELINE_STEP_IDS: readonly DocumentPipelineStepId[] = [
  "ocr",
  "extract_text",
  "chunk",
  "embed",
  "detect",
  "knowledge_graph",
  "store_vectors",
  "readiness",
  "insights",
  "recommendations",
] as const;

export type DocumentPipelineStepStatus =
  | "pending"
  | "running"
  | "completed"
  | "skipped"
  | "failed";

/**
 * One step's outcome. `detailKey` and `detailParams` are an i18n key suffix
 * and its interpolation values rather than a sentence: this module is
 * library code and must never decide what language the client reads. The UI
 * resolves `documentPipeline.detail.<detailKey>`.
 *
 * `note` is the opposite — a developer diagnostic (an HTTP status, a missing
 * env var) that is logged and never rendered.
 */
export interface DocumentPipelineStep {
  id: DocumentPipelineStepId;
  status: DocumentPipelineStepStatus;
  detailKey: string | null;
  detailParams: Record<string, string | number> | null;
  note: string | null;
  startedAt: string | null;
  finishedAt: string | null;
}

export function createPipelineSteps(): DocumentPipelineStep[] {
  return DOCUMENT_PIPELINE_STEP_IDS.map((id) => ({
    id,
    status: "pending" as DocumentPipelineStepStatus,
    detailKey: null,
    detailParams: null,
    note: null,
    startedAt: null,
    finishedAt: null,
  }));
}

/**
 * One entry per uploaded document. The queue still runs in-process — the
 * browser awaits each step and persists the workspace after the merge — but
 * the record is deliberately worker-ready: a queue table or an edge function
 * can adopt this shape as-is rather than forcing a redesign.
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
  steps: DocumentPipelineStep[];
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
    steps: createPipelineSteps(),
  };
}

/**
 * Optical character recognition. Was a throwing stub; now delegates to the
 * server route, which performs real recognition when a vision key is
 * configured and answers "unavailable" with a reason when it is not.
 */
export interface OcrExtractionContract {
  id: "ocr";
  /** "designed" once configured; "requires_key" describes the dependency. */
  status: "designed" | "requires_key";
  extract(file: File): Promise<OcrOutcome>;
}

export const OCR_EXTRACTION_CONTRACT: OcrExtractionContract = {
  id: "ocr",
  status: "requires_key",
  extract: runDocumentOcr,
};

export type EmbeddingProviderId = "text_embedding_v1";

/**
 * Embeddings for semantic search over uploaded documents. Was a throwing
 * stub; now a working batch client. When no key is configured the provider
 * returns `status: "pending"` with a reason — chunks are still stored, just
 * without vectors, so adding a key later backfills rather than reprocesses.
 */
export interface EmbeddingProviderContract {
  id: EmbeddingProviderId;
  status: "designed" | "requires_key";
  model: string;
  dimensions: number;
  embed(texts: string[]): Promise<EmbeddingBatchOutcome>;
}

export const EMBEDDING_PROVIDERS: readonly EmbeddingProviderContract[] = [
  {
    id: "text_embedding_v1",
    status: "requires_key",
    model: DEFAULT_EMBEDDING_MODEL,
    dimensions: DEFAULT_EMBEDDING_DIMENSIONS,
    embed: (texts) => embedDocumentChunks(texts),
  },
];

/**
 * `designed`      runs today with no external dependency
 * `requires_key`  implemented, runs when an API key is configured
 * `planned`       not implemented
 */
export type DocumentPipelineStageStatus = "designed" | "requires_key" | "planned";

export interface DocumentPipelineStageInfo {
  id:
    | "upload"
    | "storage"
    | "queue"
    | DocumentPipelineStepId;
  title: string;
  description: string;
  status: DocumentPipelineStageStatus;
}

/**
 * The per-document pipeline, end to end. Finer-grained than
 * `KNOWLEDGE_PIPELINE` (`lib/knowledge/pipeline.ts`), which stays the
 * workspace-level view shown in the Knowledge Center — this is additive and
 * does not replace or reorder it.
 *
 * Titles and descriptions here are developer-facing documentation of the
 * architecture. Client-facing copy lives in the i18n dictionaries.
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
    description: "Register the document for processing and start it automatically — no manual trigger.",
    status: "designed",
  },
  {
    id: "ocr",
    title: "OCR",
    description:
      "Recognize text inside images and scans via an OpenAI-compatible vision model. Requires ARCHITECT_OCR_API_KEY / ARCHITECT_LLM_API_KEY / OPENAI_API_KEY.",
    status: "requires_key",
  },
  {
    id: "extract_text",
    title: "Text extraction",
    description:
      "Read plain text, Markdown and CSV in the browser. PDF/Office binaries keep filename/type classification until a parser dependency is added.",
    status: "designed",
  },
  {
    id: "chunk",
    title: "Chunking",
    description: "Paragraph-aware slicing with overlap, offsets preserved for citation.",
    status: "designed",
  },
  {
    id: "embed",
    title: "Embeddings",
    description:
      "Vector embeddings for semantic search. Requires ARCHITECT_EMBEDDINGS_API_KEY / ARCHITECT_LLM_API_KEY / OPENAI_API_KEY; without one, chunks are stored as pending.",
    status: "requires_key",
  },
  {
    id: "detect",
    title: "Business detection",
    description:
      "Twelve deterministic detectors: people, systems, departments, vendors, software, processes, pain points, risks, KPIs, approvals, handoffs, policies.",
    status: "designed",
  },
  {
    id: "knowledge_graph",
    title: "Knowledge graph",
    description:
      "Merge entities, relationships, rules, pains and evidence into the existing Knowledge Engine and Company Memory via lib/intake.",
    status: "designed",
  },
  {
    id: "store_vectors",
    title: "Vector storage",
    description:
      "Persist chunks (and vectors, within the in-workspace budget) on WorkspaceKnowledge.chunks, keyed by the asset id the merge assigned.",
    status: "designed",
  },
  {
    id: "readiness",
    title: "Confidence & readiness",
    description:
      "Recompute published understanding through the existing Discovery Score using the readiness evidence bridge.",
    status: "designed",
  },
  {
    id: "insights",
    title: "Insights",
    description: "Re-derive executive insights and report what is newly discoverable.",
    status: "designed",
  },
  {
    id: "recommendations",
    title: "Recommendations",
    description: "Re-derive explained recommendations from the updated evidence base.",
    status: "designed",
  },
];

/** Convenience for surfaces that only want to name the asset being worked on. */
export function describeJobTarget(asset: KnowledgeAsset): string {
  return asset.title;
}
