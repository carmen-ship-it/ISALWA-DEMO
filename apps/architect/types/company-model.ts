/**
 * Company Digital Twin — Mission 12 domain contracts.
 * Living operating model derived from Blueprint, Knowledge, Meetings,
 * Consulting, and Processes. Evidence-only. No diagrams. No LLM.
 *
 * Gemelo digital operativo: referencias por ID, sin payloads duplicados.
 */

export type CompanyModelEvidenceSource =
  | "blueprint"
  | "knowledge"
  | "meeting"
  | "consulting"
  | "memory"
  | "process"
  | "solution"
  | "people";

export type CompanyRelationshipKind =
  | "uses"
  | "depends_on"
  | "reports_to"
  | "owns"
  | "approves"
  | "produces"
  | "purchases"
  | "communicates_with"
  | "belongs_to"
  | "hands_off_to";

export type CompanyOwnershipKind =
  | "department_capability"
  | "workflow"
  | "system"
  | "information"
  | "product";

export type CompanyPartyKind = "customer" | "supplier";

export type CompanyDependencyKind =
  | "workflow"
  | "system"
  | "person"
  | "information"
  | "external";

export type CompanyDependencyCriticality =
  | "critical"
  | "high"
  | "moderate"
  | "low";

export type CompanyModelHealthBand =
  | "strong"
  | "adequate"
  | "fragile"
  | "unknown";

export type CompanyInformationRole =
  | "input"
  | "output"
  | "supporting"
  | "handoff";

export interface CompanyModelEvidenceRef {
  source: CompanyModelEvidenceSource;
  id: string;
  label: string;
}

/** Organization envelope — company-level twin identity. */
export interface CompanyOrganization {
  workspaceId: string;
  companyName: string;
  industry: string;
  stage: string;
  blueprintId: string;
  solutionArchitectureId: string | null;
  businessProcessModelId: string | null;
  summary: string;
  confidence: number;
  evidence: CompanyModelEvidenceRef[];
}

export interface CompanyDepartment {
  id: string;
  name: string;
  purpose: string;
  /** Blueprint department ID — no embedded payload. */
  blueprintDepartmentId: string;
  knowledgeEntityId: string | null;
  capabilityIds: string[];
  personIds: string[];
  roleIds: string[];
  systemIds: string[];
  workflowIds: string[];
  headcountHint: string | null;
  confidence: number;
  evidence: CompanyModelEvidenceRef[];
}

export interface CompanyRole {
  id: string;
  name: string;
  solutionRoleId: string | null;
  departmentId: string | null;
  personIds: string[];
  responsibilities: string[];
  confidence: number;
  evidence: CompanyModelEvidenceRef[];
}

export interface CompanyPerson {
  id: string;
  name: string;
  workspacePersonId: string | null;
  processActorId: string | null;
  knowledgeEntityId: string | null;
  roleIds: string[];
  departmentId: string | null;
  email: string | null;
  notes: string | null;
  confidence: number;
  evidence: CompanyModelEvidenceRef[];
}

export interface CompanySystem {
  id: string;
  name: string;
  purpose: string;
  blueprintSystemId: string | null;
  solutionIntegrationId: string | null;
  knowledgeEntityId: string | null;
  departmentIds: string[];
  workflowIds: string[];
  replacementStrategy: string | null;
  confidence: number;
  evidence: CompanyModelEvidenceRef[];
}

export interface CompanyParty {
  id: string;
  kind: CompanyPartyKind;
  name: string;
  knowledgeEntityId: string | null;
  solutionEntityId: string | null;
  relatedWorkflowIds: string[];
  confidence: number;
  evidence: CompanyModelEvidenceRef[];
}

export interface CompanyProduct {
  id: string;
  name: string;
  knowledgeEntityId: string | null;
  /** Alias / stable entity key when known. */
  entityId: string | null;
  confidence: number;
  evidence: CompanyModelEvidenceRef[];
}

/** Lightweight workflow pointer into Process / Blueprint engines. */
export interface CompanyWorkflowRef {
  id: string;
  name: string;
  processWorkflowId: string | null;
  blueprintWorkflowId: string | null;
  departmentId: string | null;
  ownerPersonId: string | null;
  systemIds: string[];
  actorPersonIds: string[];
  confidence: number;
  evidence: CompanyModelEvidenceRef[];
}

export interface CompanyInformationNode {
  id: string;
  name: string;
  role: CompanyInformationRole;
  processDocumentId: string | null;
  workflowIds: string[];
  producerDepartmentId: string | null;
  consumerDepartmentIds: string[];
  confidence: number;
  evidence: CompanyModelEvidenceRef[];
}

export interface CompanyApprovalRef {
  id: string;
  name: string;
  processApprovalId: string | null;
  solutionApprovalRuleId: string | null;
  operatingRuleId: string | null;
  authority: string;
  workflowId: string | null;
  confidence: number;
  evidence: CompanyModelEvidenceRef[];
}

export interface CompanyOwnership {
  id: string;
  kind: CompanyOwnershipKind;
  ownerLabel: string;
  ownerPersonId: string | null;
  ownerDepartmentId: string | null;
  ownerRoleId: string | null;
  targetId: string;
  targetLabel: string;
  confidence: number;
  evidence: CompanyModelEvidenceRef[];
}

export interface CompanyRelationship {
  id: string;
  kind: CompanyRelationshipKind;
  fromId: string;
  fromLabel: string;
  toId: string;
  toLabel: string;
  knowledgeRelationshipId: string | null;
  processHandoffId: string | null;
  label: string;
  confidence: number;
  evidence: CompanyModelEvidenceRef[];
}

export interface CompanyInformationFlow {
  id: string;
  name: string;
  fromId: string;
  fromLabel: string;
  toId: string;
  toLabel: string;
  informationIds: string[];
  workflowId: string | null;
  processHandoffId: string | null;
  missingInformation: string[];
  risk: string;
  confidence: number;
  evidence: CompanyModelEvidenceRef[];
}

export interface CompanyDecisionFlow {
  id: string;
  name: string;
  trigger: string;
  authority: string;
  approvalIds: string[];
  workflowId: string | null;
  departmentId: string | null;
  confidence: number;
  evidence: CompanyModelEvidenceRef[];
}

export interface CompanyDependency {
  id: string;
  kind: CompanyDependencyKind;
  criticality: CompanyDependencyCriticality;
  fromId: string;
  fromLabel: string;
  toId: string;
  toLabel: string;
  reason: string;
  processDependencyId: string | null;
  consultingRiskId: string | null;
  confidence: number;
  evidence: CompanyModelEvidenceRef[];
}

export interface CompanyModelHealth {
  band: CompanyModelHealthBand;
  overallScore: number;
  coverageScore: number;
  ownershipClarity: number;
  dependencyRisk: number;
  informationClarity: number;
  notes: string[];
  confidence: number;
  evidence: CompanyModelEvidenceRef[];
}

/**
 * Full company digital twin — continuously evolving operating model.
 * All nested entities use stable modelIds; cross-engine links are ID refs only.
 */
export interface CompanyModel {
  id: string;
  workspaceId: string;
  blueprintId: string;
  blueprintVersion: number;
  generatedAt: string;
  summary: string;
  organization: CompanyOrganization;
  departments: CompanyDepartment[];
  people: CompanyPerson[];
  roles: CompanyRole[];
  systems: CompanySystem[];
  customers: CompanyParty[];
  suppliers: CompanyParty[];
  products: CompanyProduct[];
  workflows: CompanyWorkflowRef[];
  information: CompanyInformationNode[];
  approvals: CompanyApprovalRef[];
  ownership: CompanyOwnership[];
  relationships: CompanyRelationship[];
  informationFlows: CompanyInformationFlow[];
  decisionFlows: CompanyDecisionFlow[];
  dependencies: CompanyDependency[];
  health: CompanyModelHealth;
  evidence: CompanyModelEvidenceRef[];
  overallConfidence: number;
  reasoning: string[];
}
