import type {
  PlanificacionDataReqStatus,
  PlanificacionGovernanceStatus,
} from "@/types";

const FABRICATED_CHANGELOG_ACTOR = "Sistema — ejemplo de planificación";

export function isFabricatedPlanificacionChangeEntry(approvedBy: string): boolean {
  return approvedBy === FABRICATED_CHANGELOG_ACTOR;
}

export function mapDataReqStatusToGovernance(
  status: PlanificacionDataReqStatus,
): PlanificacionGovernanceStatus {
  switch (status) {
    case "aprobado":
      return "aprobado";
    case "recibido":
      return "en_revision";
    case "en_revision":
      return "en_revision";
    default:
      return "requiere_confirmacion";
  }
}
