import type {
  DimensionStatus,
  DiscoveryDimension,
  DiscoveryPhase,
  Interview,
} from "@/types";

/**
 * Guided Assessment — stage orchestration (Mission: Guided Assessment Experience).
 *
 * This module only groups the EXISTING interview phases / discovery
 * dimensions into a TurboTax-style stage sequence for presentation. It does
 * not add questions, change scoring, or reorder the adaptive engine — the
 * engine still decides which question comes next; stages just label where
 * that question belongs.
 */

export type GuidedStageId =
  | "welcome"
  | "company"
  | "commercial"
  | "operations"
  | "finance"
  | "technology"
  | "people"
  | "review"
  | "finish";

export interface GuidedStageDefinition {
  id: GuidedStageId;
  title: string;
  shortLabel: string;
  /** Short executive Spanish rationale — why we ask these questions. */
  rationale: string;
  /** Existing discovery dimensions this stage represents (empty = meta stage). */
  dimensions: DiscoveryDimension[];
}

export const GUIDED_STAGE_ORDER: GuidedStageId[] = [
  "welcome",
  "company",
  "commercial",
  "operations",
  "finance",
  "technology",
  "people",
  "review",
  "finish",
];

export const GUIDED_STAGES: Record<GuidedStageId, GuidedStageDefinition> = {
  welcome: {
    id: "welcome",
    title: "Bienvenida",
    shortLabel: "Bienvenida",
    rationale:
      "Confirmamos quién nos habla para que el diagnóstico use el idioma correcto de la empresa desde la primera pregunta.",
    dimensions: [],
  },
  company: {
    id: "company",
    title: "Empresa",
    shortLabel: "Empresa",
    rationale:
      "Una descripción abierta del negocio da el contexto que hace más precisas todas las preguntas que siguen.",
    dimensions: [],
  },
  commercial: {
    id: "commercial",
    title: "Comercial",
    shortLabel: "Comercial",
    rationale:
      "Ventas, clientes y geografía son el origen del ingreso. Sin claridad aquí, cualquier recomendación es una suposición.",
    dimensions: ["sales", "customers", "geography"],
  },
  operations: {
    id: "operations",
    title: "Operaciones",
    shortLabel: "Operaciones",
    rationale:
      "Así se mueve el trabajo día a día. Aquí viven los cuellos de botella que más cuestan tiempo y dinero.",
    dimensions: ["operations", "production"],
  },
  finance: {
    id: "finance",
    title: "Finanzas",
    shortLabel: "Finanzas",
    rationale:
      "Facturación, cobro y aprobaciones definen la velocidad del efectivo — dónde se frena o se libera el flujo de caja.",
    dimensions: ["finance"],
  },
  technology: {
    id: "technology",
    title: "Tecnología",
    shortLabel: "Tecnología",
    rationale:
      "Los sistemas y hojas de cálculo actuales marcan el punto de partida real — no el ideal — para diseñar lo que sigue.",
    dimensions: ["systems"],
  },
  people: {
    id: "people",
    title: "Equipo",
    shortLabel: "Equipo",
    rationale:
      "La estructura del equipo muestra quién decide, quién ejecuta y dónde se concentra el riesgo de una sola persona.",
    dimensions: ["team"],
  },
  review: {
    id: "review",
    title: "Revisión",
    shortLabel: "Revisión",
    rationale:
      "Antes de cerrar, revise lo que quedó registrado. Puede editar una respuesta o continuar donde lo dejó.",
    dimensions: [],
  },
  finish: {
    id: "finish",
    title: "Cierre",
    shortLabel: "Cierre",
    rationale:
      "El diagnóstico queda guardado en el espacio de trabajo ejecutivo y sigue vivo — se actualiza con cada conversación.",
    dimensions: [],
  },
};

export function stagePosition(stageId: GuidedStageId): {
  index: number;
  total: number;
} {
  const index = GUIDED_STAGE_ORDER.indexOf(stageId);
  return { index: index === -1 ? 0 : index, total: GUIDED_STAGE_ORDER.length };
}

export function dimensionToStage(
  dimension: DiscoveryDimension | null | undefined,
): GuidedStageId {
  if (!dimension) return "company";
  const match = GUIDED_STAGE_ORDER.find((id) =>
    GUIDED_STAGES[id].dimensions.includes(dimension),
  );
  return match ?? "company";
}

const IDENTITY_PHASES = new Set<DiscoveryPhase>(["welcome", "role", "name"]);
const COMPANY_PHASES = new Set<DiscoveryPhase>(["company", "business"]);

/**
 * Resolve which stage the *live, engine-driven* question belongs to.
 * The engine still owns question order — this only labels it.
 */
export function resolveCurrentStage(interview: Interview): GuidedStageId {
  const phase = interview.phase;
  if (IDENTITY_PHASES.has(phase)) return "welcome";
  if (COMPANY_PHASES.has(phase)) return "company";
  if (phase === "synthesizing" || phase === "complete") return "finish";
  return dimensionToStage(interview.conversation.currentQuestion?.dimension);
}

export interface StageCompletion {
  applicable: boolean;
  covered: boolean;
  confidence: number;
}

const PHASE_ORDER: DiscoveryPhase[] = [
  "welcome",
  "role",
  "name",
  "company",
  "business",
  "interview",
  "synthesizing",
  "complete",
];

function metaStageCompletion(
  stageId: GuidedStageId,
  interview: Interview,
): StageCompletion {
  const currentIndex = PHASE_ORDER.indexOf(interview.phase);
  if (stageId === "welcome") {
    const done = currentIndex > PHASE_ORDER.indexOf("name");
    return { applicable: true, covered: done, confidence: done ? 100 : 0 };
  }
  if (stageId === "company") {
    const done = currentIndex > PHASE_ORDER.indexOf("business");
    return { applicable: true, covered: done, confidence: done ? 100 : 0 };
  }
  if (stageId === "finish") {
    const done = interview.phase === "complete";
    return { applicable: true, covered: done, confidence: done ? 100 : 0 };
  }
  // review — never "complete", it is a place to visit, not a gate.
  return { applicable: true, covered: false, confidence: 0 };
}

/** Stage completion derived straight from the existing discovery score. */
export function computeStageCompletion(
  interview: Interview,
): Record<GuidedStageId, StageCompletion> {
  const dimensions = interview.memory.score.dimensions;
  const byId = new Map<DiscoveryDimension, DimensionStatus>(
    dimensions.map((dimension) => [dimension.id, dimension]),
  );

  const result = {} as Record<GuidedStageId, StageCompletion>;
  for (const stageId of GUIDED_STAGE_ORDER) {
    const stageDimensions = GUIDED_STAGES[stageId].dimensions
      .map((id) => byId.get(id))
      .filter((d): d is DimensionStatus => Boolean(d))
      .filter((d) => d.applicable !== false);

    if (stageDimensions.length === 0) {
      result[stageId] = metaStageCompletion(stageId, interview);
      continue;
    }

    const confidence = Math.round(
      stageDimensions.reduce((sum, d) => sum + d.confidence, 0) /
        stageDimensions.length,
    );
    result[stageId] = {
      applicable: true,
      covered: stageDimensions.every((d) => d.covered),
      confidence,
    };
  }
  return result;
}

export function stagesBeforeReview(): GuidedStageId[] {
  return GUIDED_STAGE_ORDER.filter((id) => id !== "review" && id !== "finish");
}
