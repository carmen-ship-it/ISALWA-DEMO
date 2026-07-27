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
  OCR_EXTRACTION_CONTRACT,
  EMBEDDING_PROVIDERS,
  DOCUMENT_PROCESSING_PIPELINE,
} from "./processing";
export type {
  DocumentProcessingStage,
  DocumentProcessingJob,
  OcrExtractionContract,
  EmbeddingProviderContract,
  EmbeddingProviderId,
  DocumentPipelineStageInfo,
} from "./processing";

export { uploadAndQueueDocument } from "./upload";
export type {
  UploadedByInfo,
  DocumentIngestFn,
  DocumentUploadResult,
} from "./upload";
