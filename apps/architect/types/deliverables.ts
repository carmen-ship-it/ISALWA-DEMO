/**
 * Deliverables Engine — Mission 9 domain contracts.
 * Structured consulting package. Documentation only. No LLM. No exports yet.
 */

export type DeliverableKind =
  | "executive_summary"
  | "business_assessment"
  | "business_blueprint"
  | "solution_architecture"
  | "process_book"
  | "prd"
  | "technical_architecture"
  | "cursor_context"
  | "development_roadmap"
  | "implementation_plan"
  | "sprint_backlog"
  | "proposal";

export type DeliverableExportTarget =
  | "pdf"
  | "word"
  | "markdown"
  | "powerpoint"
  | "notion"
  | "confluence"
  | "cursor"
  | "github"
  | "linear"
  | "jira";

export interface DeliverableEvidenceRef {
  source:
    | "blueprint"
    | "solution"
    | "process"
    | "consulting"
    | "knowledge"
    | "memory"
    | "meeting"
    | "report";
  id: string;
  label: string;
}

export interface ExecutiveSummaryDeliverable {
  kind: "executive_summary";
  vision: string;
  currentState: string;
  problems: string[];
  biggestRisks: string[];
  immediateOpportunities: string[];
  strategicOpportunities: string[];
  recommendedRoadmap: string[];
  investmentAreas: string[];
  executiveRecommendation: string;
  evidence: DeliverableEvidenceRef[];
}

export interface BusinessAssessmentDeliverable {
  kind: "business_assessment";
  currentProcesses: string[];
  departments: string[];
  maturity: Array<{ dimension: string; score: number; confidence: number }>;
  healthScores: Array<{ dimension: string; score: number; confidence: number }>;
  painPoints: string[];
  risks: Array<{ title: string; severity: string; impact: string }>;
  dependencies: string[];
  automationOpportunities: string[];
  overallMaturity: number | null;
  overallHealth: number | null;
  evidence: DeliverableEvidenceRef[];
}

export interface BlueprintDeliverable {
  kind: "business_blueprint";
  blueprintId: string;
  version: number;
  title: string;
  summary: string;
  capabilities: string[];
  departments: string[];
  workflows: string[];
  entities: string[];
  systems: string[];
  operatingRules: string[];
  modules: string[];
  risks: string[];
  evidence: DeliverableEvidenceRef[];
}

export interface SolutionDeliverable {
  kind: "solution_architecture";
  solutionId: string;
  blueprintVersion: number;
  summary: string;
  modules: string[];
  entities: string[];
  relationships: string[];
  roles: string[];
  permissions: string[];
  navigation: string[];
  integrations: string[];
  roadmap: string[];
  evidence: DeliverableEvidenceRef[];
}

export interface ProcessBookWorkflow {
  id: string;
  name: string;
  purpose: string;
  trigger: string;
  owner: string | null;
  steps: Array<{
    order: number;
    name: string;
    actor: string;
    manual: boolean;
    duration: string | null;
  }>;
  approvals: string[];
  actors: string[];
  dependencies: string[];
  automationOpportunities: string[];
}

export interface ProcessBookDeliverable {
  kind: "process_book";
  processModelId: string;
  blueprintVersion: number;
  summary: string;
  workflows: ProcessBookWorkflow[];
  /** Reuse Mission 8 Process Studio for diagrams — ID refs only. */
  visualizationWorkflowIds: string[];
  evidence: DeliverableEvidenceRef[];
}

export interface PrdDeliverable {
  kind: "prd";
  goals: string[];
  users: string[];
  requirements: string[];
  functionalRequirements: string[];
  nonFunctionalRequirements: string[];
  acceptanceCriteria: string[];
  dependencies: string[];
  futureScope: string[];
  outOfScope: string[];
  risks: string[];
  evidence: DeliverableEvidenceRef[];
}

export interface TechnicalArchitectureDeliverable {
  kind: "technical_architecture";
  systemModules: string[];
  databaseConcepts: string[];
  apiConcepts: string[];
  permissions: string[];
  authentication: string[];
  audit: string[];
  integrations: string[];
  evidence: DeliverableEvidenceRef[];
}

export interface CursorContextDeliverable {
  kind: "cursor_context";
  purpose: string;
  coreModules: string[];
  businessRules: string[];
  criticalWorkflows: string[];
  importantConstraints: string[];
  domainLanguage: string[];
  successMetrics: string[];
  doNot: string[];
  narrative: string;
  evidence: DeliverableEvidenceRef[];
}

export interface DeliverableRoadmapPhase {
  phase: number;
  name: string;
  goals: string[];
  modules: string[];
  dependencies: string[];
  businessValue: string;
  complexity: string;
}

export interface DevelopmentRoadmapDeliverable {
  kind: "development_roadmap";
  phases: DeliverableRoadmapPhase[];
  future: string[];
  evidence: DeliverableEvidenceRef[];
}

export interface ImplementationPlanDeliverable {
  kind: "implementation_plan";
  phases: Array<{
    name: string;
    objectives: string[];
    workstreams: string[];
    exitCriteria: string[];
  }>;
  dependencies: string[];
  risks: string[];
  evidence: DeliverableEvidenceRef[];
}

export interface BacklogStory {
  id: string;
  title: string;
  acceptanceCriteria: string[];
  priority: "P0" | "P1" | "P2" | "P3";
  dependencies: string[];
}

export interface BacklogFeature {
  id: string;
  title: string;
  stories: BacklogStory[];
}

export interface BacklogEpic {
  id: string;
  title: string;
  features: BacklogFeature[];
}

export interface SprintBacklogDeliverable {
  kind: "sprint_backlog";
  epics: BacklogEpic[];
  evidence: DeliverableEvidenceRef[];
}

export interface ProposalDeliverable {
  kind: "proposal";
  title: string;
  engagementSummary: string;
  recommendedApproach: string;
  scope: string[];
  timelineOutline: string[];
  investmentNarrative: string;
  nextSteps: string[];
  evidence: DeliverableEvidenceRef[];
}

export interface DeliverableExportContract {
  id: DeliverableExportTarget;
  title: string;
  description: string;
  status: "designed" | "planned";
}

export interface DeliverablesPackage {
  id: string;
  workspaceId: string;
  companyName: string;
  generatedAt: string;
  blueprintId: string | null;
  blueprintVersion: number | null;
  solutionId: string | null;
  processModelId: string | null;
  summary: string;
  executiveSummary: ExecutiveSummaryDeliverable;
  businessAssessment: BusinessAssessmentDeliverable;
  businessBlueprint: BlueprintDeliverable | null;
  solutionArchitecture: SolutionDeliverable | null;
  processBook: ProcessBookDeliverable | null;
  prd: PrdDeliverable;
  technicalArchitecture: TechnicalArchitectureDeliverable;
  cursorContext: CursorContextDeliverable;
  developmentRoadmap: DevelopmentRoadmapDeliverable;
  implementationPlan: ImplementationPlanDeliverable;
  sprintBacklog: SprintBacklogDeliverable;
  proposal: ProposalDeliverable;
  evidence: DeliverableEvidenceRef[];
  overallConfidence: number;
}
