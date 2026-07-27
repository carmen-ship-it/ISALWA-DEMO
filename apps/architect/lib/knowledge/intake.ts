/**
 * Executive Knowledge Intake — wires real file uploads into the existing
 * Mission 3 Knowledge Engine (types/knowledge.ts, lib/knowledge/coverage.ts,
 * lib/knowledge/extraction.ts). No OCR. No LLM calls. No new pipeline.
 *
 * Classification is deterministic metadata heuristics (filename + extension),
 * the same technique already used by lib/preparation/knowledge-merge.ts
 * (`implySourceKindsFromAssets`). File bytes are never parsed or persisted —
 * only the upload's metadata and the derived KnowledgeAsset are stored on
 * CompanyWorkspace.knowledge (existing workspace JSON persistence path).
 *
 * Whether an asset lands as "processed" or "queued" is driven by the status
 * already declared on KNOWLEDGE_EXTRACTION_PROVIDERS — "designed" providers
 * (pdf/word/excel/presentation/transcript) produce a processed asset with
 * heuristic coverage; "planned" providers (image/OCR) honestly stay queued.
 */

import { createId, nowIso } from "@/lib/utils";
import type {
  CompanyWorkspace,
  KnowledgeAsset,
  KnowledgeAssetStatus,
  KnowledgeAssetType,
  KnowledgeCategory,
  KnowledgeCoverageArea,
  KnowledgeEntity,
  KnowledgeExtractionProviderId,
  TimelineEvent,
  WorkspaceKnowledge,
} from "@/types";
import { getClientCompanyMemoryStore } from "@/lib/repositories";
import { KNOWLEDGE_EXTRACTION_PROVIDERS } from "./extraction";
import { buildWorkspaceKnowledge, ensureWorkspaceKnowledge } from "./coverage";

export interface KnowledgeUploadFileMeta {
  name: string;
  size: number;
  mimeType: string;
}

export type KnowledgeUploadOutcome =
  | "processed"
  | "queued"
  | "unsupported"
  | "too_large";

export interface KnowledgeUploadClassification {
  type: KnowledgeAssetType;
  category: KnowledgeCategory;
  provider: KnowledgeExtractionProviderId | null;
  providerStatus: "designed" | "planned" | null;
  coverageAreas: KnowledgeCoverageArea[];
  tags: string[];
  confidence: number;
  matchedKeyword: string | null;
}

export interface KnowledgeUploadResult {
  outcome: KnowledgeUploadOutcome;
  asset: KnowledgeAsset;
  entity: KnowledgeEntity | null;
  workspace: CompanyWorkspace;
  message: string;
}

/** Executive-facing accept list — Real Document Uploads' eight supported families. */
export const KNOWLEDGE_UPLOAD_ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.gif,.heic,.txt,.md,.markdown,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/*,text/plain,text/markdown";

export const KNOWLEDGE_UPLOAD_MAX_BYTES = 25 * 1024 * 1024; // 25MB — client-side guardrail only.

const EXTENSION_GROUPS = {
  pdf: ["pdf"],
  word: ["doc", "docx"],
  excel: ["xls", "xlsx", "csv"],
  presentation: ["ppt", "pptx"],
  image: ["png", "jpg", "jpeg", "webp", "gif", "heic"],
  text: ["txt", "md", "markdown"],
} as const;

function extensionOf(filename: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(filename.trim());
  return match ? match[1]!.toLowerCase() : "";
}

function groupForExtension(ext: string): keyof typeof EXTENSION_GROUPS | null {
  for (const [group, exts] of Object.entries(EXTENSION_GROUPS)) {
    if ((exts as readonly string[]).includes(ext)) {
      return group as keyof typeof EXTENSION_GROUPS;
    }
  }
  return null;
}

/** Bilingual (ES/EN) filename keyword → business classification. Metadata only — no content is read. */
const KEYWORD_RULES: Array<{
  pattern: RegExp;
  type: KnowledgeAssetType;
  category: KnowledgeCategory;
  coverageAreas: KnowledgeCoverageArea[];
  keyword: string;
}> = [
  {
    pattern: /client|cliente|crm|contact|contacto/i,
    type: "customer_list",
    category: "Customer Lists",
    coverageAreas: ["Customers"],
    keyword: "cliente/CRM",
  },
  {
    pattern: /factura|invoice|recibo|billing/i,
    type: "invoice",
    category: "Invoices",
    coverageAreas: ["Finance"],
    keyword: "factura/invoice",
  },
  {
    pattern: /venta|sale|pedido|order|ingreso|revenue/i,
    type: "sales_data",
    category: "Sales Data",
    coverageAreas: ["Sales"],
    keyword: "venta/sales",
  },
  {
    pattern: /transcri|reunion|reunión|meeting|minuta|acta/i,
    type: "meeting_transcript",
    category: "Meeting Transcripts",
    coverageAreas: ["Operations", "HR"],
    keyword: "transcripción/reunión",
  },
  {
    pattern: /politica|política|policy|reglamento|manual/i,
    type: "policy",
    category: "Policies",
    coverageAreas: ["Operations", "HR"],
    keyword: "política/policy",
  },
  {
    pattern: /proceso|process|workflow|procedimiento|\bsop\b/i,
    type: "process_document",
    category: "Process Documents",
    coverageAreas: ["Operations"],
    keyword: "proceso/process",
  },
];

/**
 * Classify an upload from filename + extension only (no bytes are read).
 * Mirrors the existing metadata-heuristic style of
 * `implySourceKindsFromAssets` in lib/preparation/knowledge-merge.ts.
 */
export function classifyKnowledgeUpload(
  file: KnowledgeUploadFileMeta,
): KnowledgeUploadClassification {
  const ext = extensionOf(file.name);
  const group = groupForExtension(ext);

  if (!group) {
    return {
      type: "future_import",
      category: "Future Imports",
      provider: null,
      providerStatus: null,
      coverageAreas: [],
      tags: [ext || "desconocido"],
      confidence: 0,
      matchedKeyword: null,
    };
  }

  if (group === "presentation") {
    return withProviderStatus({
      type: "presentation",
      category: "Presentations",
      provider: "presentation_reader",
      coverageAreas: ["Operations", "Sales"],
      tags: ["presentación", ext],
      confidence: 0.6,
      matchedKeyword: null,
    });
  }

  if (group === "image") {
    return withProviderStatus({
      type: "image",
      category: "Images",
      provider: "image_reader",
      coverageAreas: [],
      tags: ["imagen", ext],
      confidence: 0,
      matchedKeyword: null,
    });
  }

  const providerByGroup: Record<
    "pdf" | "word" | "excel" | "text",
    KnowledgeExtractionProviderId
  > = {
    pdf: "pdf_reader",
    word: "word_reader",
    excel: "excel_reader",
    text: "text_reader",
  };

  const keywordMatch = KEYWORD_RULES.find((rule) => rule.pattern.test(file.name));
  if (keywordMatch) {
    return withProviderStatus({
      type: keywordMatch.type,
      category: keywordMatch.category,
      provider: providerByGroup[group],
      coverageAreas: keywordMatch.coverageAreas,
      tags: [keywordMatch.keyword, ext],
      confidence: 0.72,
      matchedKeyword: keywordMatch.keyword,
    });
  }

  return withProviderStatus({
    type: "company_document",
    category: "Company Documents",
    provider: providerByGroup[group],
    coverageAreas: ["Operations"],
    tags: [ext],
    confidence: 0.55,
    matchedKeyword: null,
  });
}

function withProviderStatus(
  base: Omit<KnowledgeUploadClassification, "providerStatus">,
): KnowledgeUploadClassification {
  const provider = base.provider
    ? KNOWLEDGE_EXTRACTION_PROVIDERS.find((p) => p.id === base.provider)
    : null;
  return {
    ...base,
    providerStatus: provider?.status ?? null,
  };
}

function outcomeFor(
  classification: KnowledgeUploadClassification,
  tooLarge: boolean,
): KnowledgeUploadOutcome {
  if (tooLarge) return "too_large";
  if (classification.providerStatus === "designed") return "processed";
  if (classification.providerStatus === "planned") return "queued";
  return "unsupported";
}

function statusFor(outcome: KnowledgeUploadOutcome): KnowledgeAssetStatus {
  switch (outcome) {
    case "processed":
      return "processed";
    case "queued":
      return "queued";
    default:
      return "failed";
  }
}

function summaryFor(
  file: KnowledgeUploadFileMeta,
  classification: KnowledgeUploadClassification,
  outcome: KnowledgeUploadOutcome,
): string {
  const base = `"${file.name}" clasificado como ${classification.category.toLowerCase()}`;
  switch (outcome) {
    case "processed":
      return `${base} a partir del nombre y tipo de archivo (sin lectura de contenido todavía).`;
    case "queued":
      return `${base}. Este formato está en cola — la lectura de imágenes aún no está activa.`;
    case "too_large":
      return `El archivo supera el límite de ${Math.round(
        KNOWLEDGE_UPLOAD_MAX_BYTES / (1024 * 1024),
      )}MB y no fue procesado.`;
    default:
      return `"${file.name}" fue recibido, pero este formato aún no tiene un lector asignado.`;
  }
}

function messageFor(
  file: KnowledgeUploadFileMeta,
  outcome: KnowledgeUploadOutcome,
): string {
  switch (outcome) {
    case "processed":
      return `${file.name}: procesado y sumado a la cobertura de conocimiento.`;
    case "queued":
      return `${file.name}: recibido y en cola — la lectura de este formato está planeada, no activa aún.`;
    case "too_large":
      return `${file.name}: no se procesó — supera el tamaño máximo permitido.`;
    default:
      return `${file.name}: recibido, pero el formato no está soportado todavía.`;
  }
}

function timelineTitleFor(
  classification: KnowledgeUploadClassification,
  outcome: KnowledgeUploadOutcome,
): string {
  if (outcome === "processed") {
    return `Conocimiento actualizado · ${classification.category}`;
  }
  if (outcome === "queued") {
    return `Documento recibido · ${classification.category}`;
  }
  return "Documento recibido · en revisión";
}

/**
 * Ingest a single uploaded file's metadata into the existing Knowledge Engine.
 * Persists via the existing workspace store (Supabase JSONB when configured,
 * localStorage otherwise) — no new persistence path is introduced.
 */
export async function ingestKnowledgeUpload(
  workspaceId: string,
  file: KnowledgeUploadFileMeta,
): Promise<KnowledgeUploadResult | null> {
  const store = getClientCompanyMemoryStore();
  const workspace = await store.workspaces.get(workspaceId);
  if (!workspace) return null;

  const tooLarge = file.size > KNOWLEDGE_UPLOAD_MAX_BYTES;
  const classification = classifyKnowledgeUpload(file);
  const outcome = outcomeFor(classification, tooLarge);
  const status = statusFor(outcome);
  const now = nowIso();
  const processed = status === "processed";

  const asset: KnowledgeAsset = {
    id: createId("asset"),
    workspaceId,
    title: file.name,
    type: classification.type,
    category: classification.category,
    source: `${classification.provider ?? "sin lector"} · subida ejecutiva`,
    status,
    uploadedAt: now,
    processedAt: processed ? now : null,
    summary: summaryFor(file, classification, outcome),
    tags: classification.tags,
    confidence: processed ? classification.confidence : 0,
    entities: [],
    relationships: [],
    coverageAreas: processed ? classification.coverageAreas : [],
  };

  const entity: KnowledgeEntity | null = processed
    ? {
        id: createId("entity"),
        workspaceId,
        kind: "Document",
        name: file.name,
        summary: asset.summary,
        sourceAssetIds: [asset.id],
        confidence: classification.confidence,
        metadata: {
          category: classification.category,
          extension: extensionOf(file.name),
        },
      }
    : null;

  asset.entities = entity ? [entity.id] : [];

  const priorKnowledge = ensureWorkspaceKnowledge(workspace.knowledge);
  const nextAssets = [...priorKnowledge.assets, asset];
  const nextEntities = entity
    ? [...priorKnowledge.entities, entity]
    : priorKnowledge.entities;
  const hasProcessed = nextAssets.some((a) => a.status === "processed");

  const nextKnowledge: WorkspaceKnowledge = buildWorkspaceKnowledge({
    assets: nextAssets,
    entities: nextEntities,
    relationships: priorKnowledge.relationships,
    summary: intakeSummary(nextAssets, priorKnowledge.summary),
    themes: priorKnowledge.themes,
    lastAnalysisAt: hasProcessed ? now : priorKnowledge.lastAnalysisAt ?? now,
    // Preserve records the Unified Business Knowledge Intake pipeline
    // (lib/intake) may have written — this legacy path must never erase them.
    businessRules: priorKnowledge.businessRules,
    contradictions: priorKnowledge.contradictions,
    evidenceLog: priorKnowledge.evidenceLog,
    chunks: priorKnowledge.chunks,
  });

  const timelineEvent: TimelineEvent = {
    id: createId("timeline"),
    workspaceId,
    date: now,
    title: timelineTitleFor(classification, outcome),
    description: asset.summary ?? file.name,
    category: "knowledge",
  };

  const nextWorkspace: CompanyWorkspace = {
    ...workspace,
    knowledge: nextKnowledge,
    updatedAt: now,
    lastActivityAt: now,
    lastActivityLabel: `Conocimiento: ${file.name}`,
    timeline: [timelineEvent, ...workspace.timeline],
  };

  const saved = await store.workspaces.save(nextWorkspace);

  return {
    outcome,
    asset,
    entity,
    workspace: saved,
    message: messageFor(file, outcome),
  };
}

function intakeSummary(
  assets: KnowledgeAsset[],
  priorSummary: string | null,
): string {
  const processedCount = assets.filter((a) => a.status === "processed").length;
  const queuedCount = assets.filter((a) => a.status === "queued").length;
  if (processedCount === 0 && queuedCount === 0) {
    return priorSummary ?? "Aún no se ha analizado conocimiento de la empresa.";
  }
  const parts = [
    `${processedCount} documento${processedCount === 1 ? "" : "s"} procesado${processedCount === 1 ? "" : "s"}`,
  ];
  if (queuedCount > 0) {
    parts.push(
      `${queuedCount} en cola (formato con lectura planeada, aún no activa)`,
    );
  }
  return `${parts.join(" · ")}.`;
}
