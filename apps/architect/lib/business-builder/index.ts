/**
 * Interactive Business Builder — public API (Mission 16).
 *
 * Planning contracts only: executives design a future operating system.
 * No UI canvas, no drag-and-drop, no code generation, no persistence UI.
 */

export {
  createEmptyPlan,
  addModule,
  removeModule,
  reorderModule,
  PRIORITY_WEIGHT,
  type BuilderPlan,
  type ModulePlanItem,
  type ModuleConnection,
  type ModuleConnectionKind,
  type BuilderModulePriority,
  type AddModuleInput,
} from "./modules";

export {
  connectModules,
  type ConnectModulesInput,
} from "./connections";

export {
  previewDependencies,
  KNOWN_SOLUTION_MODULE_DEPS,
  type DependencyPreview,
  type DependencyEdge,
  type DependencyEdgeSource,
  type MissingPrerequisite,
} from "./dependencies";

export {
  estimateInvestment,
  type InvestmentEstimate,
  type InvestmentBand,
} from "./cost";

export {
  estimateTimeline,
  type BuilderTimelineEstimate,
  type TimelinePhaseEstimate,
} from "./roadmap";

export {
  estimateROI,
  type RoiEstimate,
  type RoiBand,
  type WorkspaceRoiSignals,
  type ManualWorkIntensity,
} from "./roi";
