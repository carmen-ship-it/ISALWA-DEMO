import type { CompanyWorkspace } from "@/types";
import { isPlanificacionStateV1 } from "@/types";
import {
  COMMERCIAL_FOCUS_LABEL,
  COMMERCIAL_FEATURES,
  COST_ITEMS,
  IMPLEMENTATION_PHASES,
  PLANIFICACION_DEMO_DATA_NOTICE,
  PLANIFICACION_PRINCIPLE,
  SECURITY_ITEMS,
  type PlanificacionCommercialFeature,
  type PlanificacionPhase,
} from "./content";
import type { PlanificacionItemStatus } from "@/types";

export interface PlanificacionResumen {
  overallStatus: PlanificacionItemStatus;
  overallLabel: string;
  focus: string;
  available: string[];
  inProgress: string[];
  nextMilestone: string;
  blockers: string[];
  understandingPct: number;
}

export function buildPlanificacionResumen(
  workspace: CompanyWorkspace,
): PlanificacionResumen {
  const plan = workspace.planificacion;
  const pendingDecisions =
    plan && isPlanificacionStateV1(plan)
      ? plan.decisions.filter((d) => d.status === "pendiente")
      : [];
  const pendingData =
    plan && isPlanificacionStateV1(plan)
      ? plan.dataRequirements.filter((d) => d.status === "pendiente")
      : [];

  const understanding = workspace.businessUnderstanding ?? 0;

  let overallStatus: PlanificacionItemStatus = "en_progreso";
  let overallLabel = "Planificación en curso";
  if (understanding < 20) {
    overallStatus = "pendiente";
    overallLabel = "Descubrimiento inicial";
  } else if (pendingDecisions.length > 2 || pendingData.length > 7) {
    overallStatus = "decision_isalwa";
    overallLabel = "Requiere decisiones de ISALWA";
  }

  return {
    overallStatus,
    overallLabel,
    focus: COMMERCIAL_FOCUS_LABEL,
    available: COMMERCIAL_FEATURES
      .filter((f) => f.status === "completado")
      .map((f) => `${f.name} (demo)`),
    inProgress: [
      "Planificación ISALWA",
      "Seguridad y permisos del sistema operativo",
      "Preparación para datos reales",
    ],
    nextMilestone: "Piloto comercial seguro con usuarios definidos",
    blockers: [
      ...pendingDecisions.slice(0, 2).map((d) => d.question),
      pendingData.length > 0
        ? `${pendingData.length} elementos de datos pendientes de ISALWA`
        : null,
      "Autenticación y protección de API del sistema operativo",
    ].filter((b): b is string => Boolean(b)),
    understandingPct: understanding,
  };
}

/** Merge solution roadmap module names into phase display when present. */
export function mergePhasesWithSolution(
  workspace: CompanyWorkspace,
): PlanificacionPhase[] {
  const phases = [...IMPLEMENTATION_PHASES];
  const roadmap = workspace.solutionArchitecture?.roadmap ?? [];
  if (roadmap.length === 0) return phases;

  return phases.map((phase) => {
    const match = roadmap.find((r) => r.phase === phase.phase);
    if (!match || match.modules.length === 0) return phase;
    const moduleHints = match.modules.slice(0, 4).join(", ");
    return {
      ...phase,
      includes: [
        ...phase.includes,
        `Módulos detectados en descubrimiento: ${moduleHints}`,
      ],
    };
  });
}

export function commercialFeatures(): PlanificacionCommercialFeature[] {
  return COMMERCIAL_FEATURES;
}

export {
  COST_ITEMS,
  SECURITY_ITEMS,
  PLANIFICACION_DEMO_DATA_NOTICE,
  PLANIFICACION_PRINCIPLE,
};
