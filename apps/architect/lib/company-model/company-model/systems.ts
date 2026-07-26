import type {
  BusinessBlueprint,
  CompanyDepartment,
  CompanyModelEvidenceRef,
  CompanySystem,
  CompanyWorkspace,
  CompanyWorkflowRef,
} from "@/types";
import { departmentByName } from "./departments";
import { modelId } from "./ids";

export function deriveSystems(
  workspace: CompanyWorkspace,
  blueprint: BusinessBlueprint,
  departments: CompanyDepartment[],
  evidence: CompanyModelEvidenceRef[],
): CompanySystem[] {
  const knowledgeSystems =
    workspace.knowledge?.entities.filter((e) => e.kind === "System") ?? [];
  const integrations = workspace.solutionArchitecture?.integrations ?? [];
  const systems: CompanySystem[] = [];
  const seen = new Set<string>();

  for (const item of blueprint.systems) {
    const key = item.name.toLowerCase();
    seen.add(key);
    const knowledgeMatch = knowledgeSystems.find(
      (k) => k.name.toLowerCase() === key,
    );
    const integration = integrations.find(
      (i) => i.name.toLowerCase() === key,
    );
    systems.push({
      id: modelId("csys", item.id),
      name: item.name,
      purpose: item.purpose,
      blueprintSystemId: item.id,
      solutionIntegrationId: integration?.id ?? null,
      knowledgeEntityId: knowledgeMatch?.id ?? null,
      departmentIds: [],
      workflowIds: [],
      replacementStrategy: item.replacementStrategy,
      confidence: knowledgeMatch ? 0.85 : 0.78,
      evidence: [
        {
          source: "blueprint",
          id: item.id,
          label: item.name,
        },
        ...evidence.slice(0, 1),
      ],
    });
  }

  for (const integration of integrations) {
    const key = integration.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    systems.push({
      id: modelId("csys", integration.id),
      name: integration.name,
      purpose: integration.purpose,
      blueprintSystemId: null,
      solutionIntegrationId: integration.id,
      knowledgeEntityId:
        knowledgeSystems.find((k) => k.name.toLowerCase() === key)?.id ?? null,
      departmentIds: [],
      workflowIds: [],
      replacementStrategy:
        integration.status === "retire" ? "Retire / replace" : null,
      confidence: integration.confidence,
      evidence: evidence.slice(0, 2),
    });
  }

  for (const entity of knowledgeSystems) {
    const key = entity.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    systems.push({
      id: modelId("csys", entity.id),
      name: entity.name,
      purpose: entity.summary ?? "System observed in knowledge vault",
      blueprintSystemId: null,
      solutionIntegrationId: null,
      knowledgeEntityId: entity.id,
      departmentIds: [],
      workflowIds: [],
      replacementStrategy: null,
      confidence: entity.confidence,
      evidence: [
        {
          source: "knowledge",
          id: entity.id,
          label: entity.name,
        },
      ],
    });
  }

  // Attach workflows that mention the system
  const processWorkflows = workspace.businessProcesses?.workflows ?? [];
  for (const system of systems) {
    const key = system.name.toLowerCase();
    system.workflowIds = processWorkflows
      .filter((wf) =>
        wf.steps.some((s) =>
          s.systemsUsed.some((sys) => sys.toLowerCase() === key),
        ),
      )
      .map((wf) => modelId("cwf", wf.id));

    const deptHints = new Set<string>();
    for (const wf of processWorkflows) {
      if (!system.workflowIds.includes(modelId("cwf", wf.id))) continue;
      const dept = departmentByName(departments, wf.department);
      if (dept) deptHints.add(dept.id);
    }
    system.departmentIds = Array.from(deptHints);
  }

  for (const dept of departments) {
    dept.systemIds = systems
      .filter((s) => s.departmentIds.includes(dept.id))
      .map((s) => s.id);
  }

  return systems;
}

export function attachWorkflowSystems(
  workflows: CompanyWorkflowRef[],
  systems: CompanySystem[],
): void {
  for (const wf of workflows) {
    wf.systemIds = systems
      .filter((s) => s.workflowIds.includes(wf.id))
      .map((s) => s.id);
  }
}
