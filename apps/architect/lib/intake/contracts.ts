/**
 * Unified Business Knowledge Intake — core contracts.
 *
 * Architecture-first: every source (an interview, a PDF, a CRM export, a
 * pasted note) is normalized into the same shape before it ever touches the
 * existing engines. Nothing here calls an LLM or an OCR service — extractors
 * are deterministic metadata/keyword heuristics or honest "not implemented"
 * stubs (see `extractors.ts`). The pipeline (`pipeline.ts`) is fully wired;
 * only content-level parsing for the "planned" sources is future work.
 *
 * Downstream, `lib/intake` never stores its own parallel vault — it merges
 * into the existing Knowledge Engine (`lib/knowledge`) and Company Memory
 * (`types/index.ts` ConversationMemory, CompanyWorkspace.painPoints /
 * .opportunities / .openQuestions). Intake feeds those engines; it does not
 * replace them.
 */

import type {
  KnowledgeEntity,
  KnowledgeEntityKind,
  KnowledgeRelationKind,
} from "@/types";

/**
 * Every business ever hands a consultant one of these. Interview stays the
 * primary, highest-trust source; everything else is "another form of
 * evidence" feeding the same understanding.
 */
export type IntakeSourceType =
  | "interview"
  | "pdf"
  | "word"
  | "excel"
  | "powerpoint"
  | "csv"
  | "image"
  | "meeting_transcript"
  | "audio_transcript"
  | "crm_export"
  | "erp_export"
  | "accounting_export"
  | "email_archive"
  | "folder"
  | "api_connector"
  | "manual_notes";

export type IntakeSourceCategory =
  | "conversation"
  | "document"
  | "structured_export"
  | "connector"
  | "manual";

/** Same honesty convention as `KnowledgeExtractionProvider` — never fake "processed". */
export type IntakeReadiness = "designed" | "planned";

export interface IntakeSourceDefinition {
  id: IntakeSourceType;
  category: IntakeSourceCategory;
  title: string;
  titleEs: string;
  description: string;
  descriptionEs: string;
  status: IntakeReadiness;
  /** File extensions this source accepts, when applicable. */
  extensions?: string[];
}

/** The structured slot every piece of evidence is filed under. */
export type IntakeSlotKind =
  | "fact"
  | "entity"
  | "relationship"
  | "unknown"
  | "contradiction"
  | "business_rule"
  | "pain_signal"
  | "opportunity";

/**
 * Common Evidence interface — every extractor emits these. An Evidence
 * record is the atomic "why do we believe this" unit; facts, entities,
 * relationships, etc. all carry `evidenceIds` pointing back into the same
 * ledger. Evidence is append-only — extractors add to it, nothing rewrites it.
 */
export interface Evidence {
  id: string;
  workspaceId: string;
  sourceType: IntakeSourceType;
  /** IntakeUnit.id — the specific upload/note/import this evidence came from. */
  sourceId: string;
  sourceLabel: string;
  capturedAt: string;
  statement: string;
  /** 0–1. What this single piece of evidence contributes, before reinforcement. */
  confidence: number;
  slot: IntakeSlotKind;
}

export interface IntakeFact {
  id: string;
  key: string | null;
  statement: string;
  evidenceIds: string[];
  confidence: number;
}

/**
 * Entities cover Departments, Systems, Roles, Documents, and Processes —
 * all are just `KnowledgeEntity` kinds (Department / System / Person with a
 * role / Document / Workflow). No parallel entity taxonomy.
 */
export interface IntakeEntity {
  id: string;
  kind: KnowledgeEntityKind;
  name: string;
  summary: string | null;
  evidenceIds: string[];
  confidence: number;
  metadata: Record<string, string>;
}

export interface IntakeRelationship {
  id: string;
  kind: KnowledgeRelationKind;
  fromEntityName: string;
  toEntityName: string;
  label: string;
  evidenceIds: string[];
  confidence: number;
}

export interface IntakeUnknown {
  id: string;
  label: string;
  reason: string;
  evidenceIds: string[];
}

export interface IntakeContradictionSignal {
  id: string;
  statement: string;
  evidenceIds: string[];
  confidence: number;
}

export interface IntakeBusinessRule {
  id: string;
  statement: string;
  evidenceIds: string[];
  confidence: number;
}

export interface IntakePainSignal {
  id: string;
  title: string;
  description: string;
  evidenceIds: string[];
  confidence: number;
}

export interface IntakeOpportunitySignal {
  id: string;
  title: string;
  description: string;
  evidenceIds: string[];
  confidence: number;
}

/** Every intake produces exactly these structured slots. Never partial. */
export interface IntakeSlots {
  facts: IntakeFact[];
  entities: IntakeEntity[];
  relationships: IntakeRelationship[];
  unknowns: IntakeUnknown[];
  contradictions: IntakeContradictionSignal[];
  businessRules: IntakeBusinessRule[];
  painSignals: IntakePainSignal[];
  opportunities: IntakeOpportunitySignal[];
}

export function emptyIntakeSlots(): IntakeSlots {
  return {
    facts: [],
    entities: [],
    relationships: [],
    unknowns: [],
    contradictions: [],
    businessRules: [],
    painSignals: [],
    opportunities: [],
  };
}

/** The normalized envelope every source is wrapped in before extraction. */
export interface IntakeUnit {
  id: string;
  workspaceId: string;
  sourceType: IntakeSourceType;
  label: string;
  receivedAt: string;
  metadata: Record<string, string | number | boolean | undefined>;
  /** Manual notes / pasted transcripts only — never binary content. */
  textContent?: string;
}

export type IntakeOutcome = "processed" | "queued" | "unsupported" | "too_large";

export interface IntakeExtractionResult {
  unitId: string;
  status: IntakeOutcome;
  message: string;
  messageEs: string;
  slots: IntakeSlots;
  evidence: Evidence[];
}

export interface IntakeExtractor {
  id: IntakeSourceType;
  status: IntakeReadiness;
  extract(unit: IntakeUnit): Promise<IntakeExtractionResult>;
}

/**
 * Future-ready connector contracts — Google Drive, SharePoint, QuickBooks,
 * HubSpot, etc. Design only. No OAuth, no sync, no network calls.
 */
export interface IntakeConnectorContract {
  id: string;
  title: string;
  description: string;
  status: IntakeReadiness;
  feedsSourceTypes: IntakeSourceType[];
}

/** Cross-reference into an already-merged Knowledge Engine entity. */
export interface ResolvedEntityRef {
  name: string;
  entity: KnowledgeEntity;
}
