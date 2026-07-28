/**
 * Mission 26 — Living Company Deliverables.
 *
 * The "brain fingerprint" — a cheap, honest snapshot of how much the
 * Readiness Engine / Blueprint / Company Model currently know, reused
 * verbatim from `lib/readiness` and `lib/blueprint`. Never a second scoring
 * model: this module only compares numbers those engines already publish so
 * a deliverable can say "Update Available" instead of silently going stale.
 */

import { latestBlueprint } from "@/lib/blueprint";
import { snapshotFromWorkspace } from "@/lib/readiness";
import type { CompanyWorkspace, KnowledgeFingerprint } from "@/types";

export function computeKnowledgeFingerprint(
  workspace: CompanyWorkspace,
): KnowledgeFingerprint {
  const snapshot = snapshotFromWorkspace(workspace);
  const inventory = snapshot.inventory;
  const evidenceCount =
    inventory.interviewFacts +
    inventory.documents +
    inventory.importedRecords +
    inventory.meetings +
    inventory.businessRules;

  return {
    evidenceCount,
    understandingPercent: Math.round(
      Math.max(0, Math.min(100, workspace.businessUnderstanding)),
    ),
    blueprintVersion: latestBlueprint(workspace.blueprints)?.version ?? null,
    companyModelGeneratedAt: workspace.companyModel?.generatedAt ?? null,
  };
}

export function fingerprintsMatch(
  a: KnowledgeFingerprint,
  b: KnowledgeFingerprint,
): boolean {
  return (
    a.evidenceCount === b.evidenceCount &&
    a.understandingPercent === b.understandingPercent &&
    a.blueprintVersion === b.blueprintVersion &&
    a.companyModelGeneratedAt === b.companyModelGeneratedAt
  );
}

/**
 * Confidence for a living deliverable — reuses `businessUnderstanding` (the
 * one number the Readiness Engine already publishes everywhere else) as the
 * ceiling, scaled down when the deliverable itself found little or nothing
 * to compose. Never a fabricated per-deliverable score.
 */
export function deliverableConfidence(
  workspace: CompanyWorkspace,
  contentSignalCount: number,
): number {
  const base = Math.max(0, Math.min(1, workspace.businessUnderstanding / 100));
  if (contentSignalCount === 0) return Math.min(base, 0.15);
  if (contentSignalCount < 3) return Math.min(base, 0.5);
  return base;
}
