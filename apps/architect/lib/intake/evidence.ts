/**
 * Unified Business Knowledge Intake — evidence ledger.
 *
 * Append-only by design: evidence is never deleted or overwritten, only
 * added to. `WorkspaceKnowledge.evidenceLog` is the persisted, truncated
 * view of this ledger (kept bounded so the workspace record does not grow
 * without limit); the full in-memory `Evidence[]` produced during a single
 * ingest is always available in the returned `IntakeIngestReport`.
 */

import type { KnowledgeEvidenceLogEntry } from "@/types";
import type { Evidence } from "./contracts";

/** Persisted workspace records stay bounded — most recent evidence wins visibility. */
export const EVIDENCE_LOG_LIMIT = 500;

export function toEvidenceLogEntries(
  evidence: Evidence[],
): KnowledgeEvidenceLogEntry[] {
  return evidence.map((item) => ({
    id: item.id,
    sourceType: item.sourceType,
    sourceLabel: item.sourceLabel,
    statement: item.statement,
    slot: item.slot,
    confidence: item.confidence,
    createdAt: item.capturedAt,
  }));
}

export function appendEvidenceLog(
  existing: KnowledgeEvidenceLogEntry[],
  incoming: Evidence[],
): KnowledgeEvidenceLogEntry[] {
  const next = [...existing, ...toEvidenceLogEntries(incoming)];
  if (next.length <= EVIDENCE_LOG_LIMIT) return next;
  return next.slice(next.length - EVIDENCE_LOG_LIMIT);
}
