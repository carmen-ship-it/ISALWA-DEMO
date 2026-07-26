/**
 * Company Preparation Engine — Mission 11 public API.
 * Architecture only: deterministic brief from in-app evidence.
 */

export { prepareCompany } from "./prepare-company";
export {
  assemblePreparationBrief,
  buildInterviewOpening,
  type PreparationBrief,
} from "./company-brief";
export {
  mergeKnowledgeForPreparation,
  implySourceKindsFromAssets,
  type PreparationInput,
} from "./knowledge-merge";
export {
  derivePreparationConfidence,
  type PreparationConfidence,
} from "./confidence";
export {
  derivePreparationCoverage,
  type PreparationCoverage,
  type PreparationCoverageSlice,
  type PreparationTopicId,
} from "./coverage";
export {
  PREPARATION_SOURCE_CONTRACTS,
  type PreparationSourceKind,
  type PreparationSourceContract,
  type PreparationSourceStatus,
  type PreparationSourceAdapter,
} from "./sources";
