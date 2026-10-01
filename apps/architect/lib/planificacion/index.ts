export { ensurePlanificacion, emptyPlanificacionState, planificacionPersistShapeChanged } from "./ensure";
export { createEmptyPlanificacionStateV1 } from "./seed";
export {
  buildPlanificacionResumen,
  commercialFeatures,
  mergePhasesWithSolution,
  type PlanificacionResumen,
} from "./derive-legacy";
export {
  migratePlanificacionToV2,
  normalizePlanificacionState,
  createEmptyPlanificacionStateV2,
  bumpPlanificacionDerivationVersion,
  appendPlanificacionChange,
} from "./migrate-v2";
export {
  PLANIFICACION_DERIVATION_VERSION,
  PLANIFICACION_DISCOVERY_IN_PROGRESS_HEADLINE,
  PLANIFICACION_PROTOTYPE_DISCLAIMER,
} from "./constants";
export {
  buildPlanificacionViewModel,
  deriveAllPlanItems,
  deriveUnderstandingSummary,
  deriveRecommendations,
  deriveProposedCapabilities,
  deriveGapsAndQuestions,
  deriveTechnicalRequirements,
  derivePhases,
  mergeDerivedWithPersisted,
  mergeDerivedItems,
  mergeDerivedQuestions,
  groupItemsByKind,
  hasDiscoveryContent,
} from "./derive";
export {
  COST_ITEMS,
  SECURITY_ITEMS,
  FUTURE_DEPARTMENTS,
  IMPLEMENTATION_PHASES,
  COMMERCIAL_FEATURES,
  PLANIFICACION_DEMO_DATA_NOTICE,
  PLANIFICACION_PRINCIPLE,
  PLANIFICACION_COST_DISCLAIMER,
  STATUS_LABELS,
  GOVERNANCE_STATUS_LABELS,
  QUESTION_STATUS_LABELS,
  DATA_REQ_STATUS_LABELS,
  DECISION_STATUS_LABELS,
  EFFORT_BAND_LABELS,
} from "./content";
