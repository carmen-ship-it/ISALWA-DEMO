/**
 * Provenance vocabulary — Mission: transparency across every AI conclusion.
 *
 * Every inferred artifact in the workspace (blueprint, relationships,
 * processes, company model, recommendations, dependencies, operating
 * system, solution architecture) already carries *some* signal about where
 * it came from — an `evidence[]` array, a `SolutionRelationshipSource`, a
 * confidence score, a knowledge-graph edge id. This module gives that signal
 * one shared name instead of five ad-hoc ones, and stays presentation-only:
 * it never changes what an engine computed, only how honestly the UI names
 * where the claim came from. Copy lives in `lib/i18n/messages/{es,en}.ts`
 * under the `provenance` namespace — components resolve it with
 * `t(\`provenance.tier.${tier}\`)` / `t(\`provenance.footnote.${tier}\`)`.
 */

export type ProvenanceTier =
  /** Traced to a specific client document, interview, or system record. */
  | "observed"
  /** Derived by Architect from observed evidence (synthesis, not a raw fact). */
  | "inferred"
  /** A heuristic score or completeness measure, not a discovered fact. */
  | "estimated"
  /** A catalog/template hypothesis or recommendation — not yet evidenced. */
  | "suggested"
  /** A hypothesis explicitly awaiting client validation. */
  | "needs_confirmation";

/** Any claim with at least one real evidence reference is `observed`; otherwise `inferred`. */
export function provenanceFromEvidenceCount(
  count: number,
  whenEmpty: ProvenanceTier = "inferred",
): ProvenanceTier {
  return count > 0 ? "observed" : whenEmpty;
}

/** `SolutionRelationship.source` (see `types/solution.ts`) → provenance tier. */
export function provenanceFromRelationshipSource(
  source: "catalog_inferred" | "knowledge_evidence",
): ProvenanceTier {
  return source === "knowledge_evidence" ? "observed" : "suggested";
}

/** Company Model relationships/ownership: set only when traced to a real knowledge-graph edge. */
export function provenanceFromKnowledgeLink(hasDirectLink: boolean): ProvenanceTier {
  return hasDirectLink ? "observed" : "inferred";
}
