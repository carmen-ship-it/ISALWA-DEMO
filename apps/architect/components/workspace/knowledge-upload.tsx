"use client";

import { useId, useRef, useState, type DragEvent } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Loader2,
  UploadCloud,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/use-auth";
import { useTranslations } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { isSupabaseConfigured } from "@/lib/auth/config";
import {
  ingestKnowledgeUpload,
  KNOWLEDGE_UPLOAD_ACCEPT,
  KNOWLEDGE_UPLOAD_MAX_BYTES,
} from "@/lib/knowledge";
import {
  formatFileSize,
  uploadAndQueueDocument,
  type DocumentIngestFn,
} from "@/lib/documents";
import { formatRelativeActivity } from "@/lib/workspace";
import type { IntakeIngestReport } from "@/lib/intake";
import type { CompanyWorkspace } from "@/types";

type UploadItemStatus = "uploading" | "queued" | "analyzing" | "completed" | "failed";

interface UploadItem {
  id: string;
  fileName: string;
  status: UploadItemStatus;
  message: string;
  progress: number;
  sizeBytes: number;
  mimeType: string;
  uploadedAt: string;
  uploadedByName: string | null;
}

const MAX_MB = Math.round(KNOWLEDGE_UPLOAD_MAX_BYTES / (1024 * 1024));

export function KnowledgeUpload({
  workspaceId,
  onUpdated,
  ingest = ingestKnowledgeUpload,
  onReport,
}: {
  workspaceId: string;
  onUpdated: (next: CompanyWorkspace) => void;
  /**
   * Unified Business Knowledge Intake — swap in a richer ingest function
   * (e.g. `ingestFileThroughIntake`) without forking this widget. Defaults
   * to the original single-entity path used by the consultant-only
   * Knowledge Center, so that call site's behavior is unchanged.
   */
  ingest?: DocumentIngestFn;
  onReport?: (report: IntakeIngestReport) => void;
}) {
  const { t } = useTranslations();
  const { session } = useAuth();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const usingLocalStorage = !isSupabaseConfigured();

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    setBusy(true);

    for (const file of files) {
      const itemId = `${file.name}-${file.size}-${Date.now()}`;
      const uploadedByName = session?.displayName ?? null;
      setItems((prev) => [
        {
          id: itemId,
          fileName: file.name,
          status: "uploading",
          message: t("knowledgeUpload.uploading"),
          progress: 0,
          sizeBytes: file.size,
          mimeType: file.type,
          uploadedAt: new Date().toISOString(),
          uploadedByName,
        },
        ...prev,
      ]);

      if (file.size > KNOWLEDGE_UPLOAD_MAX_BYTES) {
        setItems((prev) =>
          updateItem(prev, itemId, {
            status: "failed",
            progress: 0,
            message: t("knowledgeUpload.tooLarge", { maxMb: MAX_MB }),
          }),
        );
        continue;
      }

      let analyzingTimer: ReturnType<typeof setTimeout> | null = null;
      try {
        const result = await uploadAndQueueDocument({
          workspaceId,
          file,
          uploadedBy: { userId: session?.userId ?? null, name: uploadedByName },
          ingest,
          onProgress: (progress) => {
            setItems((prev) => updateItem(prev, itemId, { progress: progress.percent }));
            if (progress.percent >= 100 && !analyzingTimer) {
              setItems((prev) =>
                updateItem(prev, itemId, {
                  status: "queued",
                  message: t("knowledgeUpload.queued"),
                }),
              );
              analyzingTimer = setTimeout(() => {
                setItems((prev) =>
                  updateItem(prev, itemId, {
                    status: "analyzing",
                    message: t("knowledgeUpload.analyzing"),
                  }),
                );
              }, 350);
            }
          },
        });
        if (analyzingTimer) clearTimeout(analyzingTimer);

        if (!result) {
          setItems((prev) =>
            updateItem(prev, itemId, {
              status: "failed",
              message: t("knowledgeUpload.workspaceNotFound"),
            }),
          );
          continue;
        }

        setItems((prev) =>
          updateItem(prev, itemId, {
            status:
              result.outcome === "processed"
                ? "completed"
                : result.outcome === "queued"
                  ? "queued"
                  : "failed",
            progress: 100,
            message: result.message,
          }),
        );
        onUpdated(result.workspace);
        if (result.report) onReport?.(result.report);
      } catch (error) {
        if (analyzingTimer) clearTimeout(analyzingTimer);
        // Storage/network errors are developer diagnostics, not client-facing
        // copy — log them, but always show the translated message so Client
        // Mode never sees raw English exception text.
        if (error instanceof Error) console.error("Document upload failed:", error.message);
        setItems((prev) =>
          updateItem(prev, itemId, {
            status: "failed",
            message: t("knowledgeUpload.processError"),
          }),
        );
      }
    }

    setBusy(false);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    void handleFiles(event.dataTransfer.files);
  };

  return (
    <div className="space-y-4">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-3 rounded-[var(--isalwa-radius-panel)] border-2 border-dashed px-6 py-10 text-center transition-colors",
          dragOver
            ? "border-[var(--isalwa-glaze)] bg-[var(--isalwa-porcelain)]"
            : "border-[var(--isalwa-mist)] bg-white/60 hover:border-[var(--isalwa-mist)] hover:bg-[var(--isalwa-porcelain)]/70",
        )}
      >
        <UploadCloud className="h-8 w-8 text-[var(--isalwa-slate)]/60" aria-hidden />
        <div>
          <p className="text-[var(--isalwa-kiln)]">
            {t("knowledgeUpload.dropHint")}
          </p>
          <p className="mt-1 text-sm text-[var(--isalwa-slate)]/80">
            {t("knowledgeUpload.fileTypes", { maxMb: MAX_MB })}
          </p>
        </div>
        <label htmlFor={inputId} className="sr-only">
          {t("knowledgeUpload.srUploadLabel")}
        </label>
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          multiple
          accept={KNOWLEDGE_UPLOAD_ACCEPT}
          className="sr-only"
          onChange={(event) => {
            void handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={busy}
          onClick={(event) => {
            event.stopPropagation();
            inputRef.current?.click();
          }}
        >
          {busy ? t("knowledgeUpload.processing") : t("knowledgeUpload.selectFiles")}
        </Button>
      </div>

      {usingLocalStorage ? (
        <p className="text-xs text-[var(--isalwa-slate)]/60">
          {t("knowledgeUpload.localStorageNotice")}
        </p>
      ) : null}

      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-2xl border border-[var(--isalwa-mist)]/80 bg-white/70 px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <StatusIcon status={item.status} />
                  <div className="min-w-0">
                    <p className="truncate text-sm text-[var(--isalwa-kiln)]">
                      {item.fileName}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--isalwa-slate)]/80">
                      {item.message}
                    </p>
                    <p className="mt-1 text-[11px] text-[var(--isalwa-slate)]/60">
                      {formatFileSize(item.sizeBytes)}
                      {" · "}
                      {t(`knowledgeUpload.status.${item.status}`)}
                      {item.uploadedByName
                        ? ` · ${t("knowledgeUpload.uploadedBy", { name: item.uploadedByName })}`
                        : ""}
                      {" · "}
                      {formatRelativeActivity(item.uploadedAt)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setItems((prev) => prev.filter((i) => i.id !== item.id))
                  }
                  className="shrink-0 rounded-full p-1 text-[var(--isalwa-slate)]/40 transition-colors hover:bg-[var(--isalwa-mist)] hover:text-[var(--isalwa-slate)]/80"
                  aria-label={t("knowledgeUpload.hideFromList")}
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
              {item.status === "uploading" ? (
                <div className="mt-2.5 pl-7">
                  <Progress value={item.progress} aria-label={t("knowledgeUpload.uploadProgressLabel")} />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function StatusIcon({ status }: { status: UploadItemStatus }) {
  switch (status) {
    case "uploading":
      return (
        <Loader2
          className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-[var(--isalwa-slate)]/60"
          aria-hidden
        />
      );
    case "analyzing":
      return (
        <Loader2
          className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-[var(--isalwa-slate)]/60"
          aria-hidden
        />
      );
    case "completed":
      return (
        <CheckCircle2
          className="mt-0.5 h-4 w-4 shrink-0 text-[var(--isalwa-success)]"
          aria-hidden
        />
      );
    case "queued":
      return (
        <Clock3
          className="mt-0.5 h-4 w-4 shrink-0 text-[var(--isalwa-tint-amber-ink)]"
          aria-hidden
        />
      );
    default:
      return (
        <AlertTriangle
          className="mt-0.5 h-4 w-4 shrink-0 text-red-500"
          aria-hidden
        />
      );
  }
}

function updateItem(
  items: UploadItem[],
  id: string,
  patch: Partial<UploadItem>,
): UploadItem[] {
  return items.map((item) => (item.id === id ? { ...item, ...patch } : item));
}
