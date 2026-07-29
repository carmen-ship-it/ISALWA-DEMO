/**
 * AI Document Processing Pipeline — orchestration.
 *
 * One function runs a document from bytes to refreshed advice, and it does
 * it by *composing engines that already exist* rather than growing a second
 * brain:
 *
 *   1 OCR              `lib/documents/ocr.ts`        (server route, key-gated)
 *   2 Extract text     `lib/documents/extraction.ts` (real for text/MD/CSV)
 *   3 Chunk            `lib/documents/chunking.ts`   (always real)
 *   4 Embed            `lib/documents/embeddings.ts` (server route, key-gated)
 *   5 Detect           `lib/intake/detectors.ts`     (twelve detectors)
 *   6 Knowledge graph  `lib/intake/pipeline.ts`      (unchanged merge)
 *   7 Store vectors    `lib/documents/vectors.ts`    (WorkspaceKnowledge.chunks)
 *   8 Readiness        `lib/readiness/memory.ts`     (existing Discovery Score)
 *   9 Insights         `lib/insights`                (pure derivation)
 *  10 Recommendations  `lib/explanations`            (pure derivation)
 *
 * Steps 5 and 6 are a single `ingest` call — the intake pipeline detects and
 * merges in one pass, and splitting it would mean duplicating that logic. It
 * is reported as two steps because those are two distinct outcomes a client
 * cares about ("what did you find" vs "what did you add").
 *
 * Steps 9 and 10 are derivations, not stored artifacts: every workspace
 * surface recomputes them with `useMemo` on the workspace object. The
 * pipeline runs them to measure the delta, so the run can honestly say "3
 * new insights" instead of implying it wrote something.
 *
 * Nothing here polls or waits for a manual refresh: `onWorkspace` fires after
 * every persisted change, and the caller feeds it straight into React state.
 *
 * Mission 22 (Meeting transcription → evidence) adds one sibling entry point,
 * `processMeetingTranscript`, for text that already exists as text — a
 * pasted or uploaded meeting transcript — instead of a `File`. It reuses
 * every stage above except OCR/extraction (skipped: there is no binary to
 * read), so a transcript becomes chunked, embedded, detected, merged and
 * measured exactly like an uploaded document — no second pipeline.
 */

import { getClientCompanyMemoryStore } from "@/lib/repositories";
import { ensureWorkspaceKnowledge } from "@/lib/knowledge/coverage";
import { deriveExecutiveInsights } from "@/lib/insights";
import { explainWorkspaceRecommendations } from "@/lib/explanations";
import { refreshUnderstandingFromEvidence } from "@/lib/readiness";
import { ingestSource, totalDetections } from "@/lib/intake";
import type { IntakeIngestReport } from "@/lib/intake";
import type { KnowledgeUploadOutcome, KnowledgeUploadResult } from "@/lib/knowledge";
import { createId, nowIso } from "@/lib/utils";
import type { CompanyWorkspace, KnowledgeAsset, Meeting, TimelineEvent } from "@/types";
import { chunkDocumentText, type DocumentChunk } from "./chunking";
import { embedDocumentChunks, type EmbeddingBatchOutcome } from "./embeddings";
import {
  extractDocumentText,
  extractionFromOcr,
  isImageDocument,
  type TextExtractionResult,
} from "./extraction";
import { runDocumentOcr } from "./ocr";
import {
  createDocumentProcessingJob,
  type DocumentPipelineStep,
  type DocumentPipelineStepId,
  type DocumentProcessingJob,
} from "./processing";
import { buildChunkRecords, upsertChunkRecords } from "./vectors";

/**
 * How the document reaches the knowledge graph. Defaults to
 * `ingestFileThroughIntake`; injectable so the consultant-only Knowledge
 * Center can keep its original single-entity path.
 */
export type DocumentIngestFn = (
  workspaceId: string,
  file: {
    name: string;
    size: number;
    mimeType: string;
    textContent?: string;
    extractionMethod?: string;
  },
) => Promise<(KnowledgeUploadResult & { report?: IntakeIngestReport }) | null>;

export interface DocumentPipelineRun {
  job: DocumentProcessingJob;
  workspace: CompanyWorkspace;
  asset: KnowledgeAsset;
  outcome: KnowledgeUploadOutcome;
  message: string;
  report?: IntakeIngestReport;
  extraction: TextExtractionResult;
  chunkCount: number;
  embedding: EmbeddingBatchOutcome | null;
  understandingBefore: number;
  understandingAfter: number;
  newInsights: number;
  newRecommendations: number;
}

export interface ProcessUploadedDocumentParams {
  workspaceId: string;
  file: File;
  ingest: DocumentIngestFn;
  /** Storage/uploader metadata merged onto the asset the ingest step creates. */
  assetPatch: Partial<KnowledgeAsset>;
  /** Fires on every step transition — drives the live upload list. */
  onJob?: (job: DocumentProcessingJob) => void;
  /** Fires after every persisted workspace change — no manual refresh needed. */
  onWorkspace?: (workspace: CompanyWorkspace) => void;
}

/** Mirrors what the insights panel actually renders, so a delta means something. */
function countInsights(workspace: CompanyWorkspace): number {
  const insights = deriveExecutiveInsights(workspace);
  return (
    insights.businessDna.length +
    insights.blindSpots.length +
    insights.nextConversations.length +
    insights.surprises.length +
    insights.institutionalMemory.length +
    insights.futureReadiness.length +
    insights.knowledgeConcentration.nodes.length +
    insights.learnedTimeline.length
  );
}

function countRecommendations(workspace: CompanyWorkspace): number {
  return explainWorkspaceRecommendations(workspace).length;
}

interface StepRecorder {
  start(id: DocumentPipelineStepId): void;
  finish(
    id: DocumentPipelineStepId,
    status: Exclude<DocumentPipelineStep["status"], "pending" | "running">,
    detailKey: string,
    detailParams?: Record<string, string | number>,
    note?: string | null,
  ): void;
  job(): DocumentProcessingJob;
  setStage(stage: DocumentProcessingJob["stage"], error?: string | null): void;
}

function createStepRecorder(
  initial: DocumentProcessingJob,
  onJob?: (job: DocumentProcessingJob) => void,
): StepRecorder {
  let current = initial;

  const publish = () => onJob?.(current);

  const patch = (
    id: DocumentPipelineStepId,
    changes: Partial<DocumentPipelineStep>,
  ) => {
    current = {
      ...current,
      steps: current.steps.map((step) =>
        step.id === id ? { ...step, ...changes } : step,
      ),
    };
    publish();
  };

  return {
    start(id) {
      patch(id, { status: "running", startedAt: nowIso() });
    },
    finish(id, status, detailKey, detailParams, note) {
      patch(id, {
        status,
        detailKey,
        detailParams: detailParams ?? null,
        note: note ?? null,
        finishedAt: nowIso(),
      });
    },
    job() {
      return current;
    },
    setStage(stage, error) {
      current = {
        ...current,
        stage,
        error: error ?? current.error,
        startedAt: current.startedAt ?? (stage === "analyzing" ? nowIso() : null),
        finishedAt:
          stage === "completed" || stage === "failed" ? nowIso() : current.finishedAt,
      };
      publish();
    },
  };
}

/**
 * Steps 1–2: get text out of the file, or say precisely why we could not.
 * Images go through OCR; everything else through the reader. Both return the
 * same result shape so the rest of the pipeline has one code path.
 */
async function readDocumentText(
  file: File,
  recorder: StepRecorder,
): Promise<TextExtractionResult> {
  const isImage = isImageDocument(file.name, file.type ?? "");

  recorder.start("ocr");
  if (!isImage) {
    recorder.finish("ocr", "skipped", "ocrNotApplicable");
  } else {
    const ocr = await runDocumentOcr(file);
    if (ocr.status === "completed") {
      recorder.finish("ocr", "completed", "ocrCompleted", {
        chars: ocr.text.length,
      });
      recorder.start("extract_text");
      const fromOcr = extractionFromOcr(ocr.text);
      if (fromOcr.status === "extracted") {
        recorder.finish("extract_text", "completed", "extractOcr", {
          chars: fromOcr.charCount,
        });
      } else {
        recorder.finish("extract_text", "skipped", "extractEmpty", undefined, fromOcr.reason);
      }
      return fromOcr;
    }
    recorder.finish(
      "ocr",
      ocr.status === "failed" ? "failed" : "skipped",
      ocr.status === "failed" ? "ocrFailed" : "ocrUnavailable",
      undefined,
      ocr.reason,
    );
  }

  recorder.start("extract_text");
  const extraction = await extractDocumentText(file);

  switch (extraction.status) {
    case "extracted":
      recorder.finish(
        "extract_text",
        "completed",
        extraction.method === "csv_flatten"
          ? "extractCsv"
          : extraction.method === "markdown"
            ? "extractMarkdown"
            : "extractPlainText",
        { chars: extraction.charCount },
      );
      break;
    case "requires_ocr":
      recorder.finish(
        "extract_text",
        "skipped",
        "extractRequiresOcr",
        undefined,
        extraction.reason,
      );
      break;
    case "empty":
      recorder.finish("extract_text", "skipped", "extractEmpty", undefined, extraction.reason);
      break;
    default:
      recorder.finish(
        "extract_text",
        "skipped",
        "extractUnsupported",
        undefined,
        extraction.reason,
      );
  }

  return extraction;
}

/** Step 3: chunking. Always real — no key, no dependency, no excuse. */
function chunkStep(
  extraction: TextExtractionResult,
  recorder: StepRecorder,
): DocumentChunk[] {
  recorder.start("chunk");
  if (extraction.status !== "extracted") {
    recorder.finish("chunk", "skipped", "chunkNoText");
    return [];
  }
  const chunks = chunkDocumentText(extraction.text);
  recorder.finish("chunk", "completed", "chunkCompleted", { chunks: chunks.length });
  return chunks;
}

/** Step 4: embeddings. Absent provider is a reported outcome, not a failure. */
async function embedStep(
  chunks: DocumentChunk[],
  recorder: StepRecorder,
): Promise<EmbeddingBatchOutcome | null> {
  recorder.start("embed");
  if (chunks.length === 0) {
    recorder.finish("embed", "skipped", "embedNoChunks");
    return null;
  }

  const outcome = await embedDocumentChunks(chunks.map((chunk) => chunk.text));

  if (outcome.status === "ready") {
    recorder.finish("embed", "completed", "embedReady", { chunks: chunks.length });
  } else if (outcome.status === "pending") {
    recorder.finish(
      "embed",
      "skipped",
      "embedPending",
      { chunks: chunks.length },
      outcome.reason,
    );
  } else {
    recorder.finish("embed", "failed", "embedFailed", undefined, outcome.reason);
  }

  return outcome;
}

/**
 * Run one uploaded document through the full pipeline. Returns `null` only
 * when the workspace does not exist — matching the existing
 * `ingestKnowledgeUpload` / `ingestFileThroughIntake` contract.
 */
export async function processUploadedDocument(
  params: ProcessUploadedDocumentParams,
): Promise<DocumentPipelineRun | null> {
  const { workspaceId, file, ingest, assetPatch, onJob, onWorkspace } = params;

  const store = getClientCompanyMemoryStore();
  const before = await store.workspaces.get(workspaceId);
  if (!before) return null;

  const insightsBefore = countInsights(before);
  const recommendationsBefore = countRecommendations(before);
  const understandingBefore = before.businessUnderstanding;

  const recorder = createStepRecorder(
    createDocumentProcessingJob(workspaceId, `pending_${file.name}`, file.name),
    onJob,
  );
  recorder.setStage("analyzing");

  const extraction = await readDocumentText(file, recorder);
  const chunks = chunkStep(extraction, recorder);
  const embedding = await embedStep(chunks, recorder);

  // Steps 5 + 6 — one merge pass through the unchanged intake pipeline.
  recorder.start("detect");
  recorder.start("knowledge_graph");

  const ingested = await ingest(workspaceId, {
    name: file.name,
    size: file.size,
    mimeType: file.type,
    textContent: extraction.status === "extracted" ? extraction.text : undefined,
    extractionMethod: extraction.method,
  });

  if (!ingested) {
    recorder.finish("detect", "failed", "workspaceMissing");
    recorder.finish("knowledge_graph", "failed", "workspaceMissing");
    recorder.setStage("failed", "Workspace not found during ingest.");
    return null;
  }

  const report = ingested.report;
  if (report?.readContent) {
    recorder.finish("detect", "completed", "detectCompleted", {
      signals: totalDetections(report.detections),
    });
  } else {
    recorder.finish("detect", "skipped", "detectMetadataOnly");
  }

  if (report) {
    const graphChanges =
      report.addedEntities + report.reinforcedEntities + report.addedRelationships;
    recorder.finish(
      "knowledge_graph",
      "completed",
      graphChanges > 0 ? "graphUpdated" : "graphUnchanged",
      {
        entities: report.addedEntities,
        reinforced: report.reinforcedEntities,
        relationships: report.addedRelationships,
      },
    );
  } else {
    recorder.finish("knowledge_graph", "completed", "graphUnchanged", {
      entities: 0,
      reinforced: 0,
      relationships: 0,
    });
  }

  // Step 7 — chunk records, keyed by the asset id the merge just assigned,
  // written in the same save as the storage/uploader metadata patch.
  recorder.start("store_vectors");
  const knowledge = ensureWorkspaceKnowledge(ingested.workspace.knowledge);
  const chunkRecords = buildChunkRecords({
    workspaceId,
    assetId: ingested.asset.id,
    chunks,
    vectors: embedding?.status === "ready" ? embedding.vectors : null,
    model: embedding?.model ?? null,
    dimensions: embedding?.dimensions ?? null,
    pendingReason: embedding?.reason ?? null,
    pendingStatus: embedding?.status === "failed" ? "failed" : "pending",
  });

  const patchedAssets = knowledge.assets.map((asset) =>
    asset.id === ingested.asset.id ? { ...asset, ...assetPatch } : asset,
  );

  let workspace: CompanyWorkspace = {
    ...ingested.workspace,
    knowledge: {
      ...knowledge,
      assets: patchedAssets,
      chunks: upsertChunkRecords(knowledge.chunks, chunkRecords),
    },
  };
  workspace = await store.workspaces.save(workspace);
  onWorkspace?.(workspace);

  if (chunkRecords.length === 0) {
    recorder.finish("store_vectors", "skipped", "vectorsNoChunks");
  } else {
    const ready = chunkRecords.filter((c) => c.embeddingStatus === "ready").length;
    recorder.finish("store_vectors", "completed", "vectorsStored", {
      chunks: chunkRecords.length,
      ready,
    });
  }

  // Step 8 — published understanding, recomputed through the existing
  // Discovery Score. No second scoring system, and it never goes down.
  recorder.start("readiness");
  const refreshed = refreshUnderstandingFromEvidence(workspace);
  if (refreshed.changed) {
    workspace = await store.workspaces.save(refreshed.workspace);
    onWorkspace?.(workspace);
    recorder.finish("readiness", "completed", "readinessLifted", {
      from: refreshed.previous,
      to: refreshed.next,
    });
  } else {
    recorder.finish("readiness", "completed", "readinessUnchanged");
  }

  // Steps 9 + 10 — derivations. Measured, not stored: every workspace
  // surface recomputes these from the object we just saved.
  recorder.start("insights");
  const insightsAfter = countInsights(workspace);
  const newInsights = Math.max(0, insightsAfter - insightsBefore);
  recorder.finish(
    "insights",
    "completed",
    newInsights > 0 ? "insightsNew" : "insightsUnchanged",
    { count: newInsights },
  );

  recorder.start("recommendations");
  const recommendationsAfter = countRecommendations(workspace);
  const newRecommendations = Math.max(0, recommendationsAfter - recommendationsBefore);
  recorder.finish(
    "recommendations",
    "completed",
    newRecommendations > 0 ? "recommendationsNew" : "recommendationsRefreshed",
    { count: newRecommendations, total: recommendationsAfter },
  );

  const finalAsset =
    workspace.knowledge.assets.find((asset) => asset.id === ingested.asset.id) ??
    ingested.asset;

  // "queued" is not a failure — it is the honest state for a format whose
  // content reader is not active yet (an image with no OCR key). The
  // document is stored, classified and searchable by metadata; only its
  // content is unread.
  const stage: DocumentProcessingJob["stage"] =
    ingested.outcome === "processed"
      ? "completed"
      : ingested.outcome === "queued"
        ? "queued"
        : "failed";

  recorder.setStage(stage);
  const job: DocumentProcessingJob = {
    ...recorder.job(),
    assetId: finalAsset.id,
    stage,
  };
  onJob?.(job);

  return {
    job,
    workspace,
    asset: finalAsset,
    outcome: ingested.outcome,
    message: ingested.message,
    report,
    extraction,
    chunkCount: chunks.length,
    embedding,
    understandingBefore,
    understandingAfter: workspace.businessUnderstanding,
    newInsights,
    newRecommendations,
  };
}

export interface ProcessMeetingTranscriptParams {
  workspaceId: string;
  /** Meeting title — reused as `DocumentPipelineRun.job.fileName` so this run is a drop-in `DocumentPipelineRun` (see `MeetingTranscriptPipelineRun`). */
  title: string;
  transcriptText: string;
  /** Named attendees, if the client/consultant entered any — never inferred from detected text, to avoid presenting a guess as a fact. */
  participants?: string[];
  /** ISO date the meeting happened; defaults to now (the moment it was recorded as evidence). */
  meetingDate?: string;
  onJob?: (job: DocumentProcessingJob) => void;
  onWorkspace?: (workspace: CompanyWorkspace) => void;
}

/**
 * A meeting transcript's pipeline run. Deliberately shaped as a
 * `DocumentPipelineRun` (not a parallel type) so it can be fed straight into
 * `buildDocumentChangeSummary` — the same "what changed" debrief Mission 21
 * built for document batches — with zero duplication; `meeting` is the one
 * addition a transcript needs beyond what a document run already has.
 */
export interface MeetingTranscriptPipelineRun extends DocumentPipelineRun {
  meeting: Meeting;
}

/**
 * Run one meeting transcript (pasted or typed text) through the same
 * pipeline an uploaded document gets, minus the two stages that only make
 * sense for bytes on disk:
 *
 *   1-2 OCR / extract    skipped — the text is already text
 *   3   Chunk            `chunkDocumentText` (unchanged)
 *   4   Embed            `embedDocumentChunks` (unchanged)
 *   5-6 Detect + merge   `ingestSource(..., "meeting_transcript")` (unchanged)
 *   7   Store vectors    `buildChunkRecords` / `upsertChunkRecords` (unchanged)
 *   8   Readiness        `refreshUnderstandingFromEvidence` (unchanged)
 *   9-10 Insights/recs   measured the same way
 *
 * On top of that, this stage also writes a first-class `Meeting` record
 * (Mission 22) so a pasted transcript joins `workspace.meetings` the same
 * way a completed guided interview does (`lib/memory/apply-interview.ts`)
 * — the Preparation Brief's "previous meetings" and any future surface that
 * reads `CompanyWorkspace.meetings` see it without a separate code path.
 * It is tagged `kind: "transcript_ingest"` (see `lib/memory/meeting-kind.ts`)
 * — an internal ingestion event, never counted as a human discovery session
 * in client-facing copy.
 */
export async function processMeetingTranscript(
  params: ProcessMeetingTranscriptParams,
): Promise<MeetingTranscriptPipelineRun | null> {
  const { workspaceId, title, transcriptText, onJob, onWorkspace } = params;
  const participants = params.participants ?? [];

  const store = getClientCompanyMemoryStore();
  const before = await store.workspaces.get(workspaceId);
  if (!before) return null;

  const insightsBefore = countInsights(before);
  const recommendationsBefore = countRecommendations(before);
  const understandingBefore = before.businessUnderstanding;

  const recorder = createStepRecorder(
    createDocumentProcessingJob(workspaceId, `pending_meeting_${createId("asset")}`, title),
    onJob,
  );
  recorder.setStage("analyzing");

  recorder.start("ocr");
  recorder.finish("ocr", "skipped", "ocrNotApplicable");

  recorder.start("extract_text");
  const trimmed = transcriptText.trim();
  const extraction: TextExtractionResult = trimmed
    ? {
        status: "extracted",
        method: "plain_text",
        text: trimmed,
        charCount: trimmed.length,
        reason: null,
      }
    : {
        status: "empty",
        method: "none",
        text: "",
        charCount: 0,
        reason: "El texto de la transcripción está vacío.",
      };
  if (extraction.status === "extracted") {
    recorder.finish("extract_text", "completed", "extractPlainText", {
      chars: extraction.charCount,
    });
  } else {
    recorder.finish("extract_text", "skipped", "extractEmpty", undefined, extraction.reason);
  }

  const chunks = chunkStep(extraction, recorder);
  const embedding = await embedStep(chunks, recorder);

  recorder.start("detect");
  recorder.start("knowledge_graph");

  const ingested = await ingestSource(workspaceId, {
    sourceType: "meeting_transcript",
    label: title,
    textContent: extraction.status === "extracted" ? extraction.text : undefined,
    metadata: {
      title,
      participants: participants.join(", "),
      meetingDate: params.meetingDate ?? nowIso(),
    },
  });

  if (!ingested) {
    recorder.finish("detect", "failed", "workspaceMissing");
    recorder.finish("knowledge_graph", "failed", "workspaceMissing");
    recorder.setStage("failed", "Workspace not found during ingest.");
    return null;
  }

  const report = ingested.report;
  if (report.readContent) {
    recorder.finish("detect", "completed", "detectCompleted", {
      signals: totalDetections(report.detections),
    });
  } else {
    recorder.finish("detect", "skipped", "detectMetadataOnly");
  }

  const graphChanges =
    report.addedEntities + report.reinforcedEntities + report.addedRelationships;
  recorder.finish(
    "knowledge_graph",
    "completed",
    graphChanges > 0 ? "graphUpdated" : "graphUnchanged",
    {
      entities: report.addedEntities,
      reinforced: report.reinforcedEntities,
      relationships: report.addedRelationships,
    },
  );

  recorder.start("store_vectors");
  const knowledge = ensureWorkspaceKnowledge(ingested.workspace.knowledge);
  const chunkRecords = buildChunkRecords({
    workspaceId,
    assetId: ingested.asset.id,
    chunks,
    vectors: embedding?.status === "ready" ? embedding.vectors : null,
    model: embedding?.model ?? null,
    dimensions: embedding?.dimensions ?? null,
    pendingReason: embedding?.reason ?? null,
    pendingStatus: embedding?.status === "failed" ? "failed" : "pending",
  });

  const stamp = nowIso();
  const meeting: Meeting = {
    id: createId("meeting"),
    workspaceId,
    title,
    date: params.meetingDate ?? stamp,
    participants,
    conversationId: null,
    interviewId: null,
    kind: "transcript_ingest",
    summary: report.message,
    discoveries: report.learnedLines,
    questionsAnswered: [],
    questionsRemaining: report.stillNeedLines,
    generatedReport: null,
    businessUnderstandingAfter: ingested.workspace.businessUnderstanding,
  };

  const meetingEvent: TimelineEvent = {
    id: createId("timeline"),
    workspaceId,
    date: stamp,
    title: `Transcripción de reunión registrada · ${title}`,
    description: report.message,
    category: "meeting",
    meetingId: meeting.id,
  };

  let workspace: CompanyWorkspace = {
    ...ingested.workspace,
    knowledge: {
      ...knowledge,
      chunks: upsertChunkRecords(knowledge.chunks, chunkRecords),
    },
    meetings: [meeting, ...ingested.workspace.meetings],
    timeline: [meetingEvent, ...ingested.workspace.timeline],
  };
  workspace = await store.workspaces.save(workspace);
  onWorkspace?.(workspace);

  if (chunkRecords.length === 0) {
    recorder.finish("store_vectors", "skipped", "vectorsNoChunks");
  } else {
    const ready = chunkRecords.filter((c) => c.embeddingStatus === "ready").length;
    recorder.finish("store_vectors", "completed", "vectorsStored", {
      chunks: chunkRecords.length,
      ready,
    });
  }

  recorder.start("readiness");
  const refreshed = refreshUnderstandingFromEvidence(workspace);
  if (refreshed.changed) {
    workspace = await store.workspaces.save(refreshed.workspace);
    onWorkspace?.(workspace);
    recorder.finish("readiness", "completed", "readinessLifted", {
      from: refreshed.previous,
      to: refreshed.next,
    });
  } else {
    recorder.finish("readiness", "completed", "readinessUnchanged");
  }

  recorder.start("insights");
  const insightsAfter = countInsights(workspace);
  const newInsights = Math.max(0, insightsAfter - insightsBefore);
  recorder.finish(
    "insights",
    "completed",
    newInsights > 0 ? "insightsNew" : "insightsUnchanged",
    { count: newInsights },
  );

  recorder.start("recommendations");
  const recommendationsAfter = countRecommendations(workspace);
  const newRecommendations = Math.max(0, recommendationsAfter - recommendationsBefore);
  recorder.finish(
    "recommendations",
    "completed",
    newRecommendations > 0 ? "recommendationsNew" : "recommendationsRefreshed",
    { count: newRecommendations, total: recommendationsAfter },
  );

  const finalAsset =
    workspace.knowledge.assets.find((asset) => asset.id === ingested.asset.id) ??
    ingested.asset;
  const finalMeeting =
    workspace.meetings.find((m) => m.id === meeting.id) ?? meeting;

  const stage: DocumentProcessingJob["stage"] =
    report.status === "processed"
      ? "completed"
      : report.status === "queued"
        ? "queued"
        : "failed";

  recorder.setStage(stage);
  const job: DocumentProcessingJob = {
    ...recorder.job(),
    assetId: finalAsset.id,
    stage,
  };
  onJob?.(job);

  return {
    job,
    workspace,
    asset: finalAsset,
    outcome: report.status,
    message: report.message,
    report,
    extraction,
    chunkCount: chunks.length,
    embedding,
    understandingBefore,
    understandingAfter: workspace.businessUnderstanding,
    newInsights,
    newRecommendations,
    meeting: finalMeeting,
  };
}
