/**
 * Solution Architecture — Mission 6 domain contracts.
 * Deterministic software design from Business Blueprint.
 * No code generation. No LLM. No diagrams. No PDFs.
 */

export type SolutionEvidenceSource =
  | "blueprint"
  | "knowledge"
  | "meeting"
  | "reasoning"
  | "consulting"
  | "memory";

export type SolutionModuleName =
  | "CRM"
  | "Sales"
  | "Purchasing"
  | "Inventory"
  | "Production"
  | "Maintenance"
  | "Finance"
  | "Collections"
  | "HR"
  | "Projects"
  | "Customer Service"
  | "Compliance"
  | "Analytics"
  | "Documents"
  | "Assets"
  | "Fleet"
  | "Scheduling"
  | "Field Service"
  | "Approvals"
  | "Notifications"
  | "Knowledge"
  | "AI Assistant";

export type SolutionRoleName =
  | "Owner"
  | "Manager"
  | "Sales"
  | "Purchasing"
  | "Production"
  | "Accounting"
  | "Operations"
  | "Warehouse"
  | "HR"
  | "Technician"
  | "Field Rep"
  | "Administrator";

export type SolutionEntityName =
  | "Customer"
  | "Contact"
  | "Location"
  | "Quote"
  | "Order"
  | "Invoice"
  | "Payment"
  | "Visit"
  | "Task"
  | "Message"
  | "Purchase Request"
  | "Purchase Order"
  | "Supplier"
  | "Inventory Item"
  | "Machine"
  | "Maintenance Plan"
  | "Employee"
  | "Role"
  | "Permission"
  | "Document"
  | "Asset"
  | "Risk"
  | "Workflow"
  | "Approval";

export type SolutionFutureOutputKind =
  | "cursor_prompts"
  | "prds"
  | "database_schemas"
  | "openapi"
  | "architecture_diagrams"
  | "sprint_plans"
  | "developer_handoff"
  | "infrastructure_plans";

export interface SolutionEvidenceRef {
  source: SolutionEvidenceSource;
  id: string;
  label: string;
}

export interface SolutionModule {
  id: string;
  name: SolutionModuleName;
  purpose: string;
  confidence: number;
  evidence: SolutionEvidenceRef[];
  dependencies: SolutionModuleName[];
  futureExpansion: string[];
}

export interface SolutionEntity {
  id: string;
  name: SolutionEntityName;
  purpose: string;
  confidence: number;
  evidence: SolutionEvidenceRef[];
  owningModule: SolutionModuleName | null;
}

export interface SolutionRelationship {
  id: string;
  fromEntity: SolutionEntityName;
  cardinality: "has many" | "has one" | "belongs to" | "creates" | "receives" | "owns";
  toEntity: SolutionEntityName;
  label: string;
  confidence: number;
  evidence: SolutionEvidenceRef[];
}

export interface SolutionRole {
  id: string;
  name: SolutionRoleName;
  responsibilities: string[];
  needs: string[];
  permissionIds: string[];
  primaryScreens: string[];
  confidence: number;
  evidence: SolutionEvidenceRef[];
}

export interface SolutionPermission {
  id: string;
  capability: string;
  description: string;
  module: SolutionModuleName | null;
  confidence: number;
  evidence: SolutionEvidenceRef[];
}

export interface SolutionNavItem {
  id: string;
  label: string;
  module: SolutionModuleName | null;
  children: string[];
  confidence: number;
  evidence: SolutionEvidenceRef[];
}

export interface SolutionBusinessRule {
  id: string;
  statement: string;
  domain: string;
  confidence: number;
  evidence: SolutionEvidenceRef[];
}

export interface SolutionApprovalRule {
  id: string;
  statement: string;
  thresholdHint: string | null;
  roles: SolutionRoleName[];
  confidence: number;
  evidence: SolutionEvidenceRef[];
}

export interface SolutionIntegration {
  id: string;
  name: string;
  purpose: string;
  status: "current" | "planned" | "retire";
  confidence: number;
  evidence: SolutionEvidenceRef[];
}

export interface SolutionAiAgent {
  id: string;
  name: string;
  purpose: string;
  dependsOnModules: SolutionModuleName[];
  confidence: number;
  evidence: SolutionEvidenceRef[];
}

export interface ConceptualField {
  name: string;
  kind: "string" | "number" | "boolean" | "date" | "enum" | "relation" | "json";
  required: boolean;
  optional: boolean;
  audit: boolean;
  futureExtension: boolean;
  description: string;
}

export interface ConceptualTable {
  id: string;
  entity: SolutionEntityName;
  fields: ConceptualField[];
  relationships: string[];
  confidence: number;
  evidence: SolutionEvidenceRef[];
}

export interface ConceptualApi {
  id: string;
  resource: string;
  operations: Array<"list" | "get" | "create" | "update" | "delete" | "action">;
  relatedEntity: SolutionEntityName | null;
  confidence: number;
  evidence: SolutionEvidenceRef[];
}

export interface SolutionWorkflowRef {
  id: string;
  name: string;
  trigger: string;
  module: SolutionModuleName | null;
  stepCount: number;
  confidence: number;
  evidence: SolutionEvidenceRef[];
}

export interface ImplementationPhase {
  id: string;
  phase: number;
  name: string;
  goals: string[];
  modules: SolutionModuleName[];
  dependencies: string[];
  businessValue: string;
  estimatedComplexity: "low" | "moderate" | "high" | "very_high";
  confidence: number;
}

export interface SolutionFutureOutput {
  id: SolutionFutureOutputKind;
  title: string;
  description: string;
  status: "designed" | "planned";
  sourcedFrom: "solution_architecture";
}

export interface SolutionArchitecture {
  id: string;
  workspaceId: string;
  blueprintId: string;
  blueprintVersion: number;
  generatedAt: string;
  summary: string;
  modules: SolutionModule[];
  entities: SolutionEntity[];
  relationships: SolutionRelationship[];
  roles: SolutionRole[];
  permissions: SolutionPermission[];
  navigation: SolutionNavItem[];
  departments: string[];
  businessRules: SolutionBusinessRule[];
  approvalRules: SolutionApprovalRule[];
  integrations: SolutionIntegration[];
  aiAgents: SolutionAiAgent[];
  workflows: SolutionWorkflowRef[];
  database: ConceptualTable[];
  apis: ConceptualApi[];
  roadmap: ImplementationPhase[];
  configuration: Record<string, string>;
  evidence: SolutionEvidenceRef[];
  overallConfidence: number;
}
