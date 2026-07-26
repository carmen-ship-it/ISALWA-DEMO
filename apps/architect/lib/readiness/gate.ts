/**
 * Consultant Readiness Engine — gates and evidence transparency.
 *
 * Two client-facing questions answered from one assessment:
 *   · ¿Ya podemos presentar el plan?      → `blueprintReadinessGate`
 *   · ¿Sobre qué se apoya esta recomendación? → `recommendationEvidenceBasis`
 *
 * Both speak in terms of evidence and missing information. Neither exposes a
 * confidence number, a band name from the model, or any notion of scoring.
 */

import { coverageBand, coverageBandLabelEs } from "@/lib/presentation";
import { CRITICAL_DIMENSIONS } from "@/lib/reasoning/confidence/score";
import { readinessStateLabel } from "./topics";
import type {
  ReadinessAssessment,
  ReadinessGate,
  ReadinessState,
  RecommendationEvidenceBasis,
} from "./types";

/**
 * The Blueprint is the company's operating plan — it may only be presented
 * as a firm recommendation once the four topics the Discovery Score already
 * treats as critical are covered. Same list, one source of truth.
 */
export function blueprintReadinessGate(
  assessment: ReadinessAssessment,
): ReadinessGate {
  const gating = assessment.topics.filter(
    (topic) => topic.applicable && CRITICAL_DIMENSIONS.includes(topic.topic),
  );

  const open = gating.filter((topic) => topic.state !== "ready");
  const blocking = gating.filter(
    (topic) => topic.state === "needs_information",
  );

  const state: ReadinessState =
    blocking.length > 0
      ? "needs_information"
      : open.length > 0
        ? "almost_ready"
        : "ready";

  const missingInformation = open
    .flatMap((topic) =>
      topic.missingInformation.length > 0
        ? topic.missingInformation
        : topic.clarifications,
    )
    .slice(0, 4);

  const estimatedMinutes = open.reduce(
    (sum, topic) => sum + (topic.estimatedMinutes ?? 0),
    0,
  );

  if (state === "ready") {
    return {
      state,
      stateLabel: readinessStateLabel(state),
      title: "El plan está listo para revisarse",
      message:
        "Conocemos lo suficiente del negocio para sostener este plan operativo. Puede revisarlo y decidir por dónde empezar.",
      ctaLabel: "Revisar el plan",
      estimatedMinutes: null,
      missingInformation: [],
      unlocked: true,
    };
  }

  if (state === "almost_ready") {
    return {
      state,
      stateLabel: readinessStateLabel(state),
      title: "El plan está casi listo",
      message:
        estimatedMinutes > 0
          ? `Puede revisarlo desde ahora. Nos quedan un par de confirmaciones — unos ${estimatedMinutes} minutos de conversación — para dejarlo firme.`
          : "Puede revisarlo desde ahora. Nos quedan un par de confirmaciones para dejarlo firme.",
      ctaLabel: "Confirmar lo que falta",
      estimatedMinutes: estimatedMinutes > 0 ? estimatedMinutes : null,
      missingInformation,
      unlocked: true,
    };
  }

  return {
    state,
    stateLabel: readinessStateLabel(state),
    title: "Necesitamos entender un poco más",
    message:
      blocking[0]?.headline ??
      "Todavía falta información básica sobre cómo opera la empresa para proponer un plan responsable.",
    ctaLabel: "Continuar el diagnóstico",
    estimatedMinutes: estimatedMinutes > 0 ? estimatedMinutes : null,
    missingInformation,
    unlocked: false,
  };
}

/** Evidence source ids → the words a client understands. */
const BASIS_GROUPS: Array<{
  match: (source: string) => boolean;
  singular: string;
  plural: string;
}> = [
  {
    match: (s) => s === "fact" || s === "meeting" || s === "pain",
    singular: "hallazgo de las entrevistas",
    plural: "hallazgos de las entrevistas",
  },
  {
    match: (s) => s === "knowledge",
    singular: "documento del expediente",
    plural: "documentos del expediente",
  },
  {
    match: (s) => s === "pattern",
    singular: "patrón observado",
    plural: "patrones observados",
  },
  {
    match: (s) => s === "risk" || s === "opportunity" || s === "consulting",
    singular: "hallazgo del diagnóstico",
    plural: "hallazgos del diagnóstico",
  },
  {
    match: (s) => s === "blueprint" || s === "solution" || s === "process",
    singular: "pieza del plan operativo",
    plural: "piezas del plan operativo",
  },
];

export interface RecommendationEvidenceInput {
  /** Evidence source ids attached to the recommendation. */
  sources: string[];
  /** Support already computed by the explanation layer (0–1 or 0–100). */
  support: number;
  scale?: "unit" | "percent";
}

/**
 * Describe what a recommendation stands on. `support` is reused verbatim
 * from the explanation layer and translated into an evidence-strength word —
 * the client sees how solid the footing is, never the underlying figure.
 */
export function recommendationEvidenceBasis(
  input: RecommendationEvidenceInput,
  assessment: ReadinessAssessment | null = null,
): RecommendationEvidenceBasis {
  const band = coverageBand(input.support, input.scale ?? "unit");
  const strengthLabel = coverageBandLabelEs(band);

  const counts = new Map<string, number>();
  for (const source of input.sources) {
    const group = BASIS_GROUPS.find((candidate) => candidate.match(source));
    if (!group) continue;
    const key = group.singular;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const basis = Array.from(counts.entries()).map(([singular, count]) => {
    const group = BASIS_GROUPS.find((item) => item.singular === singular)!;
    return `${count} ${count === 1 ? group.singular : group.plural}`;
  });

  const thin = band === "Partial" || band === "Limited" || band === "Early";
  const shouldAsk =
    thin || (assessment != null && assessment.overallState !== "ready");

  return {
    strengthLabel,
    basis: basis.length > 0 ? basis : ["Evidencia del diagnóstico en curso"],
    askForMore: shouldAsk ? askForMoreLine(assessment) : null,
  };
}

const GAP_PREFIX = /^necesitamos entender\s+/i;

/**
 * Prefer a concrete gap ("necesitamos entender cómo se aprueban las compras")
 * over an open clarification, because a gap reads as a request the client can
 * answer on the spot.
 */
function askForMoreLine(assessment: ReadinessAssessment | null): string {
  const generic =
    "Para afinar esta recomendación nos ayudaría profundizar un poco más en el diagnóstico.";
  if (!assessment) return generic;

  const gap = assessment.stillLearning.find((item) =>
    GAP_PREFIX.test(item.question),
  );
  if (gap) {
    return `Para afinar esta recomendación nos ayudaría entender ${gap.question.replace(GAP_PREFIX, "").trim()}`;
  }

  const clarification = assessment.stillLearning[0];
  if (clarification) {
    return `Para afinar esta recomendación conviene cerrar un punto abierto: ${clarification.question}`;
  }

  return generic;
}
