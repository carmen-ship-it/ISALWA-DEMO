import { deriveQualityRatios } from '@isalwa/os-contracts';

/**
 * Display guard for classification ratios.
 * Denominator is good + lost only. A missing count does not invent a percent.
 */
export function displayQualityRatio(
  goodCount: number | null | undefined,
  lostCount: number | null | undefined,
): { goodPercent: string; lostPercent: string } | null {
  if (goodCount == null || lostCount == null) return null;
  const ratio = deriveQualityRatios(goodCount, lostCount);
  if (!ratio) return null;
  return { goodPercent: ratio.goodPercent, lostPercent: ratio.lostPercent };
}
