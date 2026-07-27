"use client";

import { useId, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ExecutiveDetail } from "@/components/workspace/executive-detail";
import { KnowledgeUpload } from "@/components/workspace/knowledge-upload";
import { NextUploadCta } from "@/components/workspace/executive/readiness-panel";
import { useTranslations } from "@/lib/i18n";
import {
  DETECTION_CATEGORIES,
  INTAKE_SOURCES,
  ingestFileThroughIntake,
  ingestSource,
  type DetectionCounts,
  type IntakeIngestReport,
} from "@/lib/intake";
import { summarizeChunkIndex } from "@/lib/documents";
import { ensureWorkspaceKnowledge } from "@/lib/knowledge";
import { coverageAreaLabel, coverageBand, coverageBandLabelEs } from "@/lib/presentation";
import { assessMissingInformation } from "@/lib/readiness";
import type { CompanyWorkspace } from "@/types";

/**
 * Business Knowledge — the client-facing promise: help us understand faster,
 * fewer questions. Reuses `KnowledgeUpload` (drag/drop UI unchanged) routed
 * through the Unified Business Knowledge Intake pipeline (`lib/intake`), and
 * reuses the existing Knowledge Engine vault for coverage/gaps — no parallel
 * upload widget, no parallel scoring.
 */
export function BusinessKnowledge({
  workspace,
  onUpdated,
}: {
  workspace: CompanyWorkspace;
  onUpdated: (next: CompanyWorkspace) => void;
}) {
  const { t } = useTranslations();
  const notesId = useId();
  const uploadSectionRef = useRef<HTMLDivElement>(null);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [reports, setReports] = useState<IntakeIngestReport[]>([]);

  const knowledge = ensureWorkspaceKnowledge(workspace.knowledge);
  /**
   * Missing Information Engine — this empty state doubles as its lightest
   * surface: the single highest-impact upload, when we can name one.
   */
  const missingInformation = useMemo(
    () => assessMissingInformation(workspace),
    [workspace],
  );
  const processedCount = knowledge.assets.filter(
    (a) => a.status === "processed",
  ).length;
  const chunkIndex = summarizeChunkIndex(knowledge.chunks);
  const stillNeed = Array.from(
    new Set([
      ...workspace.openQuestions,
      ...knowledge.unknownAreas.map(coverageAreaLabel),
    ]),
  ).slice(0, 6);

  const availableSources = INTAKE_SOURCES.filter(
    (s) => s.status === "designed" && s.id !== "interview",
  );
  const futureSources = INTAKE_SOURCES.filter((s) => s.status === "planned");

  const handleReport = (report: IntakeIngestReport) => {
    setReports((prev) => [report, ...prev].slice(0, 6));
  };

  const handleSaveNotes = async () => {
    const text = notes.trim();
    if (!text || savingNotes) return;
    setSavingNotes(true);
    try {
      const result = await ingestSource(workspace.id, {
        sourceType: "manual_notes",
        label: t("businessKnowledge.manualNotesSourceLabel"),
        textContent: text,
      });
      if (result) {
        onUpdated(result.workspace);
        handleReport(result.report);
        setNotes("");
      }
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/80">
          {t("businessKnowledge.kicker")}
        </p>
        <h2 className="architect-serif mt-2 text-3xl leading-tight text-[var(--isalwa-kiln)]">
          {t("businessKnowledge.title")}
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--isalwa-slate)]">
          {t("businessKnowledge.description")}
        </p>
      </div>

      <NextUploadCta
        report={missingInformation}
        onUploadClick={() =>
          uploadSectionRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          })
        }
      />

      <Card className="px-5 py-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/80">
          {t("businessKnowledge.whatToShare")}
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {availableSources.map((source) => (
            <li
              key={source.id}
              className="rounded-2xl border border-[var(--isalwa-mist)]/80 bg-white/70 px-4 py-3"
            >
              <p className="text-sm text-[var(--isalwa-kiln)]">{source.titleEs}</p>
              <p className="mt-1 text-xs text-[var(--isalwa-slate)]/80">
                {source.descriptionEs}
              </p>
            </li>
          ))}
        </ul>
      </Card>

      <div ref={uploadSectionRef}>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/80">
          {t("businessKnowledge.uploadDocuments")}
        </p>
        <p className="mt-2 text-sm text-[var(--isalwa-slate)]/80">
          {t("businessKnowledge.uploadExamples")}
        </p>
        <div className="mt-4">
          <KnowledgeUpload
            workspaceId={workspace.id}
            onUpdated={onUpdated}
            ingest={ingestFileThroughIntake}
            onReport={handleReport}
          />
        </div>
      </div>

      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/80">
          {t("businessKnowledge.manualNotes")}
        </p>
        <p className="mt-2 text-sm text-[var(--isalwa-slate)]/80">
          {t("businessKnowledge.manualNotesDescription")}
        </p>
        <div className="mt-4 space-y-3">
          <label htmlFor={notesId} className="sr-only">
            {t("businessKnowledge.notesLabel")}
          </label>
          <textarea
            id={notesId}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={5}
            placeholder={t("businessKnowledge.notesPlaceholder")}
            className="w-full rounded-2xl border border-[var(--isalwa-mist)] bg-white/80 px-4 py-3 text-sm text-[var(--isalwa-kiln)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--isalwa-glaze)]/45"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={!notes.trim() || savingNotes}
            onClick={handleSaveNotes}
          >
            {savingNotes ? t("businessKnowledge.saving") : t("businessKnowledge.saveNotes")}
          </Button>
        </div>
      </div>

      {reports.length > 0 ? (
        <Card className="px-5 py-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/80">
            {t("businessKnowledge.justLearned")}
          </p>
          <ul className="mt-4 space-y-4">
            {reports.map((report, index) => (
              <li key={`${report.sourceType}_${index}`} className="space-y-1.5">
                {report.learnedLines.map((line) => (
                  <p key={line} className="text-sm leading-relaxed text-[var(--isalwa-tint-green-ink)]">
                    ✓ {line}
                  </p>
                ))}
                {report.stillNeedLines.map((line) => (
                  <p key={line} className="text-sm leading-relaxed text-[var(--isalwa-tint-amber-ink)]">
                    — {line}
                  </p>
                ))}
                {report.readContent ? (
                  <DetectionChips detections={report.detections} />
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/80">
          {t("businessKnowledge.coverageByArea")}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <Meta label={t("businessKnowledge.documentsProcessed")} value={String(processedCount)} />
          <Meta
            label={t("businessKnowledge.businessRulesFound")}
            value={String(knowledge.businessRules.length)}
          />
          <Meta
            label={t("businessKnowledge.pointsToClarify")}
            value={String(knowledge.contradictions.length)}
          />
          <Meta
            label={t("businessKnowledge.questionsAvoided")}
            value={String(Math.max(0, 5 - stillNeed.length))}
          />
        </div>
        <p className="mt-4 text-xs leading-relaxed text-[var(--isalwa-slate)]/70">
          <span className="uppercase tracking-[0.14em] text-[var(--isalwa-slate)]/60">
            {t("businessKnowledge.searchIndex")}
          </span>
          {" · "}
          {chunkIndex.total === 0
            ? t("businessKnowledge.searchIndexEmpty")
            : chunkIndex.ready > 0
              ? t("businessKnowledge.searchIndexReady", {
                  ready: chunkIndex.ready,
                  total: chunkIndex.total,
                  documents: chunkIndex.documents,
                })
              : t("businessKnowledge.searchIndexPending", {
                  total: chunkIndex.total,
                  documents: chunkIndex.documents,
                })}
        </p>
        <ul className="mt-5 space-y-3">
          {knowledge.coverage.map((slice) => {
            const band = coverageBand(slice.percent, "percent");
            return (
              <li key={slice.area} className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[var(--isalwa-slate)]">
                      {coverageAreaLabel(slice.area)}
                    </span>
                    <span className="text-[var(--isalwa-kiln)]">
                      {coverageBandLabelEs(band)}
                    </span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--isalwa-mist)]">
                    <div
                      className="h-full rounded-full bg-[var(--isalwa-glaze-deep)] transition-all"
                      style={{ width: `${Math.max(6, slice.percent)}%` }}
                      aria-hidden
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/80">
          {t("businessKnowledge.stillNeed")}
        </p>
        {stillNeed.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--isalwa-slate)]/80">
            {t("businessKnowledge.stillNeedEmpty")}
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {stillNeed.map((item) => (
              <li
                key={item}
                className="rounded-2xl border border-[var(--isalwa-tint-amber-border)]/80 bg-[var(--isalwa-tint-amber)]/60 px-4 py-3 text-sm text-[var(--isalwa-slate)]"
              >
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>

      <ExecutiveDetail
        labelExpand={t("businessKnowledge.expandFutureSources")}
        labelCollapse={t("businessKnowledge.collapseFutureSources")}
        summary={
          <p className="text-sm text-[var(--isalwa-slate)]">
            {t("businessKnowledge.futureSourcesSummary")}
          </p>
        }
      >
        <ul className="grid gap-2 sm:grid-cols-2">
          {futureSources.map((source) => (
            <li
              key={source.id}
              className="rounded-2xl border border-[var(--isalwa-mist)]/80 bg-white/70 px-4 py-3"
            >
              <p className="text-sm text-[var(--isalwa-kiln)]">{source.titleEs}</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[var(--isalwa-slate)]/60">
                {t("businessKnowledge.comingSoon")}
              </p>
            </li>
          ))}
        </ul>
      </ExecutiveDetail>
    </div>
  );
}

/**
 * What the twelve detectors found in one document. Categories with zero
 * matches are omitted rather than shown as "0" — an empty category is not a
 * finding, and listing it would read as a claim we checked and confirmed
 * nothing exists.
 */
function DetectionChips({ detections }: { detections: DetectionCounts }) {
  const { t } = useTranslations();
  const found = DETECTION_CATEGORIES.filter((category) => detections[category] > 0);
  if (found.length === 0) return null;

  return (
    <div className="pt-1">
      <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--isalwa-slate)]/60">
        {t("businessKnowledge.whatWeDetected")}
      </p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {found.map((category) => (
          <li
            key={category}
            className="rounded-full border border-[var(--isalwa-mist)]/80 bg-white/70 px-2.5 py-1 text-[11px] text-[var(--isalwa-slate)]"
          >
            {t(`businessKnowledge.detection.${category}`)}
            {" · "}
            <span className="text-[var(--isalwa-kiln)]">{detections[category]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--isalwa-slate)]/60">
        {label}
      </p>
      <p className="mt-1 text-[var(--isalwa-kiln)]">{value}</p>
    </div>
  );
}
