/**
 * Industry Intelligence — anonymized playbooks that bias discovery gaps and
 * question selection toward patterns typical for the client's industry.
 *
 * Full write-up: `INDUSTRY_PLAYBOOKS.md`.
 */

export {
  INDUSTRY_PLAYBOOKS,
  getIndustryPlaybook,
  industryDimensionWeight,
  industryDimensionPattern,
} from "./playbooks";
export type { IndustryPlaybook, IndustryPlaybookDimensionWeight } from "./playbooks";

export { applyIndustryPlaybookBias } from "./bias";
