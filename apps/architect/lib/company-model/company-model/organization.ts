import type {
  BusinessBlueprint,
  CompanyModelEvidenceRef,
  CompanyOrganization,
  CompanyWorkspace,
} from "@/types";

export function deriveOrganization(
  workspace: CompanyWorkspace,
  blueprint: BusinessBlueprint,
  evidence: CompanyModelEvidenceRef[],
): CompanyOrganization {
  const deptNames = blueprint.departments.map((d) => d.name);
  const summary = [
    `${workspace.companyName} operating model from Blueprint v${blueprint.version}.`,
    deptNames.length > 0
      ? `Departments: ${deptNames.join(", ")}.`
      : "Department structure still emerging from discovery.",
    blueprint.currentState
      ? `Current state: ${blueprint.currentState.slice(0, 180)}`
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
