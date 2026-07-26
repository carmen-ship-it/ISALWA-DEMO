/**
 * Interactive Business Builder — ROI estimate (Mission 16).
 * Deterministic bands from plan + optional workspace signals.
 */

import { estimateInvestment } from "./cost";
import { PRIORITY_WEIGHT, type BuilderPlan } from "./modules";

export type RoiBand = "conservative" | "balanced" | "aggressive";

export type ManualWorkIntensity = "low" | "moderate" | "high";

/** Optional signals from a CompanyWorkspace — never required. */
export interface WorkspaceRoiSignals {
  painPointCount?: number;
  /** 0–100 when available from consulting / maturity engines. */
  maturityScore?: number;
  opportunityCount?: number;
  manualWorkIntensity?: ManualWorkIntensity;
}

export interface RoiEstimate {
  band: RoiBand;
  paybackMonths: { low: number; high: number };
  annualBenefitBandUsd: { low: number; high: number };
  /** 0–1 planning confidence (heuristic, not statistical). */
  confidence: number;
  rationale: string[];
}

const INTENSITY_MULTIPLIER: Record<ManualWorkIntensity, number> = {
  low: 0.85,
  moderate: 1,
  high: 1.25,
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * Estimate ROI bands. Pure + deterministic for a given plan + signals.
 */
export function estimateROI(
  plan: BuilderPlan,
  signals: WorkspaceRoiSignals = {},
): RoiEstimate {
  const investment = estimateInvestment(plan);

  if (plan.modules.length === 0) {
    return {
      band: "conservative",
      paybackMonths: { low: 0, high: 0 },
      annualBenefitBandUsd: { low: 0, high: 0 },
      confidence: 0,
      rationale: ["Empty plan — add modules before estimating ROI."],
    };
  }

  const pain = Math.max(0, Math.floor(signals.painPointCount ?? 0));
  const opportunities = Math.max(0, Math.floor(signals.opportunityCount ?? 0));
  const maturity = signals.maturityScore;
  const intensity = signals.manualWorkIntensity ?? "moderate";
  const intensityMul = INTENSITY_MULTIPLIER[intensity];

  // Midpoint investment × benefit ratio from priority density.
  const midInvest = (investment.lowUsd + investment.highUsd) / 2;
  const avgPriority =
    plan.modules.reduce((s, m) => s + PRIORITY_WEIGHT[m.priority], 0) /
    plan.modules.length;
  const baseRatio = 0.35 + avgPriority * 0.08; // ~0.43–0.67 of investment / year
  const painBoost = 1 + Math.min(0.4, pain * 0.03);
  const oppBoost = 1 + Math.min(0.25, opportunities * 0.02);
  const maturityFactor =
    typeof maturity === "number"
      ? 1 + (50 - clamp(maturity, 0, 100)) / 200 // lower maturity → more headroom
      : 1;

  const annualMid =
    midInvest * baseRatio * intensityMul * painBoost * oppBoost * maturityFactor;
  const annualBenefitBandUsd = {
    low: Math.round(annualMid * 0.7),
    high: Math.round(annualMid * 1.35),
  };

  const paybackFrom = (annual: number): number => {
    if (annual <= 0) return 36;
    return clamp(Math.round((midInvest / annual) * 12), 3, 36);
  };

  const paybackMonths = {
    low: paybackFrom(annualBenefitBandUsd.high),
    high: paybackFrom(annualBenefitBandUsd.low),
  };

  let band: RoiBand = "balanced";
  if (paybackMonths.high <= 12 && intensity === "high") band = "aggressive";
  else if (paybackMonths.low >= 18 || intensity === "low") band = "conservative";

  let confidence = 0.45;
  if (pain > 0) confidence += 0.1;
  if (opportunities > 0) confidence += 0.08;
  if (typeof maturity === "number") confidence += 0.12;
  if (plan.modules.length >= 4) confidence += 0.05;
  confidence = clamp(Math.round(confidence * 100) / 100, 0.2, 0.85);

  const rationale = [
    `Annual benefit band derived from investment midpoint ($${Math.round(midInvest).toLocaleString("en-US")}) and priority density.`,
    `Manual-work intensity "${intensity}" applies ×${intensityMul}.`,
  ];
  if (pain > 0) rationale.push(`${pain} pain point signal${pain === 1 ? "" : "s"} increase benefit headroom.`);
  if (opportunities > 0) {
    rationale.push(`${opportunities} opportunity signal${opportunities === 1 ? "" : "s"} support upside.`);
  }
  if (typeof maturity === "number") {
    rationale.push(`Maturity score ${clamp(maturity, 0, 100)} adjusts transformation headroom.`);
  }
  rationale.push("ROI is a planning band — not a financial forecast.");

  return {
    band,
    paybackMonths,
    annualBenefitBandUsd,
    confidence,
    rationale,
  };
}
