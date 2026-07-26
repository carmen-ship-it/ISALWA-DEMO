/**
 * Interactive Business Builder — investment estimate (Mission 16).
 * Deterministic heuristic bands from module priority + count.
 */

import { PRIORITY_WEIGHT, type BuilderPlan } from "./modules";

export type InvestmentBand = "seed" | "growth" | "scale" | "enterprise";

export interface InvestmentEstimate {
  band: InvestmentBand;
  /** Inclusive heuristic USD band (planning only — not a quote). */
  lowUsd: number;
  highUsd: number;
  moduleCount: number;
  priorityWeight: number;
  rationale: string[];
}

const BAND_TABLE: Array<{
  maxWeight: number;
  band: InvestmentBand;
  lowUsd: number;
  highUsd: number;
}> = [
  { maxWeight: 6, band: "seed", lowUsd: 25_000, highUsd: 75_000 },
  { maxWeight: 14, band: "growth", lowUsd: 75_000, highUsd: 200_000 },
  { maxWeight: 28, band: "scale", lowUsd: 200_000, highUsd: 500_000 },
  { maxWeight: Infinity, band: "enterprise", lowUsd: 500_000, highUsd: 1_500_000 },
];

function bandForWeight(priorityWeight: number): (typeof BAND_TABLE)[number] {
  for (const row of BAND_TABLE) {
    if (priorityWeight <= row.maxWeight) return row;
  }
  return BAND_TABLE[BAND_TABLE.length - 1];
}

/**
 * Estimate investment from plan composition. Pure + deterministic for a given plan.
 */
export function estimateInvestment(plan: BuilderPlan): InvestmentEstimate {
  const moduleCount = plan.modules.length;
  const priorityWeight = plan.modules.reduce(
    (sum, m) => sum + PRIORITY_WEIGHT[m.priority],
    0,
  );

  if (moduleCount === 0) {
    return {
      band: "seed",
      lowUsd: 0,
      highUsd: 0,
      moduleCount: 0,
      priorityWeight: 0,
      rationale: ["Empty plan — add modules before estimating investment."],
    };
  }

  const row = bandForWeight(priorityWeight);
  const mustCount = plan.modules.filter((m) => m.priority === "must").length;
  const laterCount = plan.modules.filter((m) => m.priority === "later").length;

  // Mild stretch when many must-haves; mild discount when many "later" items.
  const stretch = 1 + Math.min(0.25, mustCount * 0.04) - Math.min(0.15, laterCount * 0.03);
  const lowUsd = Math.round(row.lowUsd * stretch);
  const highUsd = Math.round(row.highUsd * stretch);

  const rationale = [
    `${moduleCount} module${moduleCount === 1 ? "" : "s"} with priority weight ${priorityWeight}.`,
    `Band "${row.band}" from heuristic weight thresholds (planning only).`,
  ];
  if (mustCount > 0) {
    rationale.push(`${mustCount} must-have module${mustCount === 1 ? "" : "s"} stretch the upper band.`);
  }
  if (laterCount > 0) {
    rationale.push(`${laterCount} later-priority module${laterCount === 1 ? "" : "s"} soften near-term spend.`);
  }

  return {
    band: row.band,
    lowUsd,
    highUsd,
    moduleCount,
    priorityWeight,
    rationale,
  };
}
