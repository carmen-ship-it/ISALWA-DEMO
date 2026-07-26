/**
 * Unified Business Knowledge Intake — gaps.
 *
 * Combines whatever the extractor flagged as an explicit unknown with a
 * coverage-based read of the vault (reusing the existing Knowledge Engine's
 * `deriveKnowledgeCoverage` — never a second scoring system). This is the
 * "we still need…" half of the client-facing promise.
 */

import { deriveKnowledgeCoverage } from "@/lib/knowledge";
import { coverageAreaLabel } from "@/lib/presentation";
import type { KnowledgeAsset, KnowledgeCoverageSlice } from "@/types";
import type { IntakeUnknown } from "./contracts";

export interface GapReport {
  coverage: KnowledgeCoverageSlice[];
  weakAreas: KnowledgeCoverageSlice[];
  labelsEs: string[];
}

const WEAK_THRESHOLD = 40;

export function deriveGapReport(
  assets: KnowledgeAsset[],
  extractorUnknowns: IntakeUnknown[],
): GapReport {
  const coverage = deriveKnowledgeCoverage(assets);
  const weakAreas = coverage.filter((slice) => slice.percent < WEAK_THRESHOLD);

  const labelsEs = Array.from(
    new Set([
      ...weakAreas.map(
        (slice) => coverageAreaLabel(slice.area).toLowerCase(),
      ),
      ...extractorUnknowns.map((u) => u.label),
    ]),
  );

  return { coverage, weakAreas, labelsEs };
}
