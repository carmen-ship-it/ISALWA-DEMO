/**
 * Google Drive import — client-side seam (Mission 23).
 *
 * Turns a Drive file's already-extracted text
 * (`/api/connectors/google-drive/import`, server-side, never exposes the
 * OAuth token) into a real `KnowledgeAsset` through the exact same
 * ten-step AI Document Processing Pipeline a manual upload uses
 * (`processUploadedDocument`, `lib/documents/pipeline.ts`): chunk, embed,
 * detect, merge, vectors, readiness, insights, recommendations. No second
 * pipeline, no parallel knowledge store — a Drive import is a document
 * upload whose bytes happened to arrive from Drive instead of a file
 * picker.
 */

import { ingestFileThroughIntake } from "@/lib/intake";
import {
  processUploadedDocument,
  type DocumentPipelineRun,
} from "@/lib/documents";
import type { CompanyWorkspace } from "@/types";
import type { ConnectorImportedFile } from "./types";

export async function importGoogleDriveFile(params: {
  workspaceId: string;
  file: ConnectorImportedFile;
  uploadedByUserId: string | null;
  uploadedByName: string | null;
  onWorkspace?: (workspace: CompanyWorkspace) => void;
}): Promise<DocumentPipelineRun | null> {
  const { workspaceId, file, uploadedByUserId, uploadedByName, onWorkspace } = params;
  if (!file.textContent) return null;

  const browserFile = new File([file.textContent], file.name, { type: file.mimeType });

  return processUploadedDocument({
    workspaceId,
    file: browserFile,
    ingest: ingestFileThroughIntake,
    assetPatch: {
      sizeBytes: browserFile.size,
      mimeType: file.mimeType,
      uploadedByUserId,
      uploadedByName,
      source: "Google Drive · Conector",
    },
    onWorkspace,
  });
}
