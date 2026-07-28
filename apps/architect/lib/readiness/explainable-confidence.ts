/**
 * Consultant Readiness Engine — Explainable Confidence.
 *
 * Replaces a bare confidence percentage with the breakdown a senior
 * consultant gives when asked "why 81%, and not 95%?": one line per business
 * category, in the same words the rest of the Readiness Engine already
 * uses, each with its evidence and a concrete way to raise it.
 *
 * No parallel scoring brain. `overall` is never recomputed here — it is the
 * exact number `computeDiscoveryScore` already publishes as Business
 * Understanding (`EvidenceSnapshot.overallUnderstanding`), and every "core"
 * category score is the exact `DimensionStatus.confidence` that number is
 * already the plain average of. This module only explains that arithmetic
 * back to the client, category by category, and reuses the Missing
 * Information Engine's ranked opportunities for "how to raise it" instead of
 * inventing new advice.
 *
 * A handful of categories a CEO also asks about — Documentation, Automation
 * Readiness, Data Quality, Operational Coverage, AI Readiness — are not
 * discovery dimensions, so they are shown as supplementary signals: real
 * numbers already produced by the Maturity Model, the Business Health
 * gauges and Knowledge coverage (never fabricated), clearly marked as *not*
 * counted into `overall` — no double-counting, no second average — and
 * shown as "not enough information yet" instead of a number whenever the
 * originating engine's own confidence for that dimension is too thin to
 * report honestly (the same `THIN_CONFIDENCE` bar `evaluate.ts` already
 * uses everywhere else).
 */

import { understandingLevel, understandingSentence } from "@/lib/presentation";
import type {
  CompanyWorkspace,
  ConsultingIntelligence,
  ConversationMemory,
  KnowledgeCoverageSlice,
  MaturityDimension,
} from "@/types";
import { evaluateReadiness, THIN_CONFIDENCE } from "./evaluate";
import {
  buildMissingInformationReport,
  type MissingInformationReport,
} from "./missing-information";
import { snapshotFromMemory, snapshotFromWorkspace } from "./snapshot";
import { DIMENSION_TO_AREA } from "./topics";
import type { EvidenceSnapshot, ReadinessAssessment } from "./types";

export type ConfidenceCategoryKind = "core" | "supplementary";

export interface ConfidenceCategory {
  id: string;
  kind: ConfidenceCategoryKind;
  /**
   * Client-facing business name — Spanish, engine-owned, never routed
   * through i18n (same rule as every other Readiness Engine string: the
   * engine owns the words, the UI chrome around it goes through
   * `useTranslations()`).
   */
  label: string;
  /** 0–100, or null when there truly is not enough evidence to report a number honestly. */
  score: number | null;
  /**
   * Equal share of `overall` this category represents, among the applicable
   * core categories — never a hidden re-weighting; `overall` is literally
   * their average. `null` for supplementary categories: shown for context,
   * they never move `overall`.
   */
  weightPercent: number | null;
  /** Why the score is what it is — one consulting-register sentence. */
  why: string;
  /**
   * Concrete, evidence-linked ways to raise this category. Reuses the
   * Missing Information Engine's ranked opportunity for the same topic
   * whenever one exists, instead of inventing new advice.
   */
  howToRaise: string[];
  /** Concrete documents to request, when one can plausibly close the gap. */
  uploadSuggestions: string[];
  uploadable: boolean;
  /** True when `score` is null because the evidence is genuinely too thin — never a fabricated number. */
  insufficientEvidence: boolean;
}

export interface ExplainableConfidenceReport {
  generatedAt: string;
  /** The exact Business Understanding / Discovery Score number shown everywhere else. Never recomputed here. */
  overall: number;
  overallLevel: string;
  overallSentence: string;
  /** Detective-register comparison of the strongest and weakest core category — reused verbatim from the Missing Information Engine. */
  headline: string;
  /** One entry per applicable discovery dimension — these average exactly to `overall`. */
  coreCategories: ConfidenceCategory[];
  /** Additional honest signals that do not count toward `overall`. */
  supplementaryCategories: ConfidenceCategory[];
}

function buildCoreCategories(
  snapshot: EvidenceSnapshot,
  assessment: ReadinessAssessment,
  missing: MissingInformationReport,
): ConfidenceCategory[] {
  const applicable = snapshot.dimensions.filter((d) => d.applicable !== false);
  const weightPercent =
    applicable.length > 0 ? Math.round((1 / applicable.length) * 100) : 0;

  return applicable.map((dimension) => {
    const topic =
      assessment.topics.find((item) => item.topic === dimension.id) ?? null;
    const opportunity =
      missing.opportunities.find((item) => item.topic === dimension.id) ??
      null;

    const howToRaise: string[] = [];
    if (opportunity) {
      howToRaise.push(opportunity.headline);
    } else if (topic && topic.state !== "ready") {
      howToRaise.push(
        `Sigamos conversando sobre ${dimension.label.toLowerCase()} en la próxima sesión — cada respuesta cierra un vacío concreto.`,
      );
    }

    return {
      id: dimension.id,
      kind: "core" as const,
      label: dimension.label,
      score: dimension.confidence,
      weightPercent,
      why:
        topic?.headline ?? `Todavía no hay lectura sobre ${dimension.label.toLowerCase()}.`,
      howToRaise,
      uploadSuggestions: opportunity?.uploadSuggestions ?? [],
      uploadable: opportunity?.uploadable ?? DIMENSION_TO_AREA[dimension.id] != null,
      insufficientEvidence: false,
    };
  });
}

function insufficientCategory(
  id: string,
  label: string,
  reason: string,
): ConfidenceCategory {
  return {
    id,
    kind: "supplementary",
    label,
    score: null,
    weightPercent: null,
    why: "Todavía no hay suficiente evidencia para calificar esta área con honestidad.",
    howToRaise: [reason],
    uploadSuggestions: [],
    uploadable: false,
    insufficientEvidence: true,
  };
}

function buildMaturitySupplement(
  consulting: ConsultingIntelligence | null,
  dimensionId: MaturityDimension,
  label: string,
  howToRaiseWhenKnown: string[],
  fallbackReason: string,
): ConfidenceCategory {
  const dimension =
    consulting?.maturity.dimensions.find((item) => item.id === dimensionId) ??
    null;

  if (!dimension || dimension.confidence < THIN_CONFIDENCE) {
    return insufficientCategory(dimensionId, label, fallbackReason);
  }

  return {
    id: dimensionId,
    kind: "supplementary",
    label,
    score: dimension.score,
    weightPercent: null,
    why:
      dimension.evidence[0] ??
      `Lectura derivada de las señales del descubrimiento sobre ${label.toLowerCase()}.`,
    howToRaise: howToRaiseWhenKnown,
    uploadSuggestions: [],
    uploadable: false,
    insufficientEvidence: false,
  };
}

/**
 * AI Readiness — the Business Health gauge already computes this as a
 * function of Data quality, Automation and Documentation
 * (`lib/consulting/health.ts`). "How to raise it" is therefore not a new
 * heuristic: it is literally the same three signals shown elsewhere in this
 * report, named honestly instead of hidden behind a single number.
 */
function buildAiReadiness(
  consulting: ConsultingIntelligence | null,
): ConfidenceCategory {
  const gauge =
    consulting?.health.gauges.find((item) => item.id === "ai_readiness") ??
    null;

  if (!gauge || gauge.confidence < THIN_CONFIDENCE) {
    return insufficientCategory(
      "ai_readiness",
      "Preparación para IA",
      "Todavía no hay suficiente evidencia sobre datos, automatización y documentación para calificar la preparación para IA — aparecerá en cuanto el descubrimiento avance en esas tres áreas.",
    );
  }

  return {
    id: "ai_readiness",
    kind: "supplementary",
    label: "Preparación para IA",
    score: gauge.score,
    weightPercent: null,
    why:
      gauge.evidence[0] ??
      "Depende de la calidad de datos, la automatización y la documentación ya evaluadas en este reporte.",
    howToRaise: [
      "Esta lectura depende de tres señales de este mismo reporte — Calidad de datos, Automatización y Documentación — mejorarlas ahí eleva la preparación para IA.",
    ],
    uploadSuggestions: [],
    uploadable: false,
    insufficientEvidence: false,
  };
}

/**
 * Operational Coverage — how much of what we know about operations is
 * backed by an actual document, as opposed to something said in an
 * interview (the "Business Processes" / `operations` core category above).
 * Same Knowledge coverage slice the Readiness Engine already reads for
 * document-vs-interview consistency; the "how to raise" line reuses the
 * Missing Information Engine's own upload suggestion for `operations`
 * rather than inventing a second one.
 */
function buildOperationalCoverage(
  coverage: KnowledgeCoverageSlice[] | null,
  missing: MissingInformationReport,
): ConfidenceCategory {
  if (!coverage) {
    return insufficientCategory(
      "operational_coverage",
      "Cobertura documental de operaciones",
      "Todavía no hay un expediente de documentos para medir esta cobertura.",
    );
  }

  const slice = coverage.find((item) => item.area === "Operations") ?? null;
  const opportunity =
    missing.opportunities.find((item) => item.topic === "operations") ?? null;
  const uploadSuggestions = opportunity?.uploadSuggestions ?? [];

  return {
    id: "operational_coverage",
    kind: "supplementary",
    label: "Cobertura documental de operaciones",
    score: slice?.percent ?? 0,
    weightPercent: null,
    why: slice?.note ?? "Aún no hay evidencia importada.",
    howToRaise:
      uploadSuggestions.length > 0
        ? [`Sube ${uploadSuggestions.join(" o ")} para ampliar esta cobertura.`]
        : [
            "Cargar documentos operativos (SOPs, mapas de proceso, políticas) ampliaría esta cobertura.",
          ],
    uploadSuggestions,
    uploadable: true,
    insufficientEvidence: false,
  };
}

function buildSupplementaryCategories(
  consulting: ConsultingIntelligence | null,
  coverage: KnowledgeCoverageSlice[] | null,
  missing: MissingInformationReport,
): ConfidenceCategory[] {
  return [
    buildMaturitySupplement(
      consulting,
      "documentation",
      "Documentación",
      [
        "Sube manuales, políticas o SOPs (organigrama, política de aprobación de compras, procedimientos operativos) para que quede documentado, no solo dicho.",
      ],
      "Todavía no hay suficiente evidencia sobre manuales, políticas o SOPs para calificar la documentación.",
    ),
    buildMaturitySupplement(
      consulting,
      "automation",
      "Automatización",
      [
        "Cuéntanos qué tareas repetitivas se hacen hoy a mano (captura de pedidos, aprobaciones, reportes) — ahí están los candidatos a automatizar.",
      ],
      "Todavía no hay suficiente evidencia sobre tareas manuales o automatizadas para calificar esta área.",
    ),
    buildMaturitySupplement(
      consulting,
      "data",
      "Calidad de datos",
      [
        "Cuéntanos dónde vive la información maestra (clientes, inventario, finanzas) y si hay una sola fuente o varias copias en Excel.",
      ],
      "Todavía no hay suficiente evidencia sobre dónde vive la información del negocio para calificar su calidad.",
    ),
    buildOperationalCoverage(coverage, missing),
    buildAiReadiness(consulting),
  ];
}

/**
 * Compose the full report from pieces the rest of `lib/readiness/` already
 * produced. Pure and cheap — nothing here recomputes coverage, confidence or
 * topic state.
 */
export function buildExplainableConfidenceReport(
  snapshot: EvidenceSnapshot,
  assessment: ReadinessAssessment,
  missing: MissingInformationReport,
  consulting: ConsultingIntelligence | null,
  coverage: KnowledgeCoverageSlice[] | null,
): ExplainableConfidenceReport {
  const overall = snapshot.overallUnderstanding;

  return {
    generatedAt: snapshot.capturedAt,
    overall,
    overallLevel: understandingLevel(overall),
    overallSentence: understandingSentence(overall),
    headline: missing.headline,
    coreCategories: buildCoreCategories(snapshot, assessment, missing),
    supplementaryCategories: buildSupplementaryCategories(
      consulting,
      coverage,
      missing,
    ),
  };
}

/** Explainable Confidence for a company workspace — the entry point every screen uses. */
export function assessExplainableConfidence(
  workspace: CompanyWorkspace,
): ExplainableConfidenceReport {
  const snapshot = snapshotFromWorkspace(workspace);
  const assessment = evaluateReadiness(snapshot);
  const missing = buildMissingInformationReport(snapshot, assessment, workspace.industry);
  return buildExplainableConfidenceReport(
    snapshot,
    assessment,
    missing,
    workspace.conversationMemory?.consulting ?? null,
    workspace.knowledge?.coverage ?? null,
  );
}

/**
 * Explainable Confidence during a live interview / standalone report, where
 * only working memory exists — no `knowledge` coverage collector yet, so
 * Operational Coverage is reported as not-enough-evidence rather than
 * pointed at a source this path does not have.
 */
export function assessMemoryExplainableConfidence(
  memory: ConversationMemory,
): ExplainableConfidenceReport {
  const snapshot = snapshotFromMemory(memory);
  const assessment = evaluateReadiness(snapshot);
  const missing = buildMissingInformationReport(snapshot, assessment, memory.summary.industry);
  return buildExplainableConfidenceReport(
    snapshot,
    assessment,
    missing,
    memory.consulting ?? null,
    null,
  );
}
