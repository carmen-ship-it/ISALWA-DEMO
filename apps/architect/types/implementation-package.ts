/**
 * Implementation Package — Mission 18 domain contracts.
 * Gate + orchestration only. Points at existing engine artifacts.
 * No code generation. No LLM. No Cursor prompt expansion.
 */

export type ImplementationPackageStatus = "ready" | "not_ready";

export type ImplementationSectionId =
  | "business_blueprint"
  | "solution_architecture"
  | "modules"
  | "database_model"
  | "permissions"
  | "process_maps"
  | "navigation"
  | "api_contracts"
  | "sprint_roadmap"
  | "implementation_phases"
  | "technical_risks"
  | "cursor_context"
  | "developer_handoff";

export type ImplementationSourceEngine =
  | "blueprint"
  | "solution"
  | "processes"
  | "deliverables"
  | "consulting"
  | "knowledge";

/** Pointer into an existing engine artifact — never regenerated content. */
export interface ImplementationArtifactRef {
  engine: ImplementationSourceEngine;
  /** Stable id when the engine provides one; otherwise a field/kind key. */
  id: string;
  label: string;
  /** Optional deliverable kind or model field path for navigation. */
  path?: string;
}

export interface ImplementationSectionRef {
  id: ImplementationSectionId;
  title: string;
  summary: string;
  sourceEngine: ImplementationSourceEngine;
  available: boolean;
  artifacts: ImplementationArtifactRef[];
}

export interface ImplementationPackageGate {
  status: ImplementationPackageStatus;
  /** Same numeric bar as discovery conclusion (`CONCLUSION_THRESHOLD`). */
  threshold: number;
  businessUnderstanding: number;
  thresholdMet: boolean;
  /** True only when threshold is met and required engines are present. */
  ready: boolean;
  missingPrerequisites: string[];
  notes: string[];
}

/**
 * Assembled handoff package — architecture references only.
 * Produced when business understanding clears the conclusion threshold.
 */
export interface ImplementationPackage {
  id: string;
  workspaceId: string;
  companyName: string;
  generatedAt: string;
  gate: ImplementationPackageGate;
  blueprintId: string | null;
  blueprintVersion: number | null;
  solutionId: string | null;
  processModelId: string | null;
  deliverablesId: string | null;
  summary: string;
  sections: ImplementationSectionRef[];
  /** Composite confidence from referenced engines (0–1). */
  overallConfidence: number;
}
