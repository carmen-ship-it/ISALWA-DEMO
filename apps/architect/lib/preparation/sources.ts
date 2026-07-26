/**
 * Future preparation sources — contracts/enums only.
 * Mission 11: no fetch, upload, OCR, or connector implementations.
 */

/** Supported FUTURE source kinds the preparation engine may eventually consume. */
export type PreparationSourceKind =
  | "meeting_transcripts"
  | "customer_databases"
  | "excel"
  | "crm_exports"
  | "erp_exports"
  | "invoices"
  | "website"
  | "social_media"
  | "organizational_charts"
  | "documents"
  | "pdf"
  | "word"
  | "images"
  | "email";

export type PreparationSourceStatus = "designed" | "planned";

/**
 * Contract for a future intake source.
 * Callers must not invoke fetch — there is no runtime adapter yet.
 */
export interface PreparationSourceContract {
  kind: PreparationSourceKind;
  title: string;
  description: string;
  status: PreparationSourceStatus;
  /** Where evidence will land once intake exists. */
  feedsInto: "preparation_engine" | "knowledge_center";
}

/** Catalog of FUTURE sources — architecture only. */
export const PREPARATION_SOURCE_CONTRACTS: readonly PreparationSourceContract[] =
  [
    {
      kind: "meeting_transcripts",
      title: "Meeting transcripts",
      description:
        "Prior discovery and stakeholder conversations as structured evidence.",
      status: "designed",
      feedsInto: "preparation_engine",
    },
    {
      kind: "customer_databases",
      title: "Customer databases",
      description: "Customer lists and account tables for commercial coverage.",
      status: "planned",
      feedsInto: "knowledge_center",
    },
    {
      kind: "excel",
      title: "Excel",
      description: "Spreadsheets used as operational systems of record.",
      status: "designed",
      feedsInto: "knowledge_center",
    },
    {
      kind: "crm_exports",
      title: "CRM exports",
      description: "Pipeline, contacts, and activity exports from CRM tools.",
      status: "planned",
      feedsInto: "knowledge_center",
    },
    {
      kind: "erp_exports",
      title: "ERP exports",
      description: "ERP master data and transactional extracts.",
      status: "planned",
      feedsInto: "knowledge_center",
    },
    {
      kind: "invoices",
      title: "Invoices",
      description: "Billing evidence for finance and revenue patterns.",
      status: "designed",
      feedsInto: "knowledge_center",
    },
    {
      kind: "website",
      title: "Website",
      description: "Public company site for positioning and offer signals.",
      status: "planned",
      feedsInto: "preparation_engine",
    },
    {
      kind: "social_media",
      title: "Social media",
      description: "Public social presence for brand and market cues.",
      status: "planned",
      feedsInto: "preparation_engine",
    },
    {
      kind: "organizational_charts",
      title: "Organizational charts",
      description: "Org structure for roles, departments, and ownership.",
      status: "designed",
      feedsInto: "knowledge_center",
    },
    {
      kind: "documents",
      title: "Documents",
      description: "Generic company documents and process packs.",
      status: "designed",
      feedsInto: "knowledge_center",
    },
    {
      kind: "pdf",
      title: "PDF",
      description: "PDF policies, proposals, and operational manuals.",
      status: "designed",
      feedsInto: "knowledge_center",
    },
    {
      kind: "word",
      title: "Word",
      description: "Word SOPs, briefs, and internal memos.",
      status: "designed",
      feedsInto: "knowledge_center",
    },
    {
      kind: "images",
      title: "Images",
      description: "Photos of boards, forms, and physical process evidence.",
      status: "planned",
      feedsInto: "knowledge_center",
    },
    {
      kind: "email",
      title: "Email",
      description: "Email threads that encode handoffs and decisions.",
      status: "planned",
      feedsInto: "knowledge_center",
    },
  ] as const;

/**
 * Intentionally unimplemented — Mission 11 is contracts only.
 * Future missions may provide adapters; callers must not rely on this.
 */
export interface PreparationSourceAdapter {
  kind: PreparationSourceKind;
  /** Never implemented in Mission 11. */
  fetch(_workspaceId: string): Promise<never>;
}
