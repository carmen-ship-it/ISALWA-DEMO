export {
  deriveExecutiveExperience,
  type ExecutiveExperienceModel,
  type ExecutiveDashboardModel,
  type JourneyStage,
  type JourneyStageId,
  type ModuleInsightCard,
  type ReasoningCard,
  type AnimatedBlueprintModel,
  type ProcessInsightCard,
} from "./derive";

export { deriveExecutiveCockpit } from "./cockpit";
export { deriveExecutiveScore } from "./executive-score";
export { deriveDailySummary } from "./daily-summary";
export {
  deriveCockpitQuickWins,
  deriveCockpitStrategicOpportunities,
  deriveCockpitPriorityRecommendations,
} from "./recommendations";
export { deriveCockpitAlerts } from "./alerts";
export { deriveCockpitPriorities } from "./priorities";

export type {
  ExecutiveCockpit,
  ExecutiveScore,
  ExecutiveScoreComponent,
  DepartmentHealthItem,
  PriorityItem,
  CockpitAlert,
  CockpitRecommendation,
  DiscoveryItem,
  PendingDecision,
  AutomationProgress,
  AiReadinessProgress,
  RoadmapProgress,
  RoadmapPhaseProgress,
  BusinessHealthSurface,
  CockpitUrgency,
  CockpitAlertSource,
  CockpitRecommendationKind,
} from "./types";
