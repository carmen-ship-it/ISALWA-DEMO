/**
 * Deterministic expected-ROI framing from priority, horizon, and impact signals.
 * Spanish executive copy. No LLM.
 */

import type {
  ConsultingOpportunity,
  ConsultingOpportunityHorizon,
  ConsultingRecommendation,
  OpportunityImpact,
  Recommendation,
} from "@/types";
import type { ExpectedRoi, ExplainedPriority, RoiBand } from "./types";

export function roiFromConsulting(
  recommendation: ConsultingRecommendation,
  opportunities: ConsultingOpportunity[],
): ExpectedRoi {
  const primary = opportunities[0];
  const band = bandFromPriorityAndHorizon(
    recommendation.priority,
    primary?.horizon,
  );
  const drivers: string[] = [];

  if (primary?.estimatedImpact) {
    drivers.push(primary.estimatedImpact);
  }
  if (primary?.horizon) {
    drivers.push(`Horizonte: ${horizonLabelEs(primary.horizon)}`);
  }
  if (primary?.difficulty) {
    drivers.push(`Dificultad de ejecución: ${difficultyEs(primary.difficulty)}`);
  }
  drivers.push(`Prioridad consultora: ${priorityLabelEs(recommendation.priority)}`);

  return {
    band,
    summary: roiSummaryEs(band, primary?.horizon),
    drivers: unique(drivers).slice(0, 4),
  };
}

export function roiFromWorkspaceRecommendation(
  recommendation: Recommendation,
  impact?: OpportunityImpact,
): ExpectedRoi {
  const band = bandFromImpactAndPriority(recommendation.priority, impact);
  const drivers = [
    `Prioridad: ${priorityLabelEs(recommendation.priority)}`,
  ];
  if (impact) {
    drivers.push(`Impacto estimado: ${impactLabelEs(impact)}`);
  }
  if (recommendation.relatedPainPoints.length > 0) {
    drivers.push(
      `Vinculada a ${recommendation.relatedPainPoints.length} punto(s) de dolor`,
    );
  }

  return {
    band,
    summary: roiSummaryEs(band),
    drivers: drivers.slice(0, 4),
  };
}

export function roiFromModuleIndex(
  index: number,
  phaseBusinessValue: string | null,
  priority: ExplainedPriority | null,
): ExpectedRoi {
  const band: RoiBand =
    index < 2 ? "alto" : index < 4 ? "moderado" : "estratégico";
  const drivers: string[] = [];
  if (phaseBusinessValue) drivers.push(phaseBusinessValue);
  if (priority) drivers.push(`Prioridad de entrega: ${priorityLabelEs(priority)}`);
  drivers.push(
    index < 2
      ? "Capacidad temprana en la hoja de ruta"
      : "Capacidad en fases posteriores — valor acumulativo",
  );

  return {
    band,
    summary: roiSummaryEs(band),
    drivers: unique(drivers).slice(0, 4),
  };
}

function bandFromPriorityAndHorizon(
  priority: ExplainedPriority,
  horizon?: ConsultingOpportunityHorizon,
): RoiBand {
  if (horizon === "Quick Wins" || horizon === "30-day") return "alto";
  if (horizon === "strategic" || horizon === "1-year") return "estratégico";
  if (priority === "now") return "alto";
  if (priority === "later") return "estratégico";
  if (horizon === "90-day" || horizon === "6-month") return "moderado";
  return "moderado";
}

function bandFromImpactAndPriority(
  priority: ExplainedPriority,
  impact?: OpportunityImpact,
): RoiBand {
  if (impact === "quick_win") return "alto";
  if (impact === "strategic") return "estratégico";
  if (impact === "high" && priority === "now") return "alto";
  if (priority === "later") return "estratégico";
  if (impact === "medium" || impact === "high") return "moderado";
  return priority === "now" ? "alto" : "emergente";
}

export function roiSummaryEs(
  band: RoiBand,
  horizon?: ConsultingOpportunityHorizon,
): string {
  const horizonNote = horizon
    ? ` Horizonte de captura: ${horizonLabelEs(horizon)}.`
    : "";
  switch (band) {
    case "alto":
      return `Retorno esperado alto — el valor debería hacerse visible con rapidez.${horizonNote}`;
    case "moderado":
      return `Retorno esperado moderado — mejora medible en un ciclo operativo corto.${horizonNote}`;
    case "estratégico":
      return `Retorno estratégico — construye capacidad durable más que un atajo táctico.${horizonNote}`;
    default:
      return `Retorno aún emergente — se afinará conforme crezca la evidencia.${horizonNote}`;
  }
}

export function priorityLabelEs(priority: ExplainedPriority): string {
  switch (priority) {
    case "now":
      return "Ahora";
    case "next":
      return "Siguiente";
    case "later":
      return "Más adelante";
  }
}

export function roiBandLabelEs(band: RoiBand): string {
  switch (band) {
    case "alto":
      return "Alto";
    case "moderado":
      return "Moderado";
    case "estratégico":
      return "Estratégico";
    default:
      return "Emergente";
  }
}

function horizonLabelEs(horizon: ConsultingOpportunityHorizon): string {
  switch (horizon) {
    case "Quick Wins":
      return "victorias rápidas";
    case "30-day":
      return "30 días";
    case "90-day":
      return "90 días";
    case "6-month":
      return "6 meses";
    case "1-year":
      return "1 año";
    case "strategic":
      return "estratégico";
  }
}

function difficultyEs(difficulty: string): string {
  switch (difficulty) {
    case "low":
      return "baja";
    case "high":
      return "alta";
    default:
      return "moderada";
  }
}

function impactLabelEs(impact: OpportunityImpact): string {
  switch (impact) {
    case "quick_win":
      return "victoria rápida";
    case "medium":
      return "medio";
    case "high":
      return "alto";
    case "strategic":
      return "estratégico";
  }
}

function unique(items: string[]): string[] {
  return [...new Set(items.filter(Boolean))];
}
