/**
 * Legacy signal helpers — delegate to reasoning layer.
 * Prefer importing from `@/lib/reasoning`.
 */
export {
  detectIndustry,
  detectSignals,
  extractTools,
  mergeSignals,
} from "@/lib/reasoning";

import { detectIndustry as detectIndustryFull } from "@/lib/reasoning/industry/detect";
import type { Industry } from "@/types";

/** Back-compat wrapper matching older `{ industry, confidence }` shape. */
export function detectIndustryCompat(text: string): {
  industry: Industry;
  confidence: number;
} {
  const result = detectIndustryFull(text);
  return { industry: result.industry, confidence: result.confidence };
}
