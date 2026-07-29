/**
 * Consultant Readiness Engine — contracts.
 *
 * One question drives everything here: *does ISALWA know enough to advise
 * this company with confidence?* The engine answers it per business topic,
 * in the language a senior consultant would use with a client — never in the
 * language of a model.
 *
 * Nothing in this module scores anything on its own. Every number it reads
 * was already produced by an existing engine (Discovery Score, Knowledge
 * coverage, consulting intelligence); readiness only *classifies* those
 * numbers into three states a human can act on and explains, concretely,
 * what is still missing.
 */

import type {
  DimensionStatus,
  DiscoveryDimension,
  KnowledgeCoverageSlice,
} from "@/types";

/**
 * A readiness topic is a business area, and it maps 1:1 onto the discovery
 * dimensions the rest of the platform already reasons about. No parallel
 * taxonomy.
 */
export type ReadinessTopicId = DiscoveryDimension;

/**
 * 🟢 ready — enough evidence to recommend.
 * 🟡 almost_ready — a few clarifications away.
 * 🔴 needs_information — concrete information is missing.
 */
export type ReadinessState = "ready" | "almost_ready" | "needs_information";

/** What the interview should do with this topic next. */
export type ReadinessInterviewAction = "skip" | "confirm" | "ask";

/**
 * How well the sources agree with each other. "confirmada" means documents
 * back up what the interview said; "con diferencias" is a soft flag, never
 * an accusation.
 */
export type ReadinessConsistency = "confirmada" | "por_confirmar" | "con_diferencias";

/**
 * Where a piece of evidence came from. New sources (uploads, e-mail
 * archives, CRM/ERP exports) plug in here — see `snapshot.ts`.
 */
export type EvidenceSourceKind =
  | "interview"
  | "document"
  | "imported_record"
  | "business_rule"
  | "meeting"
  | "history";

/**
 * One normalized piece of evidence. `strength` is copied from whichever
 * engine already computed it (fact confidence, asset confidence, coverage
 * percent) — the Readiness Engine never invents or re-weights it.
 */
export interface EvidenceSignal {
  id: string;
  topic: ReadinessTopicId | null;
  source: EvidenceSourceKind;
  /** Client-facing Spanish label, e.g. "Entrevista" or "Documentos". */
  sourceLabel: string;
  statement: string;
  /** 0–100, as reported by the originating engine. */
  strength: number;
  capturedAt: string | null;
}

/** A disagreement between sources, phrased as something to clarify. */
export interface ReadinessConflict {
  id: string;
  topic: ReadinessTopicId | null;
  /** Soft clarification language — never accusatory. */
  statement: string;
  sourceLabels: string[];
}

/** Counts of what the file actually contains today. */
export interface EvidenceInventory {
  interviewFacts: number;
  documents: number;
  importedRecords: number;
  /** All `Meeting` records, any kind — discovery sessions and transcript ingestion alike. Never render this as "reuniones"; see `discoverySessions`. */
  meetings: number;
  /** Real human discovery sessions only — never internal transcript/document ingestion events. The honest number for "N reuniones"/"N sesiones" client copy. */
  discoverySessions: number;
  businessRules: number;
  revisions: number;
}

/**
 * The single boundary every evidence source crosses before the Readiness
 * Engine sees it. Today it is filled from Memory, Knowledge, the Intake
 * evidence log, History and the workspace itself; tomorrow a new collector
 * can add uploads, e-mails or CRM records without touching the evaluation
 * logic below it.
 */
export interface EvidenceSnapshot {
  workspaceId: string;
  capturedAt: string;
  /** Discovery Score dimensions, verbatim. Never recomputed here. */
  dimensions: DimensionStatus[];
  /** Knowledge Engine coverage slices, verbatim. Never recomputed here. */
  coverage: KnowledgeCoverageSlice[];
  signals: EvidenceSignal[];
  conflicts: ReadinessConflict[];
  /** Evidence fact keys still absent, per topic (see DIMENSION_EVIDENCE_KEYS). */
  missingEvidenceKeys: Record<ReadinessTopicId, string[]>;
  inventory: EvidenceInventory;
  /** Business understanding as already published by the workspace / score. */
  overallUnderstanding: number;
}

export interface TopicReadiness {
  topic: ReadinessTopicId;
  /** "Ventas", "Finanzas"… reused from the Discovery Score labels. */
  label: string;
  state: ReadinessState;
  /** Client-facing state name, e.g. "Casi listo". */
  stateLabel: string;
  /** One sentence a consultant could say out loud. */
  headline: string;
  /** Concrete gaps: "cómo se aprueban las compras". Never "poca confianza". */
  missingInformation: string[];
  /** Soft asks when two sources disagree. */
  clarifications: string[];
  /** Which sources back this topic today, in client language. */
  backedBy: string[];
  consistency: ReadinessConsistency;
  /** Minutes to close the gap. `null` once the topic is ready. */
  estimatedMinutes: number | null;
  interviewAction: ReadinessInterviewAction;
  applicable: boolean;
}

/** One line of the "Qué seguimos aprendiendo" list. */
export interface ReadinessLearningItem {
  id: string;
  topic: ReadinessTopicId;
  label: string;
  state: ReadinessState;
  /** "Necesitamos entender cómo se aprueban las compras." */
  question: string;
  /** Why it matters for the advice we are about to give. */
  why: string;
  estimatedMinutes: number | null;
}

/** Ask more, or stop and advise. */
export interface ReadinessAdvice {
  action: "ask" | "stop";
  canAdvise: boolean;
  headline: string;
  detail: string;
  nextStep: string;
}

/** Gate shown before a deliverable that depends on knowing enough. */
export interface ReadinessGate {
  state: ReadinessState;
  stateLabel: string;
  title: string;
  message: string;
  ctaLabel: string;
  estimatedMinutes: number | null;
  missingInformation: string[];
  /** True when the deliverable can be presented as a firm recommendation. */
  unlocked: boolean;
}

/**
 * Evidence transparency for a single recommendation — what it stands on,
 * how strong that footing is, and what to ask for when it is thin.
 */
export interface RecommendationEvidenceBasis {
  /** "Sólida" · "Buena" · "Parcial" · "Inicial" — reuses the shared bands. */
  strengthLabel: string;
  /** "3 entrevistas · 2 documentos · patrones del sector". */
  basis: string[];
  /** Populated only when the evidence is too thin to stand alone. */
  askForMore: string | null;
}

/**
 * Legacy shape kept so the evidence→memory bridge (Mission 2) and its
 * callers keep working unchanged.
 */
export interface ReadinessSignal {
  dimension: DiscoveryDimension;
  area: KnowledgeCoverageSlice["area"];
  coveragePercent: number;
  skipRecommended: boolean;
  reason: string;
  evidenceAssetIds: string[];
}

export interface ReadinessAssessment {
  workspaceId: string;
  generatedAt: string;
  topics: TopicReadiness[];
  ready: TopicReadiness[];
  almostReady: TopicReadiness[];
  needsInformation: TopicReadiness[];
  overallState: ReadinessState;
  overallStateLabel: string;
  /** Business Understanding narrative, aligned with the shared score copy. */
  narrative: string;
  stillLearning: ReadinessLearningItem[];
  advice: ReadinessAdvice;
  /** Minutes to move every open topic to ready. */
  totalEstimatedMinutes: number;
  inventory: EvidenceInventory;
  conflicts: ReadinessConflict[];
  /** Evidence-coverage signals — kept for the memory bridge. */
  signals: ReadinessSignal[];
  /** Topics with enough evidence that the interview can skip them. */
  skippableDimensions: DiscoveryDimension[];
}
