/**
 * Knowledge Ingestion Engine — Mission 3 domain contracts.
 * Architecture + mock data only. No uploads. No AI extraction.
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
  | "excel_reader"
  | "image_reader"
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

export interface WorkspaceKnowledge {
  assets: KnowledgeAsset[];
  entities: KnowledgeEntity[];
  relationships: KnowledgeRelationship[];
  lastAnalysisAt: string | null;
  summary: string | null;
  themes: string[];
  unknownAreas: string[];
  coverage: KnowledgeCoverageSlice[];
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
