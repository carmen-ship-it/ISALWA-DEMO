/**
 * Knowledge Ingestion Engine — Mission 3 domain contracts.
 * Real uploads via `lib/knowledge/intake.ts`; no fabricated seed content —
 * the Knowledge Center starts empty until something real is uploaded.
 */

export type KnowledgeAssetType =
  | "company_document"
  | "meeting_transcript"
  | "customer_list"
  | "sales_data"
  | "invoice"
  | "presentation"
  | "image"
  | "process_document"
  | "policy"
  | "manual_notes"
  | "future_import";

export type KnowledgeAssetStatus =
  | "designed"
  | "queued"
  | "parsing"
  | "extracting"
  | "processed"
  | "failed";

export type KnowledgeCategory =
  | "Company Documents"
  | "Meeting Transcripts"
  | "Customer Lists"
  | "Sales Data"
  | "Invoices"
  | "Presentations"
  | "Images"
  | "Process Documents"
  | "Policies"
  | "Manual Notes"
  | "Future Imports";

export type KnowledgeEntityKind =
  | "Company"
  | "Person"
  | "Department"
  | "Customer"
  | "Supplier"
  | "Product"
  | "Workflow"
  | "Location"
  | "System"
  | "PainPoint"
  | "Document"
  | "Meeting";

export type KnowledgeRelationKind =
  | "Uses"
  | "DependsOn"
  | "ReportsTo"
  | "Owns"
  | "Approves"
  | "Produces"
  | "Purchases"
  | "CommunicatesWith";

export type KnowledgeCoverageArea =
  | "Customers"
  | "Sales"
  | "Operations"
  | "Finance"
  | "HR";

export type KnowledgeExtractionProviderId =
  | "pdf_reader"
  | "word_reader"
  | "presentation_reader"
  | "excel_reader"
  | "image_reader"
  | "text_reader"
  | "ocr"
  | "transcript_reader"
  | "crm_import"
  | "erp_import"
  | "email_import"
  | "whatsapp_import";

export type KnowledgeConnectorId =
  | "google_drive"
  | "dropbox"
  | "onedrive"
  | "sharepoint"
  | "zoho"
  | "hubspot"
  | "salesforce"
  | "sap"
  | "quickbooks"
  | "xero"
  | "whatsapp"
  | "google_workspace"
  | "microsoft_365";

export type PipelineStageId =
  | "upload"
  | "parser"
  | "knowledge_extraction"
  | "memory"
  | "recommendations"
  | "reasoning_engine";

/**
 * Real Document Uploads — where the file bytes actually live. Additive and
 * optional so every existing `KnowledgeAsset` literal (legacy intake paths,
 * seed data, tests) keeps compiling untouched; only the new real-upload path
 * (`lib/documents/upload.ts`) populates these.
 */
export type DocumentStorageProviderId = "supabase" | "local";

export interface KnowledgeAsset {
  id: string;
  workspaceId: string;
  title: string;
  type: KnowledgeAssetType;
  category: KnowledgeCategory;
  source: string;
  status: KnowledgeAssetStatus;
  uploadedAt: string;
  processedAt: string | null;
  summary: string | null;
  tags: string[];
  confidence: number;
  entities: string[];
  relationships: string[];
  coverageAreas: KnowledgeCoverageArea[];
  /** File size in bytes — null for non-file sources (manual notes, etc). */
  sizeBytes?: number | null;
  /** Browser-reported MIME type at upload time. */
  mimeType?: string | null;
  uploadedByUserId?: string | null;
  uploadedByName?: string | null;
  /** Where the bytes actually live. "local" = in-memory dev fallback, never persisted across reloads. */
  storageProvider?: DocumentStorageProviderId | null;
  storageBucket?: string | null;
  /** Path within the bucket (Supabase) — used to derive a fresh signed URL on demand. Never a raw public URL (bucket is private). */
  storagePath?: string | null;
}

export interface KnowledgeEntity {
  id: string;
  workspaceId: string;
  kind: KnowledgeEntityKind;
  name: string;
  summary: string | null;
  sourceAssetIds: string[];
  confidence: number;
  metadata: Record<string, string>;
}

export interface KnowledgeRelationship {
  id: string;
  workspaceId: string;
  kind: KnowledgeRelationKind;
  fromEntityId: string;
  toEntityId: string;
  label: string;
  sourceAssetIds: string[];
  confidence: number;
}

export interface KnowledgeCoverageSlice {
  area: KnowledgeCoverageArea;
  percent: number;
  evidenceAssetIds: string[];
  note: string;
}

/**
 * Unified Business Knowledge Intake — deterministic business rule surfaced
 * from any intake source (`lib/intake`). Statement text only, no AI inference.
 */
export interface KnowledgeBusinessRule {
  id: string;
  statement: string;
  sourceAssetIds: string[];
  confidence: number;
  createdAt: string;
}

/**
 * Unified Business Knowledge Intake — soft clarification flag when two
 * sources disagree. Never accusatory, never auto-resolved.
 */
export interface KnowledgeContradictionFlag {
  id: string;
  statement: string;
  sourceAssetIds: string[];
  confidence: number;
  createdAt: string;
}

/**
 * Unified Business Knowledge Intake — append-only evidence ledger. One entry
 * per structured signal an extractor produced, kept even after it is folded
 * into an entity/relationship, so "why do we believe this" stays answerable.
 */
export interface KnowledgeEvidenceLogEntry {
  id: string;
  /** IntakeSourceType — kept as string here so types/ never depends on lib/. */
  sourceType: string;
  sourceLabel: string;
  statement: string;
  /** IntakeSlotKind — fact | entity | relationship | unknown | ... */
  slot: string;
  confidence: number;
  createdAt: string;
  targetId?: string;
}

export interface WorkspaceKnowledge {
  assets: KnowledgeAsset[];
  entities: KnowledgeEntity[];
  relationships: KnowledgeRelationship[];
  lastAnalysisAt: string | null;
  summary: string | null;
  themes: string[];
  unknownAreas: string[];
  coverage: KnowledgeCoverageSlice[];
  /** Unified Business Knowledge Intake — additive, defaults to []. */
  businessRules: KnowledgeBusinessRule[];
  /** Unified Business Knowledge Intake — additive, defaults to []. */
  contradictions: KnowledgeContradictionFlag[];
  /** Unified Business Knowledge Intake — additive, defaults to []. */
  evidenceLog: KnowledgeEvidenceLogEntry[];
}

/** Pipeline stages — architecture only. No runtime processing. */
export interface KnowledgePipelineStage {
  id: PipelineStageId;
  title: string;
  description: string;
  status: "designed" | "planned";
  next: PipelineStageId | null;
}

export interface KnowledgeExtractionProvider {
  id: KnowledgeExtractionProviderId;
  title: string;
  description: string;
  status: "designed" | "planned";
  /** Contract only — never implemented in Mission 3. */
  extract(asset: KnowledgeAsset): Promise<never>;
}

export interface KnowledgeConnector {
  id: KnowledgeConnectorId;
  title: string;
  description: string;
  status: "designed" | "planned";
  feedsInto: "knowledge_center";
}

/**
 * Context the consultant brain may consume alongside conversation + memory.
 * Assembled outside lib/reasoning — reasoning is not rewritten.
 */
export interface KnowledgeReasoningContext {
  workspaceId: string;
  documentCount: number;
  themes: string[];
  unknownAreas: string[];
  entityNames: string[];
  coverage: KnowledgeCoverageSlice[];
  briefingLines: string[];
  lastAnalysisAt: string | null;
}
