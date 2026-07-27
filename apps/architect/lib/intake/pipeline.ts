/**
 * Unified Business Knowledge Intake — pipeline.
 *
 * Orchestration only: Source → Extractor → Normalizer → Dedup/Merge →
 * existing Knowledge Engine + Company Memory shapes. This is the single
 * entry point the Business Knowledge workspace section calls; it never
 * introduces a parallel store — everything lands on the same
 * `CompanyWorkspace` the rest of the product already reads.
 *
 * Upload → Parser → Knowledge Extraction → Memory  (matches `KNOWLEDGE_PIPELINE`
 * in `lib/knowledge/pipeline.ts` — this module is that pipeline's general
 * front door, not a replacement for it.)
 */

import { createId, nowIso } from "@/lib/utils";
import {
  classifyKnowledgeUpload,
  ingestKnowledgeUpload,
  KNOWLEDGE_UPLOAD_MAX_BYTES,
  type KnowledgeUploadResult,
} from "@/lib/knowledge/intake";
import { ensureWorkspaceKnowledge } from "@/lib/knowledge/coverage";
import { getClientCompanyMemoryStore } from "@/lib/repositories";
import type {
  CompanyWorkspace,
  KnowledgeAsset,
  KnowledgeAssetStatus,
  KnowledgeAssetType,
  KnowledgeCategory,
  KnowledgeCoverageArea,
  TimelineEvent,
  WorkspaceKnowledge,
} from "@/types";
import type {
  IntakeOutcome,
  IntakeSlots,
  IntakeSourceType,
  IntakeUnit,
} from "./contracts";
import { extractorFor } from "./extractors";
import { intakeSourceForExtension } from "./sources";
import { normalizeSlots } from "./normalizer";
import { mergeIntakeEntities } from "./entities";
import { mergeIntakeRelationships } from "./relationships";
import { appendEvidenceLog } from "./evidence";
import {
  mergeBusinessRules,
  mergeContradictions,
  mergeOpportunitySignalsIntoWorkspace,
  mergePainSignalsIntoWorkspace,
  mergeUnknownsIntoOpenQuestions,
} from "./deduplication";
import { findContradiction } from "./confidence";
import { deriveGapReport } from "./gaps";
import { buildLearnedLines, buildStillNeedLines, type IntakeMergeCounts } from "./summary";
import { buildWorkspaceKnowledge } from "@/lib/knowledge/coverage";

export interface IntakeSourceInput {
  sourceType: IntakeSourceType;
  label: string;
  metadata?: Record<string, string | number | boolean | undefined>;
  textContent?: string;
}

export interface IntakeIngestReport extends IntakeMergeCounts {
  sourceType: IntakeSourceType;
  status: IntakeOutcome;
  message: string;
  learnedLines: string[];
  stillNeedLines: string[];
}

export interface IntakeIngestResult {
  workspace: CompanyWorkspace;
  report: IntakeIngestReport;
  asset: KnowledgeAsset;
}

const NON_FILE_ASSET_TYPE: Partial<Record<IntakeSourceType, KnowledgeAssetType>> = {
  meeting_transcript: "meeting_transcript",
  manual_notes: "manual_notes",
  audio_transcript: "future_import",
  crm_export: "future_import",
  erp_export: "future_import",
  accounting_export: "future_import",
  email_archive: "future_import",
  folder: "future_import",
  api_connector: "future_import",
};

const NON_FILE_CATEGORY: Partial<Record<IntakeSourceType, KnowledgeCategory>> = {
  meeting_transcript: "Meeting Transcripts",
  manual_notes: "Manual Notes",
  audio_transcript: "Future Imports",
  crm_export: "Future Imports",
  erp_export: "Future Imports",
  accounting_export: "Future Imports",
  email_archive: "Future Imports",
  folder: "Future Imports",
  api_connector: "Future Imports",
};

const NON_FILE_COVERAGE: Partial<Record<IntakeSourceType, KnowledgeCoverageArea[]>> = {
  meeting_transcript: ["Operations", "HR"],
  manual_notes: [],
  audio_transcript: [],
  crm_export: ["Sales", "Customers"],
  erp_export: ["Operations"],
  accounting_export: ["Finance"],
  email_archive: [],
  folder: [],
  api_connector: [],
};

function statusToAssetStatus(status: IntakeOutcome): KnowledgeAssetStatus {
  switch (status) {
    case "processed":
      return "processed";
    case "queued":
      return "queued";
    default:
      return "failed";
  }
}

function buildAssetForUnit(
  unit: IntakeUnit,
  status: IntakeOutcome,
  message: string,
): KnowledgeAsset {
  const isFileLike =
    unit.sourceType === "pdf" ||
    unit.sourceType === "word" ||
    unit.sourceType === "excel" ||
    unit.sourceType === "powerpoint" ||
    unit.sourceType === "csv" ||
    unit.sourceType === "image" ||
    unit.sourceType === "text_file";

  if (isFileLike) {
    const fileName =
      typeof unit.metadata.fileName === "string"
        ? unit.metadata.fileName
        : unit.label;
    const fileSize =
      typeof unit.metadata.fileSize === "number" ? unit.metadata.fileSize : 0;
    const mimeType =
      typeof unit.metadata.mimeType === "string" ? unit.metadata.mimeType : "";
    const classification = classifyKnowledgeUpload({
      name: fileName,
      size: fileSize,
      mimeType,
    });
    const processed = status === "processed";
    return {
      id: createId("asset"),
      workspaceId: unit.workspaceId,
      title: fileName,
      type: classification.type,
      category: classification.category,
      source: `${classification.provider ?? "sin lector"} · Conocimiento del negocio`,
      status: statusToAssetStatus(status),
      uploadedAt: unit.receivedAt,
      processedAt: processed ? nowIso() : null,
      summary: message,
      tags: classification.tags,
      confidence: processed ? classification.confidence : 0,
      entities: [],
      relationships: [],
      coverageAreas: processed ? classification.coverageAreas : [],
    };
  }

  const type = NON_FILE_ASSET_TYPE[unit.sourceType] ?? "future_import";
  const category = NON_FILE_CATEGORY[unit.sourceType] ?? "Future Imports";
  const coverageAreas = NON_FILE_COVERAGE[unit.sourceType] ?? [];
  const processed = status === "processed";

  return {
    id: createId("asset"),
    workspaceId: unit.workspaceId,
    title: unit.label,
    type,
    category,
    source: `${unit.sourceType} · Conocimiento del negocio`,
    status: statusToAssetStatus(status),
    uploadedAt: unit.receivedAt,
    processedAt: processed ? nowIso() : null,
    summary: message,
    tags: [unit.sourceType],
    confidence: processed ? 0.55 : 0,
    entities: [],
    relationships: [],
    coverageAreas: processed ? coverageAreas : [],
  };
}

function collectPriorStatements(workspace: CompanyWorkspace): string[] {
  const knowledge = ensureWorkspaceKnowledge(workspace.knowledge);
  return [
    ...knowledge.themes,
    ...workspace.painPoints.map((p) => p.description),
    ...(workspace.conversationMemory?.knownFacts.map((f) => f.statement) ?? []),
  ];
}

/**
 * Ingest one source into a workspace. Reuses the existing Knowledge Engine
 * (assets/entities/relationships/coverage) and Company Memory shapes
 * (painPoints/opportunities/openQuestions) as the merge targets — intake
 * feeds those engines, it never stores a parallel copy.
 */
export async function ingestSource(
  workspaceId: string,
  input: IntakeSourceInput,
): Promise<IntakeIngestResult | null> {
  const store = getClientCompanyMemoryStore();
  const workspace = await store.workspaces.get(workspaceId);
  if (!workspace) return null;

  const unit: IntakeUnit = {
    id: createId("intake_unit"),
    workspaceId,
    sourceType: input.sourceType,
    label: input.label,
    receivedAt: nowIso(),
    metadata: input.metadata ?? {},
    textContent: input.textContent,
  };

  const extractor = extractorFor(input.sourceType);
  const result = await extractor.extract(unit);
  const slots: IntakeSlots = normalizeSlots(result.slots);

  const asset = buildAssetForUnit(unit, result.status, result.messageEs);
  const knowledge = ensureWorkspaceKnowledge(workspace.knowledge);

  const entityMerge = mergeIntakeEntities(
    knowledge.entities,
    slots.entities,
    workspaceId,
    asset.id,
  );
  const relationshipMerge = mergeIntakeRelationships(
    knowledge.relationships,
    slots.relationships,
    workspaceId,
    asset.id,
    entityMerge.nameIndex,
  );

  const priorStatements = collectPriorStatements(workspace);
  const detectedContradictions = slots.facts
    .map((fact) => findContradiction(priorStatements, fact.statement))
    .filter((match): match is NonNullable<typeof match> => match !== null)
    .map((match) => ({
      id: createId("contradiction"),
      statement: match.reason,
      evidenceIds: [] as string[],
      confidence: 0.6,
    }));

  const businessRuleMerge = mergeBusinessRules(
    knowledge.businessRules,
    slots.businessRules,
    asset.id,
  );
  const contradictionMerge = mergeContradictions(
    knowledge.contradictions,
    [...slots.contradictions, ...detectedContradictions],
    asset.id,
  );
  const painMerge = mergePainSignalsIntoWorkspace(
    workspace.painPoints,
    slots.painSignals,
  );
  const opportunityMerge = mergeOpportunitySignalsIntoWorkspace(
    workspace.opportunities,
    slots.opportunities,
  );

  const gaps = deriveGapReport(
    [...knowledge.assets, asset],
    slots.unknowns,
  );
  const openQuestionsMerge = mergeUnknownsIntoOpenQuestions(
    workspace.openQuestions,
    [...slots.unknowns.map((u) => u.label), ...gaps.labelsEs],
  );

  const nextThemes = Array.from(
    new Set([
      ...knowledge.themes,
      ...slots.facts.slice(0, 3).map((f) => f.statement),
    ]),
  ).slice(0, 12);

  const nextAssets = [...knowledge.assets, asset];
  const now = nowIso();

  const counts: IntakeMergeCounts = {
    addedEntities: entityMerge.added,
    reinforcedEntities: entityMerge.reinforced,
    addedRelationships: relationshipMerge.added,
    addedFacts: slots.facts.length,
    addedBusinessRules: businessRuleMerge.added,
    addedContradictions: contradictionMerge.added,
    addedPainSignals: painMerge.added,
    addedOpportunities: opportunityMerge.added,
    addedUnknowns: openQuestionsMerge.added,
  };

  const nextKnowledge: WorkspaceKnowledge = buildWorkspaceKnowledge({
    assets: nextAssets,
    entities: entityMerge.entities,
    relationships: relationshipMerge.relationships,
    summary: buildLearnedLines(counts, input.label)[0] ?? knowledge.summary ?? "",
    themes: nextThemes,
    lastAnalysisAt: result.status === "processed" ? now : knowledge.lastAnalysisAt ?? now,
    businessRules: businessRuleMerge.rules,
    contradictions: contradictionMerge.contradictions,
    evidenceLog: appendEvidenceLog(knowledge.evidenceLog, result.evidence),
  });

  const timelineEvent: TimelineEvent = {
    id: createId("timeline"),
    workspaceId,
    date: now,
    title:
      result.status === "processed"
        ? `Conocimiento actualizado · ${asset.category}`
        : "Documento recibido · en revisión",
    description: result.messageEs,
    category: "knowledge",
  };

  const nextWorkspace: CompanyWorkspace = {
    ...workspace,
    knowledge: nextKnowledge,
    painPoints: painMerge.painPoints,
    opportunities: opportunityMerge.opportunities,
    openQuestions: openQuestionsMerge.openQuestions,
    updatedAt: now,
    lastActivityAt: now,
    lastActivityLabel: `Conocimiento del negocio: ${input.label}`,
    timeline: [timelineEvent, ...workspace.timeline],
  };

  const saved = await store.workspaces.save(nextWorkspace);

  const report: IntakeIngestReport = {
    ...counts,
    sourceType: input.sourceType,
    status: result.status,
    message: result.messageEs,
    learnedLines: buildLearnedLines(counts, input.label),
    stillNeedLines: buildStillNeedLines(gaps),
  };

  return { workspace: saved, report, asset };
}

export interface IntakeFileUploadResult extends KnowledgeUploadResult {
  /** Present only on the Unified Intake path — richer than the legacy result. */
  report?: IntakeIngestReport;
}

/**
 * Adapter for the existing `KnowledgeUpload` widget — lets the client-facing
 * Business Knowledge section reuse that component's drag/drop UI verbatim
 * while routing file uploads through the richer Unified Intake pipeline
 * instead of the legacy single-entity extractor. Unsupported extensions
 * (and the 25MB guardrail) fall back to the original, already-correct
 * `ingestKnowledgeUpload` path — no behavior regression for edge cases.
 */
export async function ingestFileThroughIntake(
  workspaceId: string,
  file: { name: string; size: number; mimeType: string },
): Promise<IntakeFileUploadResult | null> {
  if (file.size > KNOWLEDGE_UPLOAD_MAX_BYTES) {
    return ingestKnowledgeUpload(workspaceId, file);
  }

  const match = /\.([a-z0-9]+)$/i.exec(file.name.trim());
  const ext = match ? match[1]! : "";
  const sourceDef = intakeSourceForExtension(ext);
  if (!sourceDef) {
    return ingestKnowledgeUpload(workspaceId, file);
  }

  const result = await ingestSource(workspaceId, {
    sourceType: sourceDef.id,
    label: file.name,
    metadata: {
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.mimeType,
    },
  });
  if (!result) return null;

  const entity =
    result.workspace.knowledge.entities.find(
      (e) => e.kind === "Document" && e.sourceAssetIds.includes(result.asset.id),
    ) ?? null;

  return {
    outcome: result.report.status,
    asset: result.asset,
    entity,
    workspace: result.workspace,
    message: result.report.message,
    report: result.report,
  };
}
