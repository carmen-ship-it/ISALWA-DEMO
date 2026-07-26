/**
 * Continuous Company Memory — Mission 15 domain contracts.
 * Append-only evolutionary history. Snapshots are never overwritten.
 */

import type { RiskSeverity } from "./consulting";
import type { WorkspaceStage } from "./workspace";

export type EvolutionMilestoneKind =
  | "baseline"
  | "maturity_up"
  | "maturity_down"
  | "module_added"
  | "module_removed"
  | "process_added"
  | "recommendation_added"
  | "roadmap_advanced"
  | "work_completed"
  | "risk_resolved"
  | "risk_emerged"
  | "stage_changed"
  | "understanding_up"
  | "understanding_down";

export type EvolutionChangePolarity =
  | "progress"
  | "regression"
  | "neutral"
  | "focus";

export type EvolutionChangeArea =
  | "maturity"
  | "modules"
  | "processes"
  | "recommendations"
  | "roadmap"
  | "completed_work"
  | "risks"
  | "stage"
  | "understanding";

export interface SnapshotModuleRef {
  id: string;
  name: string;
  priority: string;
}

export interface SnapshotProcessSummary {
  workflowCount: number;
  bottleneckCount: number;
  automationCandidateCount: number;
  workflowNames: string[];
  summary: string | null;
}

export interface SnapshotRecommendationRef {
  id: string;
  title: string;
  priority: string;
}

export interface SnapshotRoadmapPhase {
  id: string;
  phase: number;
  name: string;
  modules: string[];
}

export interface SnapshotRiskRef {
  id: string;
  title: string;
  severity: RiskSeverity | string;
  patternId: string | null;
}

export interface CompanySnapshot {
  id: string;
  capturedAt: string;
  contentHash: string;
  stage: WorkspaceStage;
  businessUnderstanding: number;
  maturityOverall: number | null;
  maturityByDimension: Array<{ id: string; score: number }>;
  modules: SnapshotModuleRef[];
  processes: SnapshotProcessSummary;
  recommendations: SnapshotRecommendationRef[];
  roadmap: SnapshotRoadmapPhase[];
  completedWork: string[];
  risks: SnapshotRiskRef[];
  openQuestionCount: number;
  meetingCount: number;
  blueprintVersion: number | null;
}

export interface EvolutionMilestone {
  id: string;
  at: string;
  kind: EvolutionMilestoneKind;
  title: string;
  description: string;
  snapshotId: string;
  area: EvolutionChangeArea;
}

export interface EvolutionTimelineEntry {
  id: string;
  at: string;
  kind: EvolutionMilestoneKind | "visit" | "snapshot";
  title: string;
  description: string;
  snapshotId?: string;
  polarity: EvolutionChangePolarity;
}

export interface EvolutionChangeItem {
  id: string;
  area: EvolutionChangeArea;
  polarity: EvolutionChangePolarity;
  title: string;
  description: string;
}

export interface SnapshotComparison {
  fromSnapshotId: string | null;
  toSnapshotId: string;
  fromAt: string | null;
  toAt: string;
  whatChanged: EvolutionChangeItem[];
  progress: EvolutionChangeItem[];
  regression: EvolutionChangeItem[];
  futureFocus: EvolutionChangeItem[];
}

export interface CompanyEvolutionHistory {
  version: 1;
  snapshots: CompanySnapshot[];
  milestones: EvolutionMilestone[];
  timeline: EvolutionTimelineEntry[];
  lastVisitAt: string | null;
  previousVisitSnapshotId: string | null;
  lastVisitSnapshotId: string | null;
}
