/**
 * Consultant Readiness Engine — the Missing Information Engine.
 *
 * A different framing of the same question the Readiness Engine already
 * answers. Where `evaluate.ts` says *where do we stand per topic*, this file
 * says *what, concretely, would move us the most* — ranked by an honest,
 * traceable estimate of business impact, never a generic "upload more
 * documents" nudge.
 *
 * Detective framing: we already understand some areas of the business well
 * and know almost nothing about others. This module names the gap and, when
 * a document can plausibly close it, names the document — "sube el
 * organigrama", not "mejora tu perfil". It never invents a confidence figure:
 * every estimated lift is derived from the *same* increment
 * `computeDiscoveryScore` already uses for one piece of evidence
 * (`EVIDENCE_FACT_INCREMENT`), spread over the same applicable-dimension
 * average that produces the published Business Understanding number. If a
 * gap has no such lift to justify, it is not listed.
 *
 * Nothing here recomputes coverage, confidence or state — it reads the
 * `EvidenceSnapshot` and `ReadinessAssessment` other files in this module
 * already produced and re-ranks the same gaps by estimated impact.
 */

import { EVIDENCE_FACT_INCREMENT } from "@/lib/reasoning/confidence/score";
import type { CompanyWorkspace, DimensionStatus } from "@/types";
import { evaluateReadiness, READY_CONFIDENCE, THIN_CONFIDENCE } from "./evaluate";
import { snapshotFromWorkspace } from "./snapshot";
import {
  DIMENSION_TO_AREA,
  TOPIC_STAKES,
  missingInformationLabel,
  missingInformationUploadHint,
} from "./topics";
import type {
  EvidenceSnapshot,
  ReadinessAssessment,
  ReadinessTopicId,
} from "./types";

/** Most opportunities shown before the list reads as a wall of asks. */
const MAX_OPPORTUNITIES = 5;
/** Most concrete gaps quoted per topic — matches `evaluate.ts`'s own cap. */
const MAX_GAPS_PER_TOPIC = 2;

export interface MissingInformationOpportunity {
  id: string;
  topic: ReadinessTopicId;
  /** "Finanzas", "Equipo"… reused from the Discovery Score labels. */
  topicLabel: string;
  /** Concrete gaps this opportunity would close, e.g. "cómo se aprueban las compras". */
  gaps: string[];
  /** What to bring, when a document can plausibly close the gap — never generic. */
  uploadSuggestions: string[];
  /** True once a real upload channel exists for this topic (Knowledge coverage area). */
  uploadable: boolean;
  /**
   * Estimated confidence lift, in points added to overall Business
   * Understanding — an honest heuristic, not a model output. Derived from
   * `EVIDENCE_FACT_INCREMENT` (one piece of evidence's worth, capped by the
   * dimension's real headroom) divided across every applicable dimension,
   * the same average `computeDiscoveryScore` publishes today.
   */
  estimatedLiftPercent: number;
  /** Why this topic matters for the advice we are preparing. */
  rationale: string;
  /** One line, detective register: "+9% de confianza en finanzas si subes…". */
  headline: string;
}

export interface MissingInformationReport {
  generatedAt: string;
  /** Ranked by estimated business impact, highest first. */
  opportunities: MissingInformationOpportunity[];
  /** The topic we can already speak to with the most confidence. */
  strongestTopic: { topic: ReadinessTopicId; label: string } | null;
  /** The topic we know the least about today. */
  weakestTopic: { topic: ReadinessTopicId; label: string } | null;
  /** Detective-register summary: what we know well vs. what we barely know. */
  headline: string;
  /** Sum of every listed opportunity's estimated lift — a ceiling, not a promise. */
  totalEstimatedLiftPercent: number;
}

function applicableDimensions(dimensions: DimensionStatus[]): DimensionStatus[] {
  return dimensions.filter((dimension) => dimension.applicable !== false);
}

/**
 * The confidence points one more piece of evidence would be worth to this
 * dimension, spread across the applicable-dimension average. Capped by the
 * dimension's real headroom — a dimension already near 100 has little left
 * to gain, and this says so honestly instead of promising a flat number.
 */
function estimateLiftPercent(
  dimension: DimensionStatus,
  applicableCount: number,
): number {
  if (applicableCount <= 0) return 0;
  const headroom = Math.max(0, 100 - dimension.confidence);
  const perEvidenceGain = Math.min(EVIDENCE_FACT_INCREMENT, headroom);
  if (perEvidenceGain <= 0) return 0;
  return Math.max(1, Math.round(perEvidenceGain / applicableCount));
}

function topicLower(label: string): string {
  return label.toLowerCase();
}

function buildOpportunity(
  dimension: DimensionStatus,
  gapKeys: string[],
  liftPercent: number,
): MissingInformationOpportunity | null {
  const topic = dimension.id;
  const gaps = gapKeys
    .map(missingInformationLabel)
    .filter((label): label is string => label !== null)
    .slice(0, MAX_GAPS_PER_TOPIC);

  if (gaps.length === 0) return null;

  const area = DIMENSION_TO_AREA[topic] ?? null;
  const uploadable = area != null;
  const uploadSuggestions = uploadable
    ? Array.from(
        new Set(
          gapKeys
            .map(missingInformationUploadHint)
            .filter((hint): hint is string => hint !== null),
        ),
      ).slice(0, MAX_GAPS_PER_TOPIC)
    : [];

  const headline =
    uploadable && uploadSuggestions.length > 0
      ? `+${liftPercent}% de confianza en ${topicLower(dimension.label)} si subes ${uploadSuggestions[0]}.`
      : `+${liftPercent}% de confianza en ${topicLower(dimension.label)} si nos cuentas ${gaps[0]} en la próxima conversación.`;

  return {
    id: `missing_${topic}`,
    topic,
    topicLabel: dimension.label,
    gaps,
    uploadSuggestions,
    uploadable,
    estimatedLiftPercent: liftPercent,
    rationale: TOPIC_STAKES[topic],
    headline,
  };
}

/**
 * Rank every open topic by estimated business impact. A topic already
 * `ready` has nothing left to rank — the client is told that elsewhere, not
 * chased for one more upload it does not need.
 */
export function rankMissingInformation(
  snapshot: EvidenceSnapshot,
  assessment: ReadinessAssessment,
): MissingInformationOpportunity[] {
  const applicable = applicableDimensions(snapshot.dimensions);
  const readyTopics = new Set(
    assessment.topics
      .filter((topic) => topic.state === "ready")
      .map((topic) => topic.topic),
  );

  const opportunities = applicable
    .filter((dimension) => !readyTopics.has(dimension.id))
    .map((dimension) => {
      const liftPercent = estimateLiftPercent(dimension, applicable.length);
      if (liftPercent <= 0) return null;
      const gapKeys = snapshot.missingEvidenceKeys[dimension.id] ?? [];
      return buildOpportunity(dimension, gapKeys, liftPercent);
    })
    .filter((item): item is MissingInformationOpportunity => item !== null);

  return opportunities
    .sort((a, b) => b.estimatedLiftPercent - a.estimatedLiftPercent)
    .slice(0, MAX_OPPORTUNITIES);
}

function understandingWord(confidence: number): "well" | "growing" | "thin" {
  if (confidence >= READY_CONFIDENCE) return "well";
  if (confidence >= THIN_CONFIDENCE) return "growing";
  return "thin";
}

/**
 * The detective-register summary: which area we can already speak to with
 * confidence, and which one we barely know anything about. Only compares
 * applicable topics — an area marked not applicable to this business was
 * never a gap.
 */
function buildHeadline(
  applicable: DimensionStatus[],
  strongest: DimensionStatus | null,
  weakest: DimensionStatus | null,
): string {
  if (applicable.length === 0) {
    return "Todavía no hay suficiente evidencia para comparar áreas del negocio.";
  }

  if (!strongest || !weakest || strongest.id === weakest.id) {
    const only = strongest ?? weakest;
    if (!only) return "Todavía no hay suficiente evidencia para comparar áreas del negocio.";
    return understandingWord(only.confidence) === "well"
      ? `Entendemos bien ${topicLower(only.label)}.`
      : `Todavía sabemos poco de ${topicLower(only.label)}.`;
  }

  const strongWord = understandingWord(strongest.confidence);
  const weakWord = understandingWord(weakest.confidence);

  const strongLine =
    strongWord === "well"
      ? `Entendemos bien ${topicLower(strongest.label)}`
      : `Vamos entendiendo ${topicLower(strongest.label)}`;

  const weakLine =
    weakWord === "thin"
      ? `casi no sabemos nada de ${topicLower(weakest.label)}.`
      : `todavía nos falta profundizar en ${topicLower(weakest.label)}.`;

  return `${strongLine} — ${weakLine}`;
}

/**
 * Build the full report from an already-computed snapshot and assessment.
 * Cheap and pure — every input was produced elsewhere in this module.
 */
export function buildMissingInformationReport(
  snapshot: EvidenceSnapshot,
  assessment: ReadinessAssessment,
): MissingInformationReport {
  const applicable = applicableDimensions(snapshot.dimensions);
  const ranked = [...applicable].sort((a, b) => b.confidence - a.confidence);
  const strongest = ranked[0] ?? null;
  const weakest = ranked[ranked.length - 1] ?? null;

  const opportunities = rankMissingInformation(snapshot, assessment);

  return {
    generatedAt: snapshot.capturedAt,
    opportunities,
    strongestTopic: strongest
      ? { topic: strongest.id, label: strongest.label }
      : null,
    weakestTopic: weakest ? { topic: weakest.id, label: weakest.label } : null,
    headline: buildHeadline(applicable, strongest, weakest),
    totalEstimatedLiftPercent: opportunities.reduce(
      (sum, item) => sum + item.estimatedLiftPercent,
      0,
    ),
  };
}

/** Missing Information report for a company workspace — the entry point every screen uses. */
export function assessMissingInformation(
  workspace: CompanyWorkspace,
): MissingInformationReport {
  const snapshot = snapshotFromWorkspace(workspace);
  return buildMissingInformationReport(snapshot, evaluateReadiness(snapshot));
}
