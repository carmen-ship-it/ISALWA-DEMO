/**
 * Display guard for classification ratios.
 * Keep aligned with deriveQualityRatios in packages/os-contracts/src/production-trace.ts.
 * CROSS_LANE: call that function once the contracts barrel exports it.
 * Denominator is good + lost only. A missing count does not invent a percent.
 */
export function displayQualityRatio(
  goodCount: number | null | undefined,
  lostCount: number | null | undefined,
): { goodPercent: string; lostPercent: string } | null {
  if (goodCount == null || lostCount == null) return null;
  if (!Number.isInteger(goodCount) || !Number.isInteger(lostCount)) return null;
  if (goodCount < 0 || lostCount < 0) return null;
  const denominator = goodCount + lostCount;
  if (denominator === 0) return null;
  return {
    goodPercent: formatRatioPercent(goodCount, denominator),
    lostPercent: formatRatioPercent(lostCount, denominator),
  };
}

function formatRatioPercent(count: number, denominator: number): string {
  const scaled = Math.floor((count * 10000) / denominator);
  const whole = Math.floor(scaled / 100);
  const fraction = scaled % 100;
  if (fraction === 0) return String(whole);
  const hundredths = String(fraction).padStart(2, '0').replace(/0$/, '');
  return `${whole}.${hundredths}`;
}
