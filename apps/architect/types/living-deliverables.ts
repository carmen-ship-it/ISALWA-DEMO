/**
 * Living Company Deliverables — Mission 26 domain contracts.
 *
 * Composes existing engines (Company Brain, Company Model, Capability Twin,
 * Blueprint, Knowledge Graph, Consulting Intelligence, Recommendations) into
 * eight always-current company documents. This module defines the shapes
 * only — no new scoring, no second knowledge graph. Every field here is
 * either a direct pointer to existing evidence or plain text composed by
 * `lib/deliverables/living/` from that evidence.
 */

import type { BlueprintDeliverable } from "./deliverables";

export type LivingDeliverableKind =
  | "business_blueprint"
  | "company_playbook"
  | "employee_handbook"
  | "sop_library"
  | "job_description_library"
  | "training_academy"
  | "ai_playbook"
  | "improvement_roadmap";

export interface LivingDeliverableEvidenceRef {
  source:
    | "blueprint"
    | "company_model"
    | "process"
    | "consulting"
    | "knowledge"
    | "memory"
    | "recommendation"
    | "readiness";
  id: string;
  label: string;
}

/**
 * The "brain fingerprint" a version was generated against — compared to the
 * workspace's current fingerprint to decide "Update Available". Every field
 * is a count or percentage another engine already publishes (Readiness,
 * Blueprint, Company Model) — never a new score.
 */
export interface KnowledgeFingerprint {
  evidenceCount: number;
  understandingPercent: number;
  blueprintVersion: number | null;
  companyModelGeneratedAt: string | null;
}

export interface CompanyPlaybookContent {
  vision: string | null;
  orgSummary: string;
  decisionPrinciples: string[];
  communicationNorms: string[];
  departments: string[];
  values: string[];
  needsMoreKnowledge: string[];
}

export interface EmployeeHandbookSection {
  title: string;
  body: string;
}

export interface EmployeeHandbookContent {
  hasContent: boolean;
  sections: EmployeeHandbookSection[];
  needsMoreKnowledge: string[];
}

export interface SopStep {
  order: number;
  name: string;
  actor: string;
  description: string;
}

export interface SopDocument {
  id: string;
  processName: string;
  purpose: string;
  owner: string | null;
  trigger: string;
  steps: SopStep[];
  systemsUsed: string[];
  exceptions: string[];
  missingKnowledge: string[];
}

export interface SopLibraryContent {
  sops: SopDocument[];
  needsMoreKnowledge: string[];
}

export interface JobDescriptionDoc {
  id: string;
  roleName: string;
  department: string | null;
  peopleAssigned: string[];
  responsibilities: string[];
  missingKnowledge: string[];
}

export interface JobDescriptionLibraryContent {
  jobs: JobDescriptionDoc[];
  needsMoreKnowledge: string[];
}

export interface TrainingModuleOutline {
  id: string;
  title: string;
  audience: string;
  objectives: string[];
  outline: string[];
}

export interface TrainingAcademyContent {
  modules: TrainingModuleOutline[];
  futureRoadmap: string[];
  needsMoreKnowledge: string[];
}

export interface AiPlaybookItem {
  id: string;
  title: string;
  rationale: string;
  priority: "now" | "next" | "later" | null;
  confidenceBand: string;
}

export interface AiPlaybookContent {
  items: AiPlaybookItem[];
  needsMoreKnowledge: string[];
}

export interface ImprovementRoadmapItem {
  id: string;
  title: string;
  description: string;
  impact: string | null;
  effort: string | null;
}

export interface ImprovementRoadmapContent {
  quickWins: ImprovementRoadmapItem[];
  thirtyDay: ImprovementRoadmapItem[];
  ninetyDay: ImprovementRoadmapItem[];
  longTerm: ImprovementRoadmapItem[];
  needsMoreKnowledge: string[];
}

/** Business Blueprint stays a thin presentation wrapper — reuses `buildBlueprintDeliverable`, never a second derivation. */
export interface BusinessBlueprintLivingContent {
  blueprint: BlueprintDeliverable;
}

export type LivingDeliverableContent =
  | { kind: "business_blueprint"; data: BusinessBlueprintLivingContent }
  | { kind: "company_playbook"; data: CompanyPlaybookContent }
  | { kind: "employee_handbook"; data: EmployeeHandbookContent }
  | { kind: "sop_library"; data: SopLibraryContent }
  | { kind: "job_description_library"; data: JobDescriptionLibraryContent }
  | { kind: "training_academy"; data: TrainingAcademyContent }
  | { kind: "ai_playbook"; data: AiPlaybookContent }
  | { kind: "improvement_roadmap"; data: ImprovementRoadmapContent };

/**
 * One generated, append-only version of a deliverable. Mirrors the Blueprint
 * versioning pattern (`lib/blueprint/derive.ts`) — never mutated, only
 * superseded.
 */
export interface LivingDeliverableVersion {
  id: string;
  kind: LivingDeliverableKind;
  version: number;
  generatedAt: string;
  title: string;
  /** 0–1, derived from `workspace.businessUnderstanding` and content coverage — never invented. */
  confidence: number;
  evidenceCount: number;
  evidence: LivingDeliverableEvidenceRef[];
  missingInformation: string[];
  fingerprint: KnowledgeFingerprint;
  content: LivingDeliverableContent;
  superseded: boolean;
}

/** Persisted on `CompanyWorkspace.livingDeliverables` — one flat, append-only log across all kinds. */
export interface LivingDeliverablesState {
  versions: LivingDeliverableVersion[];
}

export interface LivingDeliverableOverview {
  kind: LivingDeliverableKind;
  latest: LivingDeliverableVersion | null;
  updateAvailable: boolean;
  history: LivingDeliverableVersion[];
}
