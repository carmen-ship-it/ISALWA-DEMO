/**
 * Domain barrel — interview + report.
 * Prefer `@/lib/reasoning` for detection and planning.
 */
export { createInterview, submitAnswer } from "./interview-engine";
export { synthesizeReport } from "./report";
export {
  detectSignals,
  extractTools,
  mergeSignals,
  detectIndustryCompat as detectIndustry,
} from "./signals";
