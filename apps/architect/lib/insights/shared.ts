/**
 * Shared read-only helpers for the Executive Consulting Intelligence layer.
 * No mutation, no new scoring — only assembly of existing engine outputs.
 */

import type {
  CompanyWorkspace,
  ConsultingIntelligence,
  ConsultingOpportunity,
  ConsultingRisk,
} from "@/types";
import type { EvidenceSourceKind, InsightEvidence } from "./types";

export function consultingOf(
  workspace: CompanyWorkspace,
): ConsultingIntelligence | null {
  return workspace.conversationMemory?.consulting ?? null;
}

export function evidence(
  kind: EvidenceSourceKind,
  id: string,
  label: string,
  quote?: string,
): InsightEvidence {
  return { kind, id, label, quote };
}

export function riskEvidence(risk: ConsultingRisk): InsightEvidence[] {
  return risk.evidence
    .slice(0, 2)
    .map((quote) => evidence("risk", risk.id, risk.title, quote));
}

export function opportunityEvidence(
  opportunity: ConsultingOpportunity,
): InsightEvidence[] {
  return opportunity.evidence
    .slice(0, 2)
    .map((quote) => evidence("opportunity", opportunity.id, opportunity.title, quote));
}

export function knownFactEvidence(
  workspace: CompanyWorkspace,
  predicate: (statement: string) => boolean,
  limit = 3,
): InsightEvidence[] {
  return (workspace.conversationMemory?.knownFacts ?? [])
    .filter((f) => predicate(f.statement.toLowerCase()))
    .slice(0, limit)
    .map((f) => evidence("known_fact", f.id, f.statement, f.statement));
}

export function painPointEvidence(
  workspace: CompanyWorkspace,
  predicate: (blob: string) => boolean,
  limit = 3,
): InsightEvidence[] {
  return workspace.painPoints
    .filter((p) => predicate(`${p.title} ${p.description}`.toLowerCase()))
    .slice(0, limit)
    .map((p) => evidence("pain_point", p.id, p.title, p.description));
}

export function hasRiskPattern(
  consulting: ConsultingIntelligence | null,
  patternId: string,
): ConsultingRisk | null {
  return consulting?.risks.find((r) => r.patternId === patternId) ?? null;
}

/**
 * `evaluateMaturity` (lib/consulting/maturity.ts) always fills a dimension's
 * `evidence` with a single canned fallback string ("Limited direct evidence
 * for …") when it found nothing real. Treat that placeholder as *no*
 * evidence — otherwise every dimension looks "covered" even when it isn't.
 */
export function realDimensionEvidence(dimEvidence: string[]): string[] {
  return dimEvidence.filter((e) => !/^limited direct evidence for/i.test(e));
}

export function textBlob(workspace: CompanyWorkspace): string {
  const memory = workspace.conversationMemory;
  return [
    ...(memory?.knownFacts.map((f) => f.statement) ?? []),
    ...workspace.painPoints.map((p) => `${p.title} ${p.description}`),
    ...(memory?.summary.currentSoftware ?? []),
    memory?.summary.belief ?? "",
  ]
    .join(" \n ")
    .toLowerCase();
}

/** Evidence-weighted minimum before a section is allowed to render at all. */
export function hasMinimumEvidence(workspace: CompanyWorkspace): boolean {
  const memory = workspace.conversationMemory;
  if (!memory) return false;
  return (
    memory.knownFacts.length > 0 ||
    workspace.painPoints.length > 0 ||
    (memory.consulting?.risks.length ?? 0) > 0
  );
}
