/**
 * Executive Cockpit — Mission 13 contracts.
 * Pure presentation models derived from existing workspace packs.
 * No engines. No notifications. No email. Read-only.
 */

import type { RiskSeverity } from "@/types";

export type CockpitUrgency = "now" | "next" | "later";

export type CockpitAlertSource =
  | "consulting"
  | "process"
  | "memory"
  | "knowledge";

export type CockpitRecommendationKind =
  | "quick_win"
  | "strategic"
  | "priority";

export interface ExecutiveScoreComponent {
  id: string;
  label: string;
  score: number;
  weight: number;
}

export interface ExecutiveScore {
  overall: number;
  label: string;
  components: ExecutiveScoreComponent[];
}

export interface DepartmentHealthItem {
  id: string;
  name: string;
  score: number | null;
  label: string;
  evidence: string[];
}

export interface PriorityItem {
  id: string;
  title: string;
  urgency: CockpitUrgency;
  rationale: string | null;
  source: "recommendation" | "opportunity" | "risk" | "decision";
}

export interface CockpitAlert {
  id: string;
  title: string;
  severity: RiskSeverity | "attention";
  detail: string;
  source: CockpitAlertSource;
}

export interface CockpitRecommendation {
  id: string;
  title: string;
  kind: CockpitRecommendationKind;
  horizon: string | null;
  confidence: number | null;
  rationale: string | null;
}

export interface DiscoveryItem {
  id: string;
  title: string;
  detail: string;
  date: string | null;
}

export interface PendingDecision {
  id: string;
  title: string;
  detail: string;
}

export interface AutomationProgress {
  score: number | null;
  label: string;
  candidateCount: number;
  highlights: string[];
}

export interface AiReadinessProgress {
  score: number | null;
  label: string;
  blockers: string[];
}

export interface RoadmapPhaseProgress {
  phase: number;
  name: string;
  status: "designed" | "planned";
  modules: string[];
}

export interface RoadmapProgress {
  totalPhases: number;
  designedPhases: number;
  percent: number;
  phases: RoadmapPhaseProgress[];
  summary: string;
}

export interface BusinessHealthSurface {
  overall: number | null;
  label: string;
  gauges: Array<{
    id: string;
    label: string;
    score: number;
  }>;
}

export interface ExecutiveCockpit {
  score: ExecutiveScore;
  dailySummary: string;
  businessHealth: BusinessHealthSurface;
  departmentHealth: DepartmentHealthItem[];
  priorities: PriorityItem[];
  openRisks: CockpitAlert[];
  quickWins: CockpitRecommendation[];
  strategicOpportunities: CockpitRecommendation[];
  recentDiscoveries: DiscoveryItem[];
  pendingDecisions: PendingDecision[];
  automation: AutomationProgress;
  aiReadiness: AiReadinessProgress;
  roadmap: RoadmapProgress;
}
