import type {
  BusinessBlueprint,
  CompanyModelEvidenceRef,
  CompanyOrganization,
  CompanyWorkspace,
} from "@/types";
import { departmentLabel } from "@/lib/presentation";

export function deriveOrganization(
  workspace: CompanyWorkspace,
  blueprint: BusinessBlueprint,
  evidence: CompanyModelEvidenceRef[],
): CompanyOrganization {
  const deptNames = blueprint.departments.map((d) => departmentLabel(d.name));
  const summary = [
    `Modelo operativo de ${workspace.companyName} a partir del Plan de negocio v${blueprint.version}.`,
    deptNames.length > 0
      ? `Departamentos: ${deptNames.join(", ")}.`
      : "La estructura de departamentos todavía está emergiendo del descubrimiento.",
    blueprint.currentState
      ? `Estado actual: ${blueprint.currentState.slice(0, 180)}`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    workspaceId: workspace.id,
    companyName: workspace.companyName,
    industry: workspace.industry,
    stage: workspace.currentStage,
    blueprintId: blueprint.id,
    solutionArchitectureId: workspace.solutionArchitecture?.id ?? null,
    businessProcessModelId: workspace.businessProcesses?.id ?? null,
    summary,
    confidence: blueprint.departments.length > 0 ? 0.82 : 0.45,
    evidence: evidence.slice(0, 4),
  };
}
