import type {
  BusinessBlueprint,
  CompanyDepartment,
  CompanyModelEvidenceRef,
  CompanyWorkspace,
} from "@/types";
import { modelId } from "./ids";

export function deriveDepartments(
  workspace: CompanyWorkspace,
  blueprint: BusinessBlueprint,
  evidence: CompanyModelEvidenceRef[],
): CompanyDepartment[] {
  const knowledgeDepts =
    workspace.knowledge?.entities.filter((e) => e.kind === "Department") ?? [];

  return blueprint.departments.map((dept) => {
    const knowledgeMatch = knowledgeDepts.find(
      (k) => k.name.toLowerCase() === dept.name.toLowerCase(),
    );
    const personIds = workspace.people
      .filter(
        (p) =>
          p.department &&
          p.department.toLowerCase() === dept.name.toLowerCase(),
      )
      .map((p) => modelId("cperson", p.id));

    const workflowIds = (workspace.businessProcesses?.workflows ?? [])
      .filter(
        (wf) =>
          wf.department &&
          wf.department.toLowerCase() === dept.name.toLowerCase(),
      )
      .map((wf) => modelId("cwf", wf.id));

    return {
      id: modelId("cdept", dept.id),
      name: dept.name,
      purpose: dept.purpose,
      blueprintDepartmentId: dept.id,
      knowledgeEntityId: knowledgeMatch?.id ?? null,
      capabilityIds: [...dept.capabilityIds],
      personIds,
      roleIds: [],
      systemIds: [],
      workflowIds,
      headcountHint: dept.headcountHint,
      confidence: knowledgeMatch ? 0.88 : 0.8,
      evidence: [
        {
          source: "blueprint",
          id: dept.id,
          label: `Department ${dept.name}`,
        },
        ...evidence.slice(0, 1),
      ],
    };
  });
}

export function departmentByName(
  departments: CompanyDepartment[],
  name: string | null | undefined,
): CompanyDepartment | null {
  if (!name) return null;
  const key = name.toLowerCase();
  return (
    departments.find((d) => d.name.toLowerCase() === key) ??
    departments.find((d) => key.includes(d.name.toLowerCase())) ??
    null
  );
}
