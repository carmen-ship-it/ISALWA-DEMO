/**
 * Consultant Readiness Engine — evaluation.
 *
 * Reads one `EvidenceSnapshot` and answers, per business topic:
 *
 *   · ¿Hay evidencia suficiente?      → dimension coverage already scored
 *   · ¿Las fuentes coinciden?          → documents vs. interview
 *   · ¿Hay algo que aclarar?           → contradictions already detected
 *   · ¿Preguntamos o ya podemos opinar? → ask / stop
 *
 * There is no scoring model in this file. It thresholds numbers other
 * engines produced and turns the result into consulting language.
 */

import { coverageAreaLabel, understandingSentence } from "@/lib/presentation";
import { CRITICAL_DIMENSIONS } from "@/lib/reasoning/confidence/score";
import { nowIso } from "@/lib/utils";
import type {
  CompanyWorkspace,
  DimensionStatus,
  DiscoveryDimension,
} from "@/types";
import { snapshotFromWorkspace } from "./snapshot";
import {
  DIMENSION_TO_AREA,
  MINUTES_PER_CLARIFICATION,
  TOPIC_PATTERNS,
  TOPIC_STAKES,
  missingInformationLabel,
  readinessStateLabel,
} from "./topics";
import type {
  EvidenceSnapshot,
  ReadinessAdvice,
  ReadinessAssessment,
  ReadinessConflict,
  ReadinessConsistency,
  ReadinessLearningItem,
  ReadinessSignal,
  ReadinessState,
  TopicReadiness,
} from "./types";

/**
 * Interview evidence at or above this is firm enough to recommend on.
 * Exported so the Missing Information Engine (`missing-information.ts`)
 * can describe a topic as "well understood" using the same bar this file
 * already uses to call it `ready` — one threshold, not two.
 */
export const READY_CONFIDENCE = 70;
/** Below this, the honest answer is "necesitamos más información". */
export const THIN_CONFIDENCE = 40;
/** Document coverage below this is noise — a single weak signal. */
const MIN_COVERAGE = 45;
/** Document coverage at or above this corroborates what the interview said. */
const CORROBORATING_COVERAGE = 75;
/** Most clarifications we will list for one topic before it reads as a wall. */
const MAX_LISTED_GAPS = 3;

function coveragePercentFor(
  snapshot: EvidenceSnapshot,
  topic: DiscoveryDimension,
): number | null {
  const area = DIMENSION_TO_AREA[topic];
  if (!area) return null;
  const slice = snapshot.coverage.find((item) => item.area === area);
  return slice ? slice.percent : null;
}

function conflictsFor(
  snapshot: EvidenceSnapshot,
  topic: DiscoveryDimension,
): ReadinessConflict[] {
  return snapshot.conflicts.filter(
    (conflict) =>
      conflict.topic === topic ||
      (conflict.topic === null && TOPIC_PATTERNS[topic].test(conflict.statement)),
  );
}

function backedByFor(
  snapshot: EvidenceSnapshot,
  topic: DiscoveryDimension,
  coveragePercent: number | null,
): string[] {
  const labels = new Set<string>();
  for (const signal of snapshot.signals) {
    if (signal.topic === topic) labels.add(signal.sourceLabel);
  }
  if (coveragePercent != null && coveragePercent >= MIN_COVERAGE) {
    const area = DIMENSION_TO_AREA[topic];
    if (area) labels.add(`Documentos de ${coverageAreaLabel(area)}`);
  }
  return Array.from(labels);
}

function missingInformationFor(
  snapshot: EvidenceSnapshot,
  topic: DiscoveryDimension,
): string[] {
  return (snapshot.missingEvidenceKeys[topic] ?? [])
    .map(missingInformationLabel)
    .filter((label): label is string => label !== null);
}

function resolveState(
  dimension: DimensionStatus,
  coveragePercent: number | null,
  hasConflict: boolean,
): ReadinessState {
  const confidence = dimension.confidence;
  const coverage = coveragePercent ?? 0;

  if (confidence < THIN_CONFIDENCE && coverage < MIN_COVERAGE) {
    return "needs_information";
  }

  const firm =
    (dimension.covered && confidence >= READY_CONFIDENCE) ||
    (coverage >= CORROBORATING_COVERAGE && confidence >= 55);

  // A firm topic with an open disagreement is not ready — it is one
  // conversation away from ready.
  return firm && !hasConflict ? "ready" : "almost_ready";
}

function resolveConsistency(
  coveragePercent: number | null,
  confidence: number,
  hasConflict: boolean,
): ReadinessConsistency {
  if (hasConflict) return "con_diferencias";
  if (
    coveragePercent != null &&
    coveragePercent >= CORROBORATING_COVERAGE &&
    confidence >= 55
  ) {
    return "confirmada";
  }
  return "por_confirmar";
}

function headlineFor(
  state: ReadinessState,
  label: string,
  gaps: string[],
  clarifications: string[],
  minutes: number | null,
): string {
  const area = label.toLowerCase();

  if (state === "ready") {
    return `Ya sabemos lo suficiente sobre ${area} para recomendar con seguridad.`;
  }

  if (state === "almost_ready") {
    if (clarifications.length > 0) {
      return `Casi listo en ${area} — nos queda una aclaración por confirmar${minutes ? ` (unos ${minutes} minutos)` : ""}.`;
    }
    const count = gaps.length;
    if (count === 0) {
      return `Casi listo en ${area} — solo falta confirmarlo con el equipo${minutes ? ` (unos ${minutes} minutos)` : ""}.`;
    }
    return `Casi listo en ${area} — nos falta${count === 1 ? "" : "n"} ${count === 1 ? "una aclaración" : `${count} aclaraciones`}${minutes ? `, unos ${minutes} minutos` : ""}.`;
  }

  if (gaps.length > 0) {
    return `Necesitamos entender ${gaps[0]}.`;
  }
  return `Necesitamos conocer mejor ${area} antes de recomendar algo aquí.`;
}

function estimateMinutes(itemCount: number): number | null {
  if (itemCount <= 0) return null;
  return Math.max(
    MINUTES_PER_CLARIFICATION,
    itemCount * MINUTES_PER_CLARIFICATION,
  );
}

function evaluateTopic(
  snapshot: EvidenceSnapshot,
  dimension: DimensionStatus,
): TopicReadiness {
  const topic = dimension.id;
  const applicable = dimension.applicable !== false;
  const coveragePercent = coveragePercentFor(snapshot, topic);
  const conflicts = conflictsFor(snapshot, topic);
  const allGaps = missingInformationFor(snapshot, topic);

  const state: ReadinessState = applicable
    ? resolveState(dimension, coveragePercent, conflicts.length > 0)
    : "ready";

  const listedGaps =
    state === "ready" ? [] : allGaps.slice(0, MAX_LISTED_GAPS);
  const clarifications = conflicts.map((conflict) => conflict.statement);
  const minutes =
    state === "ready"
      ? null
      : estimateMinutes(listedGaps.length + clarifications.length);

  return {
    topic,
    label: dimension.label,
    state,
    stateLabel: readinessStateLabel(state),
    headline: applicable
      ? headlineFor(state, dimension.label, listedGaps, clarifications, minutes)
      : `${dimension.label} no aplica en este negocio — no hace falta preguntarlo.`,
    missingInformation: listedGaps,
    clarifications,
    backedBy: backedByFor(snapshot, topic, coveragePercent),
    consistency: resolveConsistency(
      coveragePercent,
      dimension.confidence,
      conflicts.length > 0,
    ),
    estimatedMinutes: minutes,
    interviewAction:
      state === "ready" ? "skip" : state === "almost_ready" ? "confirm" : "ask",
    applicable,
  };
}

function resolveOverallState(topics: TopicReadiness[]): ReadinessState {
  const critical = topics.filter(
    (topic) => topic.applicable && CRITICAL_DIMENSIONS.includes(topic.topic),
  );
  const pool = critical.length > 0 ? critical : topics.filter((t) => t.applicable);
  if (pool.length === 0) return "needs_information";
  if (pool.some((topic) => topic.state === "needs_information")) {
    return "needs_information";
  }
  if (pool.every((topic) => topic.state === "ready")) return "ready";
  return "almost_ready";
}

function buildNarrative(
  snapshot: EvidenceSnapshot,
  topics: TopicReadiness[],
  overallState: ReadinessState,
): string {
  const ready = topics.filter((t) => t.applicable && t.state === "ready");
  const open = topics
    .filter((t) => t.applicable && t.state !== "ready")
    .sort(
      (a, b) =>
        Number(a.state === "almost_ready") - Number(b.state === "almost_ready"),
    );

  const base = understandingSentence(snapshot.overallUnderstanding);

  const solid =
    ready.length > 0
      ? ` Tenemos una lectura firme de ${listEs(ready.slice(0, 3).map((t) => t.label.toLowerCase()))}.`
      : "";

  const pending =
    open.length > 0
      ? ` Seguimos aprendiendo sobre ${listEs(open.slice(0, 3).map((t) => t.label.toLowerCase()))}.`
      : "";

  const closing =
    overallState === "ready"
      ? " Con lo que hay hoy podemos recomendar con seguridad."
      : overallState === "almost_ready"
        ? " Falta poco para poder recomendar con seguridad."
        : " Preferimos entender un poco más antes de recomendar.";

  return `${base}${solid}${pending}${closing}`;
}

function listEs(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0]!;
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

/**
 * The open questions, ordered the way a consultant would raise them: the
 * biggest gap of every topic first, then the second one, and so on. A single
 * weak area never floods the list ahead of another area we know nothing
 * about.
 */
function buildStillLearning(topics: TopicReadiness[]): ReadinessLearningItem[] {
  const order: Record<ReadinessState, number> = {
    needs_information: 0,
    almost_ready: 1,
    ready: 2,
  };

  const open = topics
    .filter((topic) => topic.applicable && topic.state !== "ready")
    .sort((a, b) => order[a.state] - order[b.state]);

  const perTopic = open.map((topic) => {
    // Something two sources disagree on outranks something nobody has told
    // us yet — it is cheaper to resolve and it protects the advice.
    const gaps = [...topic.clarifications, ...topic.missingInformation];

    if (gaps.length === 0) {
      return [
        {
          id: `learning_${topic.topic}`,
          topic: topic.topic,
          label: topic.label,
          state: topic.state,
          question: topic.headline,
          why: TOPIC_STAKES[topic.topic],
          estimatedMinutes: topic.estimatedMinutes,
        },
      ];
    }

    return gaps.slice(0, MAX_LISTED_GAPS).map((gap, index) => ({
      id: `learning_${topic.topic}_${index}`,
      topic: topic.topic,
      label: topic.label,
      state: topic.state,
      question: topic.missingInformation.includes(gap)
        ? `Necesitamos entender ${gap}.`
        : gap,
      why: TOPIC_STAKES[topic.topic],
      estimatedMinutes: estimateMinutes(1),
    }));
  });

  const interleaved: ReadinessLearningItem[] = [];
  for (let round = 0; round < MAX_LISTED_GAPS; round += 1) {
    for (const items of perTopic) {
      const item = items[round];
      if (item) interleaved.push(item);
    }
  }
  return interleaved;
}

function buildAdvice(
  overallState: ReadinessState,
  topics: TopicReadiness[],
  totalMinutes: number,
  openClarifications: number,
): ReadinessAdvice {
  const blocking = topics.filter(
    (topic) => topic.applicable && topic.state === "needs_information",
  );

  if (overallState === "ready") {
    if (openClarifications > 0) {
      return {
        action: "ask",
        canAdvise: true,
        headline:
          "Ya podemos recomendar; queda un punto por aclarar con el equipo.",
        detail:
          "Dos fuentes cuentan la historia de forma distinta y preferimos confirmarlo antes de darlo por cerrado.",
        nextStep: "Confirme el punto abierto para dejar la lectura firme.",
      };
    }
    return {
      action: "stop",
      canAdvise: true,
      headline: "Ya podemos recomendar con seguridad.",
      detail:
        "Lo que sabemos del negocio alcanza para sostener las recomendaciones actuales.",
      nextStep: "Revise las recomendaciones y decida por dónde empezar.",
    };
  }

  if (overallState === "almost_ready") {
    return {
      action: "ask",
      canAdvise: true,
      headline: "Podemos recomendar, con un par de confirmaciones pendientes.",
      detail:
        totalMinutes > 0
          ? `Cerrar lo que falta toma unos ${totalMinutes} minutos de conversación.`
          : "Falta muy poco para cerrar el panorama completo.",
      nextStep: "Confirme los puntos abiertos para dejar la lectura firme.",
    };
  }

  const first = blocking[0];
  return {
    action: "ask",
    canAdvise: false,
    headline: "Todavía nos falta información para recomendar.",
    detail: first
      ? first.headline
      : "Necesitamos conocer mejor cómo opera el negocio antes de recomendar.",
    nextStep: "Continúe el diagnóstico — cada respuesta cierra un vacío concreto.",
  };
}

/**
 * Legacy evidence-coverage signals, unchanged in meaning: they exist so the
 * Knowledge Engine's coverage can be contributed to working memory as
 * ordinary evidence facts (see `memory.ts`).
 */
function buildCoverageSignals(snapshot: EvidenceSnapshot): ReadinessSignal[] {
  const signals: ReadinessSignal[] = [];

  for (const slice of snapshot.coverage) {
    if (slice.percent < MIN_COVERAGE) continue;
    const dimensions = Object.entries(DIMENSION_TO_AREA)
      .filter(([, area]) => area === slice.area)
      .map(([dimension]) => dimension as DiscoveryDimension);

    for (const dimension of dimensions) {
      const strong = slice.percent >= CORROBORATING_COVERAGE;
      signals.push({
        dimension,
        area: slice.area,
        coveragePercent: slice.percent,
        skipRecommended: strong,
        reason: strong
          ? `La información cargada ya cubre "${coverageAreaLabel(slice.area)}" — podemos aligerar las preguntas de esta área.`
          : `La información cargada aporta a "${coverageAreaLabel(slice.area)}"; aún conviene confirmarlo en la conversación.`,
        evidenceAssetIds: slice.evidenceAssetIds,
      });
    }
  }

  return signals;
}

/** Evaluate readiness from an already-built snapshot. */
export function evaluateReadiness(
  snapshot: EvidenceSnapshot,
): ReadinessAssessment {
  const topics = snapshot.dimensions.map((dimension) =>
    evaluateTopic(snapshot, dimension),
  );

  const applicable = topics.filter((topic) => topic.applicable);
  const ready = applicable.filter((topic) => topic.state === "ready");
  const almostReady = applicable.filter(
    (topic) => topic.state === "almost_ready",
  );
  const needsInformation = applicable.filter(
    (topic) => topic.state === "needs_information",
  );

  const overallState = resolveOverallState(topics);
  const totalEstimatedMinutes = applicable.reduce(
    (sum, topic) => sum + (topic.estimatedMinutes ?? 0),
    0,
  );

  return {
    workspaceId: snapshot.workspaceId,
    generatedAt: nowIso(),
    topics,
    ready,
    almostReady,
    needsInformation,
    overallState,
    overallStateLabel: readinessStateLabel(overallState),
    narrative: buildNarrative(snapshot, topics, overallState),
    stillLearning: buildStillLearning(topics),
    advice: buildAdvice(
      overallState,
      topics,
      totalEstimatedMinutes,
      snapshot.conflicts.length,
    ),
    totalEstimatedMinutes,
    inventory: snapshot.inventory,
    conflicts: snapshot.conflicts,
    signals: buildCoverageSignals(snapshot),
    skippableDimensions: ready.map((topic) => topic.topic),
  };
}

/** Readiness for a company workspace — the entry point every screen uses. */
export function assessReadiness(
  workspace: CompanyWorkspace,
): ReadinessAssessment {
  return evaluateReadiness(snapshotFromWorkspace(workspace));
}
