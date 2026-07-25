/**
 * Business Process Engine — Mission 7 domain contracts.
 * Canonical operational model. Structural only — no diagrams, Mermaid, BPMN, SVG, PDF, or LLM.
 */

export type ProcessWorkflowStatus =
  | "documented"
  | "partial"
  | "unknown_steps"
  | "inferred";

export type ProcessRiskLevel = "low" | "moderate" | "high" | "critical";

export type ProcessBottleneckKind =
  | "manual_approvals"
  | "duplicate_entry"
  | "excel_dependency"
  | "whatsapp_dependency"
  | "paper_forms"
  | "waiting"
  | "missing_ownership"
  | "missing_information"
  | "missing_systems"
  | "manual_calculations";

export type ProcessEvidenceSource =
  | "blueprint"
  | "knowledge"
  | "meeting"
  | "memory"
  | "consulting"
  | "solution"
  | "timeline"
  | "reasoning";

export interface ProcessEvidenceRef {
  source: ProcessEvidenceSource;
  id: string;
  label: string;
}

export interface ProcessActor {
  id: string;
  name: string;
  department: string | null;
  stepIds: string[];
  workflowIds: string[];
  confidence: number;
  evidence: ProcessEvidenceRef[];
}

export interface ProcessStep {
  id: string;
  blueprintStepId: string;
  order: number;
  name: string;
  description: string;
  /** Explicit unknown when blueprint lacks actor detail. */
  actor: string;
  actorUnknown: boolean;
  inputs: string[];
  outputs: string[];
  systemsUsed: string[];
  documentsUsed: string[];
  estimatedDuration: string | null;
  manual: boolean;
  automated: boolean;
  aiOpportunity: string | null;
  riskLevel: ProcessRiskLevel;
  confidence: number;
  evidence: ProcessEvidenceRef[];
}

export interface ProcessHandoff {
  id: string;
  workflowId: string;
  from: string;
  to: string;
  fromStepId: string;
  toStepId: string;
  requiredInformation: string[];
  missingInformation: string[];
  risk: ProcessRiskLevel;
  automationOpportunity: string | null;
  confidence: number;
  evidence: ProcessEvidenceRef[];
}

export interface ProcessApproval {
  id: string;
  workflowId: string;
  stepId: string | null;
  name: string;
  criteria: string;
  authority: string;
  delayRisk: ProcessRiskLevel;
  /** Cross-ref to SolutionArchitecture.approvalRules when matched. */
  solutionApprovalRuleId: string | null;
  confidence: number;
  evidence: ProcessEvidenceRef[];
}

export interface ProcessDocumentRef {
  id: string;
  workflowId: string;
  stepId: string | null;
  name: string;
  role: "input" | "output" | "supporting";
  confidence: number;
  evidence: ProcessEvidenceRef[];
}

export interface ProcessException {
  id: string;
  workflowId: string;
  description: string;
  confidence: number;
  evidence: ProcessEvidenceRef[];
}

export interface ProcessBottleneck {
  id: string;
  workflowId: string | null;
  stepId: string | null;
  kind: ProcessBottleneckKind;
  title: string;
  severity: ProcessRiskLevel;
  confidence: number;
  businessImpact: string;
  /** Cross-ref ConsultingRisk.id when matched. */
  consultingRiskId: string | null;
  evidence: ProcessEvidenceRef[];
}

export interface ProcessMetrics {
  complexity: number;
  automationScore: number;
  documentationScore: number;
  riskScore: number;
  aiReadiness: number;
  systemSupport: number;
  confidence: number;
}

export interface ProcessAutomationCandidate {
  id: string;
  workflowId: string;
  stepId: string | null;
  quickAutomation: string | null;
  futureAutomation: string | null;
  aiOpportunity: string | null;
  estimatedImpact: string;
  confidence: number;
  evidence: ProcessEvidenceRef[];
}

export interface ProcessDependency {
  id: string;
  fromWorkflowId: string;
  toWorkflowId: string;
  relationship: "feeds" | "depends_on" | "shares_actor" | "shares_system";
  confidence: number;
  evidence: ProcessEvidenceRef[];
}

export interface ProcessWorkflow {
  id: string;
  /** Canonical origin — never invent workflows without this. */
  blueprintWorkflowId: string;
  name: string;
  department: string | null;
  purpose: string;
  trigger: string;
  owner: string | null;
  confidence: number;
  status: ProcessWorkflowStatus;
  steps: ProcessStep[];
  actorIds: string[];
  handoffIds: string[];
  approvalIds: string[];
  documentIds: string[];
  exceptionIds: string[];
  bottleneckIds: string[];
  automationCandidateIds: string[];
  metrics: ProcessMetrics;
  /** Cross-refs — IDs only, no duplicated payloads. */
  solutionWorkflowId: string | null;
  knowledgeAssetIds: string[];
  consultingRiskIds: string[];
  evidence: ProcessEvidenceRef[];
}

export interface BusinessProcessModel {
  id: string;
  workspaceId: string;
  blueprintId: string;
  blueprintVersion: number;
  generatedAt: string;
  summary: string;
  workflows: ProcessWorkflow[];
  actors: ProcessActor[];
  handoffs: ProcessHandoff[];
  approvals: ProcessApproval[];
  documents: ProcessDocumentRef[];
  exceptions: ProcessException[];
  bottlenecks: ProcessBottleneck[];
  automationCandidates: ProcessAutomationCandidate[];
  dependencies: ProcessDependency[];
  /** Cross-ref SolutionArchitecture.id */
  solutionArchitectureId: string | null;
  evidence: ProcessEvidenceRef[];
  overallConfidence: number;
}
