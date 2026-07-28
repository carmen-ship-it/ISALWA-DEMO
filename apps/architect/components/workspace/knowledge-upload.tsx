"use client";

import { useId, useRef, useState, type DragEvent } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Clock3,
  Loader2,
  MinusCircle,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  SECTION_TONE_INK,
  SECTION_TONE_SURFACE,
} from "@/components/workspace/section-shell";
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
  buildDocumentChangeSummary,
  formatFileSize,
  uploadAndQueueDocument,
  type DocumentChangeSummary,
  type DocumentIngestFn,
  type DocumentPipelineRun,
  type DocumentPipelineStep,
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
  /**
   * Live pipeline record for this file. Populated from the `onJob` callback
   * as each of the ten steps transitions, so the list reflects real work in
   * progress rather than a spinner with a fixed delay.
   */
  steps: DocumentPipelineStep[];
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
  const [changeSummary, setChangeSummary] = useState<DocumentChangeSummary | null>(null);
  const usingLocalStorage = !isSupabaseConfigured();

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    setBusy(true);
    // One drag/drop or file-picker selection is one "batch" — the client
    // sees a single consulting-voice summary for it once every file in the
    // batch has finished, not one toast per file (Mission 21 — Living
    // Document Ingestion).
    const batchRuns: DocumentPipelineRun[] = [];

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
          steps: [],
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

      try {
        const result = await uploadAndQueueDocument({
          workspaceId,
          file,
          uploadedBy: { userId: session?.userId ?? null, name: uploadedByName },
          ingest,
          onProgress: (progress) => {
            setItems((prev) => updateItem(prev, itemId, { progress: progress.percent }));
            if (progress.percent >= 100) {
              setItems((prev) =>
                updateItem(prev, itemId, {
                  status: "queued",
                  message: t("knowledgeUpload.queued"),
                }),
              );
            }
          },
          // Upload completion auto-queues processing; these two callbacks are
          // why nothing needs a manual refresh. `onJob` streams the per-step
          // state into this list, `onWorkspace` pushes each persisted
          // workspace straight into the page so coverage, readiness,
          // insights and recommendations re-derive as the document lands.
          onJob: (job) => {
            setItems((prev) =>
              updateItem(prev, itemId, {
                status: job.stage === "analyzing" ? "analyzing" : undefined,
                message:
                  job.stage === "analyzing" ? t("knowledgeUpload.analyzing") : undefined,
                steps: job.steps,
              }),
            );
          },
          onWorkspace: (next) => onUpdated(next),
        });

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
        if (result.run) batchRuns.push(result.run);
      } catch (error) {
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

    // The debrief comes after the whole batch, not per file — one
    // consulting-voice paragraph even when several SOPs landed at once.
    const summary = buildDocumentChangeSummary(batchRuns);
    if (summary) setChangeSummary(summary);

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
              <PipelineSteps steps={item.steps} />
            </li>
          ))}
        </ul>
      ) : null}

      {changeSummary ? <DocumentChangeSummaryCard summary={changeSummary} /> : null}
    </div>
  );
}

/**
 * The consulting-voice debrief after a batch finishes (Mission 21 — Living
 * Document Ingestion). One persistent panel, not a toast per file — the
 * senior-consultant register the whole product uses, composed entirely from
 * `DocumentChangeSummary`'s already-generated Spanish sentences.
 *
 * Exported so Mission 22 (meeting transcripts) can show the exact same
 * debrief for a transcript's pipeline run instead of building a second card
 * — `processMeetingTranscript` returns a `DocumentPipelineRun`-shaped
 * result on purpose, so `buildDocumentChangeSummary` and this card work for
 * both without any fork.
 */
export function DocumentChangeSummaryCard({ summary }: { summary: DocumentChangeSummary }) {
  const { t } = useTranslations();
  return (
    <div
      className={cn(
        "rounded-[var(--isalwa-radius-panel)] border px-5 py-5",
        SECTION_TONE_SURFACE.health,
      )}
    >
      <div className="flex items-center gap-2.5">
        <span className={cn("isalwa-icon-chip", SECTION_TONE_INK.health)}>
          <Sparkles className="h-4 w-4" aria-hidden />
        </span>
        <p className={cn("isalwa-kicker", SECTION_TONE_INK.health)}>
          {t("knowledgeUpload.whatChangedKicker")}
        </p>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-[var(--isalwa-kiln)]">{summary.message}</p>
      {summary.honestNote ? (
        <p className="mt-3 text-sm leading-relaxed text-[var(--isalwa-tint-amber-ink)]">
          {summary.honestNote}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The ten processing steps, appearing as they run. Only steps that have
 * actually started are listed — an unstarted step has nothing honest to say
 * yet, and a pre-filled checklist would imply work that has not happened.
 */
function PipelineSteps({ steps }: { steps: DocumentPipelineStep[] }) {
  const { t } = useTranslations();
  const visible = steps.filter((step) => step.status !== "pending");
  if (visible.length === 0) return null;

  return (
    <ol className="mt-3 space-y-1.5 border-t border-[var(--isalwa-mist)]/60 pt-3 pl-7">
      {visible.map((step) => (
        <li key={step.id} className="flex items-start gap-2">
          <StepIcon status={step.status} />
          <p className="min-w-0 text-[11px] leading-relaxed text-[var(--isalwa-slate)]/80">
            <span className="text-[var(--isalwa-kiln)]/80">
              {t(`documentPipeline.step.${step.id}`)}
            </span>
            {step.detailKey ? (
              <>
                {" · "}
                {t(
                  `documentPipeline.detail.${step.detailKey}`,
                  step.detailParams ?? undefined,
                )}
              </>
            ) : (
              <>
                {" · "}
                {t("documentPipeline.stepStatus.running")}
              </>
            )}
          </p>
        </li>
      ))}
    </ol>
  );
}

function StepIcon({ status }: { status: DocumentPipelineStep["status"] }) {
  const className = "mt-[3px] h-3 w-3 shrink-0";
  switch (status) {
    case "running":
      return (
        <Loader2
          className={cn(className, "animate-spin text-[var(--isalwa-slate)]/50")}
          aria-hidden
        />
      );
    case "completed":
      return (
        <CheckCircle2 className={cn(className, "text-[var(--isalwa-success)]")} aria-hidden />
      );
    case "skipped":
      return (
        <MinusCircle className={cn(className, "text-[var(--isalwa-slate)]/40")} aria-hidden />
      );
    case "failed":
      return <AlertTriangle className={cn(className, "text-red-500")} aria-hidden />;
    default:
      return <Circle className={cn(className, "text-[var(--isalwa-mist)]")} aria-hidden />;
  }
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

/**
 * Patch one row. `undefined` values are dropped rather than applied, so a
 * caller can send a partial update (say, only the pipeline steps) without
 * blanking the fields it left out.
 */
function updateItem(
  items: UploadItem[],
  id: string,
  patch: Partial<UploadItem>,
): UploadItem[] {
  const defined = Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  ) as Partial<UploadItem>;
  return items.map((item) => (item.id === id ? { ...item, ...defined } : item));
}
