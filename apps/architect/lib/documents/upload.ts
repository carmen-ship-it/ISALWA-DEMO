/**
 * Real Document Uploads — orchestration.
 *
 * Composes on top of the existing, unchanged pipelines instead of forking
 * them:
 *  1. `lib/documents/storage.ts` — real byte storage (Supabase Storage or
 *     the documented local/dev fallback), with progress.
 *  2. `lib/documents/pipeline.ts` — the AI Document Processing Pipeline:
 *     OCR → extract → chunk → embed → detect → knowledge graph → vectors →
 *     readiness → insights → recommendations. It in turn composes
 *     `lib/intake` / `lib/knowledge` (unchanged) for the merge, so a
 *     document still lands on the same `KnowledgeAsset` it always did.
 *  3. A metadata patch that attaches size/mime/uploader/storage location
 *     onto that exact asset — no parallel document record, no duplicated
 *     asset.
 *
 * Upload completion auto-queues processing: there is no separate "analyze"
 * button and no manual refresh. Callers receive step-by-step `onJob`
 * transitions and a fresh `CompanyWorkspace` on `onWorkspace` after every
 * persisted change.
 */

import { createId } from "@/lib/utils";
import { ingestFileThroughIntake } from "@/lib/intake";
import type { IntakeIngestReport } from "@/lib/intake";
import type { KnowledgeUploadOutcome } from "@/lib/knowledge";
import {
  buildDocumentStoragePath,
  getDocumentStorageProvider,
  type StoredDocumentRef,
  type UploadProgress,
} from "@/lib/documents/storage";
import { KNOWLEDGE_UPLOAD_MAX_BYTES } from "@/lib/knowledge";
import type { CompanyWorkspace, KnowledgeAsset } from "@/types";
import {
  processUploadedDocument,
  type DocumentIngestFn,
  type DocumentPipelineRun,
} from "./pipeline";
import type { DocumentProcessingJob } from "./processing";

export type { DocumentIngestFn } from "./pipeline";

export interface UploadedByInfo {
  userId: string | null;
  name: string | null;
}

export interface DocumentUploadResult {
  outcome: KnowledgeUploadOutcome;
  asset: KnowledgeAsset;
  workspace: CompanyWorkspace;
  message: string;
  report?: IntakeIngestReport;
  storage: StoredDocumentRef;
  /** Full pipeline record — absent only on the too-large short circuit. */
  run?: DocumentPipelineRun;
}

/**
 * Upload one file's bytes to real storage, then run it through the full
 * processing pipeline, then return the asset with storage metadata attached.
 * Returns `null` only when the workspace itself doesn't exist (matches the
 * existing `ingestKnowledgeUpload`/`ingestFileThroughIntake` contract).
 */
export async function uploadAndQueueDocument(params: {
  workspaceId: string;
  file: File;
  uploadedBy: UploadedByInfo;
  ingest?: DocumentIngestFn;
  onProgress?: (progress: UploadProgress) => void;
  onJob?: (job: DocumentProcessingJob) => void;
  onWorkspace?: (workspace: CompanyWorkspace) => void;
}): Promise<DocumentUploadResult | null> {
  const { workspaceId, file, uploadedBy, onProgress, onJob, onWorkspace } = params;
  const ingest = params.ingest ?? ingestFileThroughIntake;

  if (file.size > KNOWLEDGE_UPLOAD_MAX_BYTES) {
    // Still let the (unchanged) ingest path produce the honest "too_large"
    // outcome/message — just skip wasting a real upload, and skip the
    // pipeline entirely on a file we already know was rejected.
    const result = await ingest(workspaceId, {
      name: file.name,
      size: file.size,
      mimeType: file.type,
    });
    if (!result) return null;
    return {
      outcome: result.outcome,
      asset: result.asset,
      workspace: result.workspace,
      message: result.message,
      report: result.report,
      storage: { provider: "local", bucket: null, path: "" },
    };
  }

  const storageKey = createId("asset");
  const path = buildDocumentStoragePath(workspaceId, storageKey, file.name);
  const storageProvider = getDocumentStorageProvider();
  const ref = await storageProvider.upload(file, path, onProgress);

  const run = await processUploadedDocument({
    workspaceId,
    file,
    ingest,
    assetPatch: {
      sizeBytes: file.size,
      mimeType: file.type || null,
      uploadedByUserId: uploadedBy.userId,
      uploadedByName: uploadedBy.name,
      storageProvider: ref.provider,
      storageBucket: ref.bucket,
      storagePath: ref.path,
    },
    onJob,
    onWorkspace,
  });

  if (!run) {
    await storageProvider.remove(ref).catch(() => undefined);
    return null;
  }

  return {
    outcome: run.outcome,
    asset: run.asset,
    workspace: run.workspace,
    message: run.message,
    report: run.report,
    storage: ref,
    run,
  };
}
