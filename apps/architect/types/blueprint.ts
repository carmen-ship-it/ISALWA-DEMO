/**
 * Business OS Blueprint — Mission 4 domain contracts.
 * Structured operating-system description. No diagrams. No generated artifacts yet.
 */

export type BlueprintCapabilityName =
  | "Lead Management"
  | "Customer Management"
  | "Sales"
  | "Quoting"
  | "Orders"
  | "Inventory"
  | "Purchasing"
  | "Production"
  | "Maintenance"
  | "Collections"
  | "Accounting"
  | "Reporting"
  | "Approvals"
  | "Field Visits"
  | "Scheduling"
  | "Quality"
  | "Support"
  | "HR"
  | "Security"
  | "Notifications"
  | "AI Assistant";

export type BlueprintDepartmentName =
  | "Sales"
  | "Purchasing"
  | "Finance"
  | "Production"
  | "Warehouse"
  | "Maintenance"
  | "Operations"
  | "Management"
  | "Support";

export type PainPointMatrixCategory =
  | "Operational"
  | "Commercial"
  | "Financial"
  | "Communication"
  | "Data"
  | "Compliance"
  | "Technology"
  | "Management";

export type OpportunityHorizon =
  | "Quick Wins"
  | "30-day Projects"
  | "90-day Projects"
  | "Strategic Initiatives"
  | "Innovation";

export type ArchitectureHorizon = "current" | "transition" | "future";

export type BlueprintEvidenceSource =
  | "knowledge"
  | "memory"
  | "meeting"
  | "reasoning"
  | "timeline"
  | "recommendation";

export type BlueprintFutureOutputKind =
  | "process_maps"
  | "proposal_pdfs"
  | "technical_prds"
  | "epic_backlogs"
  | "cursor_prompts"
  | "architecture_documents"
  | "implementation_roadmaps"
  | "isalwa_configuration"
  | "software_estimates"
  | "rfp_responses";

export interface BlueprintEvidenceRef {
  source: BlueprintEvidenceSource;
  id: string;
  label: string;
}

export interface BlueprintCapability {
  id: string;
  name: BlueprintCapabilityName;
  purpose: string;
  owner: string | null;
  department: BlueprintDepartmentName | null;
  inputs: string[];
  outputs: string[];
  dependencies: string[];
  painPoints: string[];
  futureOpportunities: string[];
  evidence: BlueprintEvidenceRef[];
}

export interface BlueprintDepartment {
  id: string;
  name: BlueprintDepartmentName;
  purpose: string;
  capabilityIds: string[];
  headcountHint: string | null;
  evidence: BlueprintEvidenceRef[];
}

export interface BlueprintWorkflowStep {
  id: string;
  name: string;
  actor: string;
  input: string;
  output: string;
  decision: string | null;
  systemUsed: string | null;
  manual: boolean;
  estimatedTime: string | null;
  painPoints: string[];
  automationPotential: "none" | "low" | "medium" | "high";
}

export interface BlueprintWorkflow {
  id: string;
  name: string;
  owner: string | null;
  trigger: string;
  steps: BlueprintWorkflowStep[];
  participants: string[];
  systems: string[];
  painPoints: string[];
  exceptions: string[];
  outputs: string[];
  metrics: string[];
  evidence: BlueprintEvidenceRef[];
}

export interface BlueprintEntity {
  id: string;
  name: string;
  purpose: string;
  relationships: string[];
  lifecycle: string[];
  owner: string | null;
  evidence: BlueprintEvidenceRef[];
}

export interface OperatingRule {
  id: string;
  statement: string;
  domain: string;
  enforcement: "informal" | "policy" | "system" | "unknown";
  evidence: BlueprintEvidenceRef[];
}

export interface SystemInventoryItem {
  id: string;
  name: string;
  purpose: string;
  strengths: string[];
  weaknesses: string[];
  replacementStrategy: string;
  evidence: BlueprintEvidenceRef[];
}

export interface PainPointMatrixItem {
  id: string;
  category: PainPointMatrixCategory;
  title: string;
  description: string;
  severity: "info" | "notable" | "critical";
  evidence: BlueprintEvidenceRef[];
}

export interface OpportunityMatrixItem {
  id: string;
  horizon: OpportunityHorizon;
  title: string;
  description: string;
  relatedCapabilityIds: string[];
  evidence: BlueprintEvidenceRef[];
}

export interface ArchitectureState {
  horizon: ArchitectureHorizon;
  summary: string;
  systems: string[];
  capabilities: string[];
  notes: string[];
}

export interface FutureArchitecture {
  current: ArchitectureState;
  transition: ArchitectureState;
  future: ArchitectureState;
}

export interface BlueprintModule {
  id: string;
  name: string;
  purpose: string;
  priority: "core" | "supporting" | "future";
  capabilityIds: string[];
}

export interface BlueprintIntegration {
  id: string;
  name: string;
  purpose: string;
  status: "current" | "planned" | "retire";
  systems: string[];
}

export interface BusinessBlueprint {
  id: string;
  workspaceId: string;
  version: number;
  generatedAt: string;
  title: string;
  summary: string;
  currentState: string;
  futureState: string;
  capabilities: BlueprintCapability[];
  departments: BlueprintDepartment[];
  roles: string[];
  systems: SystemInventoryItem[];
  workflows: BlueprintWorkflow[];
  entities: BlueprintEntity[];
  operatingRules: OperatingRule[];
  painPoints: PainPointMatrixItem[];
  recommendations: string[];
  opportunities: OpportunityMatrixItem[];
  modules: BlueprintModule[];
  integrations: BlueprintIntegration[];
  risks: string[];
  assumptions: string[];
  openQuestions: string[];
  futureArchitecture: FutureArchitecture;
  /** Evidence lineage — Knowledge, Memory, Meetings, Reasoning, Timeline, Recommendations. */
  evidence: BlueprintEvidenceRef[];
  meetingId: string | null;
  interviewId: string | null;
  superseded: boolean;
}

export interface BlueprintFutureOutput {
  id: BlueprintFutureOutputKind;
  title: string;
  description: string;
  status: "designed" | "planned";
  sourcedFrom: "business_blueprint";
}

export interface WorkspaceBlueprintStore {
  versions: BusinessBlueprint[];
  currentVersion: number | null;
}
