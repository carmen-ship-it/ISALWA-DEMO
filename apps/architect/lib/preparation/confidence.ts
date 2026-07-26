/**
 * Preparation confidence — deterministic “already understand approximately X%”.
 * No LLM. Blends workspace understanding, discovery score, and knowledge coverage.
 */

import type { DiscoveryScore, KnowledgeCoverageSlice } from "@/types";

export interface PreparationConfidence {
  /** Rounded 0–100 used in interview opening copy. */
  approximatePercent: number;
  /** Weighted blend before rounding (diagnostic). */
  rawScore: number;
  /** Contribution from CompanyWorkspace.businessUnderstanding. */
  fromBusinessUnderstanding: number;
  /** Contribution from ConversationMemory discovery score. */
  fromDiscoveryScore: number;
  /** Contribution from Knowledge Center coverage. */
  fromKnowledgeCoverage: number;
  notes: string[];
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function averageCoverage(coverage: KnowledgeCoverageSlice[]): number {
  if (coverage.length === 0) return 0;
  return (
    coverage.reduce((sum, slice) => sum + slice.percent, 0) / coverage.length
  );
}

/**
 * Derive how prepared the Architect already is before the interview.
 */
export function derivePreparationConfidence(input: {
  businessUnderstanding: number;
  discoveryScore: DiscoveryScore | null;
  knowledgeCoverage: KnowledgeCoverageSlice[];
  knownFactCount: number;
  processedAssetCount: number;
}): PreparationConfidence {
  const fromBusinessUnderstanding = clamp(input.businessUnderstanding);
  const fromDiscoveryScore = clamp(input.discoveryScore?.overall ?? 0);
  const fromKnowledgeCoverage = clamp(averageCoverage(input.knowledgeCoverage));

  // Prefer discovery score when present; otherwise lean on workspace understanding.
  const hasDiscovery = (input.discoveryScore?.overall ?? 0) > 0;
  const understandingWeight = hasDiscovery ? 0.25 : 0.45;
  const discoveryWeight = hasDiscovery ? 0.45 : 0.15;
  const knowledgeWeight = 0.3;

  const rawScore =
    fromBusinessUnderstanding * understandingWeight +
    fromDiscoveryScore * discoveryWeight +
    fromKnowledgeCoverage * knowledgeWeight;

  // Soft floor/ceiling from evidence volume so empty workspaces stay near 0.
  const evidenceBoost =
    input.knownFactCount === 0 && input.processedAssetCount === 0
      ? 0
      : Math.min(8, input.knownFactCount + input.processedAssetCount);

  const approximatePercent = clamp(rawScore + evidenceBoost * 0.5);

  const notes: string[] = [];
  if (approximatePercent < 15) {
    notes.push("Little in-app evidence yet — interview must establish the baseline.");
  } else if (approximatePercent < 45) {
    notes.push("Partial understanding — validate unknowns before recommendations.");
  } else if (approximatePercent < 75) {
    notes.push("Solid preparation — focus the interview on gaps and risks.");
  } else {
    notes.push("High preparation — clarify edge cases and contradictions only.");
  }

  if (input.processedAssetCount === 0) {
    notes.push("No processed Knowledge Center assets yet (uploads deferred).");
  }

  return {
    approximatePercent,
    rawScore: Math.round(rawScore * 10) / 10,
    fromBusinessUnderstanding,
    fromDiscoveryScore,
    fromKnowledgeCoverage,
    notes,
  };
}
