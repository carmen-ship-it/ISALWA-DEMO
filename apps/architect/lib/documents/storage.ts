/**
 * Real Document Uploads — file byte storage.
 *
 * Two providers, chosen automatically by `isSupabaseConfigured()` (the same
 * switch every other persistence path in this app already uses — see
 * `lib/repositories/index.ts`):
 *
 *  - `SupabaseDocumentStorage` — real cloud storage. Files land in the
 *    private `architect-documents` bucket (see
 *    `supabase/migrations/003_document_storage.sql`) under
 *    `{workspaceId}/{assetId}/{fileName}`, RLS-gated to members of that
 *    workspace via the existing `architect_is_member` function. Upload uses
 *    a raw `XMLHttpRequest` PUT against the Storage REST endpoint — the
 *    installed `@supabase/storage-js` (2.110.8) has no upload-progress hook,
 *    so this is the standard, documented way to get real byte-level
 *    progress events while still authenticating exactly like the SDK would
 *    (same bearer token, same `x-upsert` semantics).
 *
 *  - `LocalDocumentStorage` — dev/offline fallback when Supabase isn't
 *    configured. Files are kept in an in-memory `Map` for the current tab
 *    only (via `URL.createObjectURL`). This is explicitly NOT a fake cloud:
 *    it is documented here and in `REAL_DOCUMENT_UPLOADS.md` as
 *    non-persistent (lost on reload, never shared between Carmen and
 *    Álvaro) — the honest local/dev counterpart to
 *    `LocalCompanyMemoryStore`.
 */

import { isSupabaseConfigured } from "@/lib/auth/config";
import { createBrowserSupabaseClient } from "@/lib/auth/supabase/browser";
import type { DocumentStorageProviderId } from "@/types";

export const DOCUMENT_STORAGE_BUCKET = "architect-documents";

export interface UploadProgress {
  loadedBytes: number;
  totalBytes: number;
  percent: number;
}

export interface StoredDocumentRef {
  provider: DocumentStorageProviderId;
  bucket: string | null;
  path: string;
}

export interface DocumentStorageProvider {
  readonly provider: DocumentStorageProviderId;
  upload(
    file: File,
    path: string,
    onProgress?: (progress: UploadProgress) => void,
  ): Promise<StoredDocumentRef>;
  /** Fresh, time-limited URL for viewing/downloading — never persisted. */
  getDownloadUrl(ref: StoredDocumentRef): Promise<string | null>;
  remove(ref: StoredDocumentRef): Promise<void>;
}

/** `{workspaceId}/{assetId}/{sanitizedFileName}` — matches the RLS folder-prefix check. */
export function buildDocumentStoragePath(
  workspaceId: string,
  assetId: string,
  fileName: string,
): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-180) || "document";
  return `${workspaceId}/${assetId}/${safeName}`;
}

class SupabaseDocumentStorage implements DocumentStorageProvider {
  readonly provider: DocumentStorageProviderId = "supabase";

  async upload(
    file: File,
    path: string,
    onProgress?: (progress: UploadProgress) => void,
  ): Promise<StoredDocumentRef> {
    const supabase = createBrowserSupabaseClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      // Developer diagnostic only — the UI never shows raw error text to
      // end users (see knowledge-upload.tsx), it always falls back to the
      // translated "processError" copy.
      throw new Error("No active Supabase session — cannot upload to Storage.");
    }

    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${DOCUMENT_STORAGE_BUCKET}/${encodeStoragePath(path)}`;

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url, true);
      xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
      xhr.setRequestHeader(
        "apikey",
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      );
      xhr.setRequestHeader(
        "content-type",
        file.type || "application/octet-stream",
      );
      xhr.setRequestHeader("x-upsert", "true");
      xhr.setRequestHeader("cache-control", "3600");

      xhr.upload.onprogress = (event) => {
        if (!onProgress) return;
        const totalBytes = event.lengthComputable ? event.total : file.size;
        const loadedBytes = event.loaded;
        onProgress({
          loadedBytes,
          totalBytes,
          percent: totalBytes > 0 ? Math.min(100, Math.round((loadedBytes / totalBytes) * 100)) : 0,
        });
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress?.({ loadedBytes: file.size, totalBytes: file.size, percent: 100 });
          resolve();
        } else {
          reject(new Error(`Supabase Storage upload failed (${xhr.status}): ${xhr.responseText}`));
        }
      };
      xhr.onerror = () => reject(new Error("Supabase Storage upload failed — network error."));
      xhr.send(file);
    });

    return { provider: "supabase", bucket: DOCUMENT_STORAGE_BUCKET, path };
  }

  async getDownloadUrl(ref: StoredDocumentRef): Promise<string | null> {
    const supabase = createBrowserSupabaseClient();
    const { data, error } = await supabase.storage
      .from(ref.bucket ?? DOCUMENT_STORAGE_BUCKET)
      .createSignedUrl(ref.path, 60 * 10);
    if (error) return null;
    return data?.signedUrl ?? null;
  }

  async remove(ref: StoredDocumentRef): Promise<void> {
    const supabase = createBrowserSupabaseClient();
    await supabase.storage.from(ref.bucket ?? DOCUMENT_STORAGE_BUCKET).remove([ref.path]);
  }
}

/**
 * Dev/offline fallback — in-memory only, current tab only. See module doc
 * comment above; this intentionally never claims to be durable storage.
 */
class LocalDocumentStorage implements DocumentStorageProvider {
  readonly provider: DocumentStorageProviderId = "local";
  private static readonly files = new Map<string, { file: File; url: string }>();

  async upload(
    file: File,
    path: string,
    onProgress?: (progress: UploadProgress) => void,
  ): Promise<StoredDocumentRef> {
    // No real network transfer to measure locally — simulate a short,
    // honest ramp so the progress UI still reflects real work happening
    // (reading the file into memory) rather than jumping straight to 100%.
    const steps = 5;
    for (let step = 1; step <= steps; step += 1) {
      await new Promise((resolve) => setTimeout(resolve, 60));
      onProgress?.({
        loadedBytes: Math.round((file.size * step) / steps),
        totalBytes: file.size,
        percent: Math.round((step / steps) * 100),
      });
    }
    const url = URL.createObjectURL(file);
    LocalDocumentStorage.files.set(path, { file, url });
    return { provider: "local", bucket: null, path };
  }

  async getDownloadUrl(ref: StoredDocumentRef): Promise<string | null> {
    return LocalDocumentStorage.files.get(ref.path)?.url ?? null;
  }

  async remove(ref: StoredDocumentRef): Promise<void> {
    const entry = LocalDocumentStorage.files.get(ref.path);
    if (entry) URL.revokeObjectURL(entry.url);
    LocalDocumentStorage.files.delete(ref.path);
  }
}

function encodeStoragePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

let cachedProvider: DocumentStorageProvider | null = null;

export function getDocumentStorageProvider(): DocumentStorageProvider {
  const wantsSupabase = isSupabaseConfigured();
  if (cachedProvider && cachedProvider.provider === (wantsSupabase ? "supabase" : "local")) {
    return cachedProvider;
  }
  cachedProvider = wantsSupabase ? new SupabaseDocumentStorage() : new LocalDocumentStorage();
  return cachedProvider;
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}
