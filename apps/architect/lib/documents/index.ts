export {
  placeholderTranscriptDocument,
  DOCUMENT_KIND_LABELS,
  FUTURE_INTAKE_HOOKS,
} from "./placeholders";

export {
  DOCUMENT_STORAGE_BUCKET,
  buildDocumentStoragePath,
  getDocumentStorageProvider,
  formatFileSize,
} from "./storage";
export type {
  DocumentStorageProvider,
  StoredDocumentRef,
  UploadProgress,
} from "./storage";

export {
  createDocumentProcessingJob,
  createPipelineSteps,
  describeJobTarget,
  DOCUMENT_PIPELINE_STEP_IDS,
  DOCUMENT_PROCESSING_PIPELINE,
  EMBEDDING_PROVIDERS,
  OCR_EXTRACTION_CONTRACT,
} from "./processing";
export type {
  DocumentPipelineStageInfo,
  DocumentPipelineStageStatus,
  DocumentPipelineStep,
  DocumentPipelineStepId,
  DocumentPipelineStepStatus,
  DocumentProcessingJob,
  DocumentProcessingStage,
  EmbeddingProviderContract,
  EmbeddingProviderId,
  OcrExtractionContract,
} from "./processing";

export {
  extractDocumentText,
  extractionFromOcr,
  extensionOf,
  isImageDocument,
  MAX_EXTRACTED_CHARS,
} from "./extraction";
export type {
  TextExtractionMethod,
  TextExtractionResult,
  TextExtractionStatus,
} from "./extraction";

export {
  chunkDocumentText,
  estimateTokens,
  CHUNK_OVERLAP_CHARS,
  CHUNK_TARGET_CHARS,
  MAX_CHUNKS_PER_DOCUMENT,
} from "./chunking";
export type { ChunkingOptions, DocumentChunk } from "./chunking";

export {
  embedDocumentChunks,
  roundVector,
  DEFAULT_EMBEDDING_DIMENSIONS,
  DEFAULT_EMBEDDING_MODEL,
  EMBEDDING_BATCH_SIZE,
} from "./embeddings";
export type { EmbeddingBatchOutcome, EmbeddingBatchStatus } from "./embeddings";

export { runDocumentOcr, MAX_OCR_BYTES } from "./ocr";
export type { OcrOutcome, OcrStatus } from "./ocr";

export {
  buildChunkRecords,
  searchChunks,
  summarizeChunkIndex,
  upsertChunkRecords,
  MAX_PERSISTED_CHUNKS,
  MAX_PERSISTED_VECTOR_CHUNKS,
} from "./vectors";
export type {
  BuildChunkRecordsInput,
  ChunkIndexSummary,
  ChunkSearchHit,
} from "./vectors";

export { processUploadedDocument } from "./pipeline";
export type {
  DocumentIngestFn,
  DocumentPipelineRun,
  ProcessUploadedDocumentParams,
} from "./pipeline";

export { uploadAndQueueDocument } from "./upload";
export type { UploadedByInfo, DocumentUploadResult } from "./upload";

export { buildDocumentChangeSummary } from "./change-summary";
export type { DocumentChangeSummary, WeakExtractionDocument } from "./change-summary";
