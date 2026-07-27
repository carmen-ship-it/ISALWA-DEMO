export type {
  DetectionCategory,
  DetectionCounts,
  Evidence,
  IntakeBusinessRule,
  IntakeConnectorContract,
  IntakeContradictionSignal,
  IntakeEntity,
  IntakeExtractionResult,
  IntakeExtractor,
  IntakeFact,
  IntakeOpportunitySignal,
  IntakeOutcome,
  IntakePainSignal,
  IntakeReadiness,
  IntakeRelationship,
  IntakeSlotKind,
  IntakeSlots,
  IntakeSourceCategory,
  IntakeSourceDefinition,
  IntakeSourceType,
  IntakeUnit,
  IntakeUnknown,
} from "./contracts";
export {
  DETECTION_CATEGORIES,
  emptyDetectionCounts,
  emptyIntakeSlots,
} from "./contracts";

export { INTAKE_SOURCES, INTAKE_CONNECTORS, intakeSourceDefinition, intakeSourceForExtension } from "./sources";
export { INTAKE_EXTRACTORS, extractorFor } from "./extractors";
export {
  detectBusinessSignals,
  mergeDetectionCounts,
  splitSentences,
  totalDetections,
  MAX_SCANNED_SENTENCES,
} from "./detectors";
export type { DetectionResult } from "./detectors";
export { normalizeSlots } from "./normalizer";
export { reinforceConfidence, detectNumericContradiction, findContradiction } from "./confidence";
export type { ContradictionMatch } from "./confidence";
export { mergeIntakeEntities } from "./entities";
export type { EntityMergeResult } from "./entities";
export { mergeIntakeRelationships } from "./relationships";
export type { RelationshipMergeResult } from "./relationships";
export { appendEvidenceLog, toEvidenceLogEntries, EVIDENCE_LOG_LIMIT } from "./evidence";
export {
  mergeBusinessRules,
  mergeContradictions,
  mergePainSignalsIntoWorkspace,
  mergeOpportunitySignalsIntoWorkspace,
  mergeUnknownsIntoOpenQuestions,
} from "./deduplication";
export { deriveGapReport } from "./gaps";
export type { GapReport } from "./gaps";
export { buildLearnedLines, buildStillNeedLines } from "./summary";
export type { IntakeMergeCounts } from "./summary";
export { ingestSource, ingestFileThroughIntake } from "./pipeline";
export type {
  IntakeIngestReport,
  IntakeIngestResult,
  IntakeSourceInput,
  IntakeFileUploadResult,
} from "./pipeline";
