/**
 * Real Document Uploads — orchestration.
 *
 * Composes on top of the existing, unchanged pipelines instead of forking
 * them:
 *  1. `lib/documents/storage.ts` — real byte storage (Supabase Storage or
 *     the documented local/dev fallback), with progress.
 *  2. `lib/intake` / `lib/knowledge` (unchanged) — the same deterministic
 *     classification + Knowledge Engine merge every upload has always gone
 *     through (`ingestFileThroughIntake` / `ingestKnowledgeUpload`).
 *  3. A metadata patch that attaches size/mime/uploader/storage location
 *     onto the exact `KnowledgeAsset` the ingest step just created — no
 *     parallel document record, no duplicated asset.
 */

import { createId } from "@/lib/utils";
import { getClientCompanyMemoryStore } from "@/lib/repositories";
import { ingestFileThroughIntake, type IntakeIngestReport } from "@/lib/intake";
import type { KnowledgeUploadOutcome, KnowledgeUploadResult } from "@/lib/knowledge";
import {
  buildDocumentStoragePath,
  getDocumentStorageProvider,
  type StoredDocumentRef,
  type UploadProgress,
} from "@/lib/documents/storage";
import { KNOWLEDGE_UPLOAD_MAX_BYTES } from "@/lib/knowledge";
import type { CompanyWorkspace, KnowledgeAsset } from "@/types";

export interface UploadedByInfo {
  userId: string | null;
  name: string | null;
}

export type DocumentIngestFn = (
  workspaceId: string,
  file: { name: string; size: number; mimeType: string },
) => Promise<(KnowledgeUploadResult & { report?: IntakeIngestReport }) | null>;

export interface DocumentUploadResult {
  outcome: KnowledgeUploadOutcome;
  asset: KnowledgeAsset;
  workspace: CompanyWorkspace;
  message: string;
  report?: IntakeIngestReport;
  storage: StoredDocumentRef;
}

/**
 * Upload one file's bytes to real storage, then run it through the existing
 * ingest pipeline, then attach storage + metadata to the resulting asset.
 * Returns `null` only when the workspace itself doesn't exist (matches the
 * existing `ingestKnowledgeUpload`/`ingestFileThroughIntake` contract).
 */
export async function uploadAndQueueDocument(params: {
  workspaceId: string;
  file: File;
  uploadedBy: UploadedByInfo;
  ingest?: DocumentIngestFn;
  onProgress?: (progress: UploadProgress) => void;
}): Promise<DocumentUploadResult | null> {
  const { workspaceId, file, uploadedBy, onProgress } = params;
  const ingest = params.ingest ?? ingestFileThroughIntake;

  if (file.size > KNOWLEDGE_UPLOAD_MAX_BYTES) {
    // Still let the (unchanged) ingest path produce the honest "too_large"
    // outcome/message — just skip wasting a real upload on a file we know
    // will be rejected.
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

  const assetId = createId("asset");
  const path = buildDocumentStoragePath(workspaceId, assetId, file.name);
  const storageProvider = getDocumentStorageProvider();
  const ref = await storageProvider.upload(file, path, onProgress);

  const result = await ingest(workspaceId, {
    name: file.name,
    size: file.size,
    mimeType: file.type,
  });

  if (!result) {
    await storageProvider.remove(ref).catch(() => undefined);
    return null;
  }

  const store = getClientCompanyMemoryStore();
  const patchedAssets = result.workspace.knowledge.assets.map((asset) =>
    asset.id === result.asset.id
      ? ({
          ...asset,
          sizeBytes: file.size,
          mimeType: file.type || null,
          uploadedByUserId: uploadedBy.userId,
          uploadedByName: uploadedBy.name,
          storageProvider: ref.provider,
          storageBucket: ref.bucket,
          storagePath: ref.path,
        } satisfies KnowledgeAsset)
      : asset,
  );
  const patchedWorkspace: CompanyWorkspace = {
    ...result.workspace,
    knowledge: { ...result.workspace.knowledge, assets: patchedAssets },
  };
  const saved = await store.workspaces.save(patchedWorkspace);
  const finalAsset =
    saved.knowledge.assets.find((asset) => asset.id === result.asset.id) ?? result.asset;

  return {
    outcome: result.outcome,
    asset: finalAsset,
    workspace: saved,
    message: result.message,
    report: result.report,
    storage: ref,
  };
}
