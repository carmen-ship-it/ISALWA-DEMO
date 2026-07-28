/**
 * RetrievalPack — Cursor-style context packing for the interview / Consulting
 * Intelligence cycle (Mission C).
 *
 * Every planning cycle needs a *bounded* slice of everything the platform
 * knows, not everything it knows: recent answers for short-term continuity,
 * the strongest matching document chunks, the knowledge-graph entities that
 * matter right now, and the readiness gaps still open. This module defines
 * that bounded slice and how each item traces back to its source — nothing
 * here is a paraphrase with no source record behind it.
 */

import type { ReadinessTopicId } from "@/lib/readiness";

export type RetrievalItemKind =
  | "answer"
  | "document_chunk"
  | "knowledge_entity"
  | "readiness_gap";

/** Concrete source ids for one retrieved item — never a fuzzy description. */
export interface RetrievalProvenance {
  documentId: string | null;
  documentTitle: string | null;
  meetingId: string | null;
  factKey: string | null;
  entityId: string | null;
}

export interface RetrievalItem {
  id: string;
  kind: RetrievalItemKind;
  topic: ReadinessTopicId | null;
  /** Short Spanish label a client can read, e.g. "documento: Contrato de arriendo". */
  label: string;
  statement: string;
  /** 0-100 — same scale as every other evidence-strength figure in the platform. */
  strength: number;
  provenance: RetrievalProvenance;
}

export interface RetrievalPack {
  query: string;
  generatedAt: string;
  /** Honest about how the document-chunk tier was produced. */
  retrievalMode: "semantic" | "lexical";
  items: RetrievalItem[];
  /** True when more candidate evidence existed than the cap allowed through. */
  truncated: boolean;
}
