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
import { useTranslations } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  ingestKnowledgeUpload,
  KNOWLEDGE_UPLOAD_ACCEPT,
  KNOWLEDGE_UPLOAD_MAX_BYTES,
  type KnowledgeUploadResult,
} from "@/lib/knowledge";
import type { IntakeIngestReport } from "@/lib/intake";
import type { CompanyWorkspace } from "@/types";

type UploadItemStatus = "processing" | "processed" | "queued" | "error";

interface UploadItem {
  id: string;
  fileName: string;
  status: UploadItemStatus;
  message: string;
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
  ingest?: (
    workspaceId: string,
    file: { name: string; size: number; mimeType: string },
  ) => Promise<(KnowledgeUploadResult & { report?: IntakeIngestReport }) | null>;
  onReport?: (report: IntakeIngestReport) => void;
}) {
  const { t } = useTranslations();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    setBusy(true);

    for (const file of files) {
      const itemId = `${file.name}-${file.size}-${Date.now()}`;
      setItems((prev) => [
        { id: itemId, fileName: file.name, status: "processing", message: t("knowledgeUpload.processing") },
        ...prev,
      ]);

      try {
        // Brief, honest pacing so the executive sees each document move
        // through the pipeline — no content is parsed during this delay.
        await wait(450);
        const result = await ingest(workspaceId, {
          name: file.name,
          size: file.size,
          mimeType: file.type,
        });

        if (!result) {
          setItems((prev) =>
            updateItem(prev, itemId, {
              status: "error",
              message: t("knowledgeUpload.workspaceNotFound"),
            }),
          );
          continue;
        }

        setItems((prev) =>
          updateItem(prev, itemId, {
            status:
              result.outcome === "processed"
                ? "processed"
                : result.outcome === "queued"
                  ? "queued"
                  : "error",
            message: result.message,
          }),
        );
        onUpdated(result.workspace);
        if (result.report) onReport?.(result.report);
      } catch (error) {
        setItems((prev) =>
          updateItem(prev, itemId, {
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : t("knowledgeUpload.processError"),
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

      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-3 rounded-2xl border border-[var(--isalwa-mist)]/80 bg-white/70 px-4 py-3"
            >
              <div className="flex min-w-0 items-start gap-3">
                <StatusIcon status={item.status} />
                <div className="min-w-0">
                  <p className="truncate text-sm text-[var(--isalwa-kiln)]">
                    {item.fileName}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--isalwa-slate)]/80">
                    {item.message}
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
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function StatusIcon({ status }: { status: UploadItemStatus }) {
  switch (status) {
    case "processing":
      return (
        <Loader2
          className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-[var(--isalwa-slate)]/60"
          aria-hidden
        />
      );
    case "processed":
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

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
