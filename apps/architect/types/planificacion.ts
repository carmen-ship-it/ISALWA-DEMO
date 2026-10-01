/**
 * Planificación ISALWA — implementation planning state.
 *
 * v2 derives business content from Architect discovery; persisted state holds
 * client responses and approvals. v1 remains readable for legacy UI until
 * Increment 4 migrates the panel.
 */

export type PlanificacionItemStatus =
  | "completado"
  | "en_progreso"
  | "pendiente"
  | "bloqueado"
  | "decision_isalwa"
  | "fase_futura";

export type PlanificacionDataReqStatus =
  | "pendiente"
  | "recibido"
  | "en_revision"
  | "aprobado";

export type PlanificacionDecisionStatus =
  | "pendiente"
  | "respondido"
  | "aprobado"
  | "rechazado"
  | "revisar_mas_adelante";

export type PlanificacionEffortBand =
  | "pequeno"
  | "medio"
  | "alto"
  | "requiere_validacion"
  | "dependiente_terceros";

/** Governance status for derived and persisted plan items (v2). */
export type PlanificacionGovernanceStatus =
  | "propuesta"
  | "requiere_confirmacion"
  | "decision_isalwa"
  | "en_revision"
  | "aprobado"
  | "rechazado";

export type PlanificacionItemKind =
  | "understanding"
  | "recommendation"
  | "capability"
  | "information_gap"
  | "client_decision"
  | "technical_requirement";

export type PlanificacionSourceEngine =
  | "blueprint"
  | "company_model"
  | "processes"
  | "solution"
  | "deliverables"
  | "recommendations"
  | "consulting"
  | "readiness"
  | "implementation_package"
  | "living_deliverables"
  | "knowledge"
  | "timeline"
  | "workspace"
  | "demo_prototype";

export type PlanificacionClientAction =
  | "confirmar"
  | "corregir"
  | "comentar"
  | "rechazar"
  | "aprobar";

export type PlanificacionQuestionStatus =
  | "pendiente"
  | "respondido"
  | "aprobado"
  | "rechazado"
  | "revisar_mas_adelante";

export type PlanificacionItemPriority = "now" | "next" | "later";

export interface PlanificacionEvidenceRef {
  sourceEngine: PlanificacionSourceEngine;
  sourceId?: string;
  quote: string;
  confidence?: number;
}

export interface PlanificacionClientResponse {
  action: PlanificacionClientAction;
  text: string;
  actor: string;
  at: string;
}

export interface PlanificacionApproval {
  actor: string;
  at: string;
  snapshotVersion: number;
  snapshotId?: string;
}

export interface PlanificacionPlanItem {
  id: string;
  stableKey: string;
  kind: PlanificacionItemKind;
  title: string;
  body: string;
  recommendation?: string;
  rationale?: string;
  evidenceRefs: PlanificacionEvidenceRef[];
  governanceStatus: PlanificacionGovernanceStatus;
  /** Commercial demo screen/module — prototype reference only, never approved behavior. */
  demoPrototypeRef?: string;
  sourceEngines: PlanificacionSourceEngine[];
  derivedAt: string;
  derivationVersion: number;
  clientResponse?: PlanificacionClientResponse;
  approval?: PlanificacionApproval;
  priority?: PlanificacionItemPriority;
  dependencies?: string[];
  osModuleHint?: string;
}

export interface PlanificacionClientQuestion {
  id: string;
  stableKey: string;
  linkedItemId?: string;
  question: string;
  ourUnderstanding: string;
  whyItMatters: string;
  recommendation?: string;
  options?: string[];
  status: PlanificacionQuestionStatus;
  response?: string;
  actor?: string;
  respondedAt?: string;
  derivedAt: string;
  derivationVersion: number;
}

export interface PlanificacionDataRequirement {
  id: string;
  title: string;
  description: string;
  status: PlanificacionDataReqStatus;
  /** When marked received / approved */
  updatedAt?: string;
  notes?: string;
}

export interface PlanificacionDecision {
  id: string;
  question: string;
  why: string;
  options: string[];
  recommendation: string;
  response: string | null;
  status: PlanificacionDecisionStatus;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlanificacionChangeEntry {
  id: string;
  at: string;
  change: string;
  reason: string;
  approvedBy: string;
  impact: string;
}

export interface PlanificacionPreservedProcedure {
  id: string;
  title: string;
  source: "uploaded" | "client_statement";
  assetId?: string;
  notes: string;
  mustPreserve: boolean;
}

/** Legacy persisted state — still used by Planificación panel until UI increment. */
export interface IsalwaPlanificacionStateV1 {
  version: 1;
  initializedAt: string;
  lastUpdatedAt: string;
  dataRequirements: PlanificacionDataRequirement[];
  decisions: PlanificacionDecision[];
  changeLog: PlanificacionChangeEntry[];
  preservedProcedures: PlanificacionPreservedProcedure[];
}

/** Derive-first persisted state with client governance. */
export interface IsalwaPlanificacionStateV2 {
  version: 2;
  initializedAt: string;
  lastUpdatedAt: string;
  items: PlanificacionPlanItem[];
  questions: PlanificacionClientQuestion[];
  changeLog: PlanificacionChangeEntry[];
  preservedProcedures: PlanificacionPreservedProcedure[];
  /** Algorithm version for mergeDerivedWithPersisted — not a business version. */
  derivationVersion: number;
}

export type IsalwaPlanificacionState =
  | IsalwaPlanificacionStateV1
  | IsalwaPlanificacionStateV2;

export function isPlanificacionStateV1(
  state: IsalwaPlanificacionState,
): state is IsalwaPlanificacionStateV1 {
  return state.version === 1;
}

export function isPlanificacionStateV2(
  state: IsalwaPlanificacionState,
): state is IsalwaPlanificacionStateV2 {
  return state.version === 2;
}

/** Derived phase row — not persisted independently; sourced from solution/deliverables. */
export interface PlanificacionDerivedPhase {
  id: string;
  stableKey: string;
  phase: number;
  name: string;
  summary: string;
  goals: string[];
  modules: string[];
  dependencies: string[];
  confidence: number;
  sourceEngines: PlanificacionSourceEngine[];
}

/** In-memory view model row — includes Architect proposal separate from merged display state. */
export interface PlanificacionViewModelItem extends PlanificacionPlanItem {
  architectProposal: {
    title: string;
    body: string;
    recommendation?: string;
    rationale?: string;
  };
}

/** In-memory view model from derive + merge — handoff-ready shape. */
export interface PlanificacionViewModel {
  derivationVersion: number;
  derivedAt: string;
  overallHeadline: string;
  understandingMaturityPct: number;
  discoveryInProgress: boolean;
  items: PlanificacionViewModelItem[];
  questions: PlanificacionClientQuestion[];
  phases: PlanificacionDerivedPhase[];
  preservedProcedures: PlanificacionPreservedProcedure[];
  byKind: Record<PlanificacionItemKind, PlanificacionViewModelItem[]>;
  changeLog: PlanificacionChangeEntry[];
}
