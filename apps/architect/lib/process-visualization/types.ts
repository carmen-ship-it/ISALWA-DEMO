/**
 * Process Visualization — Mission 8 presentation contracts.
 * Read-only views over the canonical Business Process Engine.
 * Never invents workflows. Never duplicates process logic.
 */

import type {
  ProcessRiskLevel,
  ProcessStep,
  ProcessWorkflow,
} from "@/types";

export type ProcessViewKind =
  | "executive"
  | "swimlane"
  | "department";

export type ProcessOverlayKind =
  | "none"
  | "pain"
  | "automation"
  | "time"
  | "dependency";

export type PainTone = "healthy" | "attention" | "bottleneck" | "critical";

export type AutomationTone =
  | "manual"
  | "ai_opportunity"
  | "automation"
  | "human_approval";

/** Presentation node — references ProcessStep.id, never copies business rules. */
export interface VizNode {
  id: string;
  stepId: string;
  workflowId: string;
  label: string;
  order: number;
  actor: string;
  department: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  laneIndex: number;
  pain: PainTone;
  automation: AutomationTone;
  durationLabel: string | null;
  isHandoffTarget: boolean;
  isApproval: boolean;
  collapsed: boolean;
}

export interface VizEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  handoffId: string | null;
  kind: "sequence" | "handoff";
}

export interface VizLane {
  id: string;
  label: string;
  department: string;
  y: number;
  height: number;
  stepIds: string[];
}

export interface VizDependencyPanel {
  stepId: string;
  documents: string[];
  systems: string[];
  roles: string[];
  approvals: string[];
  policies: string[];
  inputs: string[];
  outputs: string[];
}

export interface ProcessStudioMetrics {
  totalSteps: number;
  departments: number;
  manualSteps: number;
  automationOpportunities: number;
  approvals: number;
  documents: number;
  averageDurationLabel: string;
  averageDurationMinutes: number | null;
  riskLevel: ProcessRiskLevel;
  processHealth: number;
  coverage: number;
}

export interface ProcessVisualizationModel {
  workflowId: string;
  workflowName: string;
  view: ProcessViewKind;
  overlay: ProcessOverlayKind;
  nodes: VizNode[];
  edges: VizEdge[];
  lanes: VizLane[];
  bounds: { width: number; height: number };
  metrics: ProcessStudioMetrics;
  /** Step IDs that are approval points (refs only). */
  approvalStepIds: string[];
  bottleneckStepIds: string[];
}

export interface DeriveVisualizationInput {
  workflow: ProcessWorkflow;
  view: ProcessViewKind;
  overlay: ProcessOverlayKind;
  departmentFilter: string | null;
  approvalStepIds: Set<string>;
  bottleneckByStepId: Map<string, ProcessRiskLevel>;
  collapsedGroups: Set<string>;
}

export type { ProcessStep, ProcessWorkflow };
