"use client";

import { useId, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ExecutiveDetail } from "@/components/workspace/executive-detail";
import { DocumentChangeSummaryCard, KnowledgeUpload } from "@/components/workspace/knowledge-upload";
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
import {
  buildDocumentChangeSummary,
  processMeetingTranscript,
  summarizeChunkIndex,
  type DocumentChangeSummary,
} from "@/lib/documents";
import { ensureWorkspaceKnowledge } from "@/lib/knowledge";
import { coverageAreaLabel, coverageBand, coverageBandLabelEs } from "@/lib/presentation";
import { assessMissingInformation } from "@/lib/readiness";
import { buildOsUpdateNotices } from "@/lib/consulting-intelligence/os-update-notices";
import type { CompanyWorkspace } from "@/types";
import type { ImproveDeliverableBrief } from "@/lib/consulting-intelligence/improve-deliverable";

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
  improveBrief,
  onClearImprove,
  onOpenOperatingSystem,
}: {
  workspace: CompanyWorkspace;
  onUpdated: (next: CompanyWorkspace) => void;
  /** Mission 29 — document-specific Teach brief from OS "Mejorar". */
  improveBrief?: ImproveDeliverableBrief | null;
  onClearImprove?: () => void;
  /** Mission 30 — jump to OS when updates are available after Teach. */
  onOpenOperatingSystem?: () => void;
}) {
  const { t } = useTranslations();
  const notesId = useId();
  const transcriptTitleId = useId();
  const transcriptParticipantsId = useId();
  const transcriptTextId = useId();
  const uploadSectionRef = useRef<HTMLDivElement>(null);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [reports, setReports] = useState<IntakeIngestReport[]>([]);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingParticipants, setMeetingParticipants] = useState("");
  const [transcriptText, setTranscriptText] = useState("");
  const [savingTranscript, setSavingTranscript] = useState(false);
  const [transcriptSummary, setTranscriptSummary] = useState<DocumentChangeSummary | null>(null);

  const knowledge = ensureWorkspaceKnowledge(workspace.knowledge);
  /**
   * Missing Information Engine — this empty state doubles as its lightest
   * surface: the single highest-impact upload, when we can name one.
   */
  const missingInformation = useMemo(
    () => assessMissingInformation(workspace),
    [workspace],
  );
  const osUpdates = useMemo(() => buildOsUpdateNotices(workspace), [workspace]);
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

  /**
   * Mission 22 — Meeting transcription → evidence. Same intake → knowledge
   * → consulting cycle path a document upload already gets
   * (`processMeetingTranscript` reuses `processUploadedDocument`'s stages),
   * plus a first-class `Meeting` record. One paste, one save — no wizard.
   */
  const handleSaveTranscript = async () => {
    const text = transcriptText.trim();
    if (!text || savingTranscript) return;
    const title = meetingTitle.trim() || t("businessKnowledge.meetingTranscript");
    const participants = meetingParticipants
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);

    setSavingTranscript(true);
    try {
      const run = await processMeetingTranscript({
        workspaceId: workspace.id,
        title,
        transcriptText: text,
        participants,
        onWorkspace: onUpdated,
      });
      if (run) {
        onUpdated(run.workspace);
        if (run.report) handleReport(run.report);
        const nextStepNote =
          assessMissingInformation(run.workspace).opportunities[0]?.headline ?? null;
        setTranscriptSummary(buildDocumentChangeSummary([run], { nextStepNote }));
        setMeetingTitle("");
        setMeetingParticipants("");
        setTranscriptText("");
      }
    } finally {
      setSavingTranscript(false);
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

      {improveBrief ? (
        <Card className="border-[var(--isalwa-glaze)]/30 bg-[var(--isalwa-glaze)]/5 px-5 py-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/80">
            Mejorar · {improveBrief.capabilitySystem}
          </p>
          <h3 className="architect-serif mt-2 text-2xl text-[var(--isalwa-kiln)]">
            {improveBrief.title}
          </h3>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-[var(--isalwa-kiln)]">
            {improveBrief.prompt}
          </p>
          <p className="mt-2 text-xs text-[var(--isalwa-slate)]/75">
            {improveBrief.teachHint}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() =>
                uploadSectionRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
              }
            >
              Enseñar lo que falta
            </Button>
            {onClearImprove ? (
              <Button type="button" size="sm" variant="secondary" onClick={onClearImprove}>
                Cerrar
              </Button>
            ) : null}
          </div>
        </Card>
      ) : null}

      {osUpdates ? (
        <Card className="border-[var(--isalwa-tint-amber)]/50 bg-[var(--isalwa-tint-amber)]/30 px-5 py-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/80">
            Sistema operativo
          </p>
          <p className="mt-2 text-sm font-medium text-[var(--isalwa-kiln)]">
            {osUpdates.headline}
          </p>
          <p className="mt-1 text-xs text-[var(--isalwa-slate)]/80">{osUpdates.detail}</p>
          {onOpenOperatingSystem ? (
            <div className="mt-3">
              <Button type="button" size="sm" onClick={onOpenOperatingSystem}>
                Ver sistema operativo
              </Button>
            </div>
          ) : null}
        </Card>
      ) : null}

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

      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/80">
          {t("businessKnowledge.meetingTranscript")}
        </p>
        <p className="mt-2 text-sm text-[var(--isalwa-slate)]/80">
          {t("businessKnowledge.meetingTranscriptDescription")}
        </p>
        <div className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor={transcriptTitleId} className="sr-only">
                {t("businessKnowledge.meetingTitleLabel")}
              </label>
              <input
                id={transcriptTitleId}
                type="text"
                value={meetingTitle}
                onChange={(event) => setMeetingTitle(event.target.value)}
                placeholder={t("businessKnowledge.meetingTitlePlaceholder")}
                className="w-full rounded-2xl border border-[var(--isalwa-mist)] bg-white/80 px-4 py-2.5 text-sm text-[var(--isalwa-kiln)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--isalwa-glaze)]/45"
              />
            </div>
            <div>
              <label htmlFor={transcriptParticipantsId} className="sr-only">
                {t("businessKnowledge.meetingParticipantsLabel")}
              </label>
              <input
                id={transcriptParticipantsId}
                type="text"
                value={meetingParticipants}
                onChange={(event) => setMeetingParticipants(event.target.value)}
                placeholder={t("businessKnowledge.meetingParticipantsPlaceholder")}
                className="w-full rounded-2xl border border-[var(--isalwa-mist)] bg-white/80 px-4 py-2.5 text-sm text-[var(--isalwa-kiln)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--isalwa-glaze)]/45"
              />
            </div>
          </div>
          <label htmlFor={transcriptTextId} className="sr-only">
            {t("businessKnowledge.meetingTranscriptTextLabel")}
          </label>
          <textarea
            id={transcriptTextId}
            value={transcriptText}
            onChange={(event) => setTranscriptText(event.target.value)}
            rows={8}
            placeholder={t("businessKnowledge.meetingTranscriptPlaceholder")}
            className="w-full rounded-2xl border border-[var(--isalwa-mist)] bg-white/80 px-4 py-3 text-sm text-[var(--isalwa-kiln)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--isalwa-glaze)]/45"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={!transcriptText.trim() || savingTranscript}
            onClick={handleSaveTranscript}
          >
            {savingTranscript
              ? t("businessKnowledge.savingTranscript")
              : t("businessKnowledge.saveTranscript")}
          </Button>
        </div>
        {transcriptSummary ? <DocumentChangeSummaryCard summary={transcriptSummary} /> : null}
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
