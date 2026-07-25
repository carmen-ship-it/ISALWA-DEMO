import type {
  BlueprintDeliverable,
  CompanyWorkspace,
  DeliverableEvidenceRef,
  ProcessBookDeliverable,
  SolutionDeliverable,
} from "@/types";

export function buildBlueprintDeliverable(
  workspace: CompanyWorkspace,
  evidence: DeliverableEvidenceRef[],
): BlueprintDeliverable | null {
  const blueprint = workspace.blueprints.find(
    (b) => b.id === workspace.currentBlueprintId,
  );
  if (!blueprint) return null;

  return {
    kind: "business_blueprint",
    blueprintId: blueprint.id,
    version: blueprint.version,
    title: blueprint.title,
    summary: blueprint.summary,
    capabilities: blueprint.capabilities.map((c) => c.name),
    departments: blueprint.departments.map((d) => d.name),
    workflows: blueprint.workflows.map((w) => w.name),
    entities: blueprint.entities.map((e) => e.name),
    systems: blueprint.systems.map((s) => s.name),
    operatingRules: blueprint.operatingRules.map((r) => r.statement),
    modules: blueprint.modules.map((m) => m.name),
    risks: blueprint.risks,
    evidence: [
      { source: "blueprint", id: blueprint.id, label: `Blueprint v${blueprint.version}` },
      ...evidence.slice(0, 3),
    ],
  };
}

export function buildSolutionDeliverable(
  workspace: CompanyWorkspace,
  evidence: DeliverableEvidenceRef[],
): SolutionDeliverable | null {
  const solution = workspace.solutionArchitecture;
  if (!solution) return null;

  return {
    kind: "solution_architecture",
    solutionId: solution.id,
    blueprintVersion: solution.blueprintVersion,
    summary: solution.summary,
    modules: solution.modules.map((m) => m.name),
    entities: solution.entities.map((e) => e.name),
    relationships: solution.relationships.map(
      (r) => `${r.fromEntity} ${r.cardinality} ${r.toEntity}`,
    ),
    roles: solution.roles.map((r) => r.name),
    permissions: solution.permissions.map((p) => p.capability),
    navigation: solution.navigation.map((n) => n.label),
    integrations: solution.integrations.map(
      (i) => `${i.name} (${i.status})`,
    ),
    roadmap: solution.roadmap.map(
      (p) => `Phase ${p.phase}: ${p.name}`,
    ),
    evidence: [
      { source: "solution", id: solution.id, label: "Solution Architecture" },
      ...evidence.slice(0, 3),
    ],
  };
}

export function buildProcessBook(
  workspace: CompanyWorkspace,
  evidence: DeliverableEvidenceRef[],
): ProcessBookDeliverable | null {
  const processes = workspace.businessProcesses;
  if (!processes) return null;

  const actorsById = new Map(processes.actors.map((a) => [a.id, a]));

  return {
    kind: "process_book",
    processModelId: processes.id,
    blueprintVersion: processes.blueprintVersion,
    summary: processes.summary,
    workflows: processes.workflows.map((wf) => {
      const approvals = processes.approvals
        .filter((a) => a.workflowId === wf.id)
        .map((a) => a.name);
      const actors = wf.actorIds
        .map((id) => actorsById.get(id)?.name)
        .filter((n): n is string => n != null);
      const deps = processes.dependencies
        .filter(
          (d) => d.fromWorkflowId === wf.id || d.toWorkflowId === wf.id,
        )
        .map((d) => d.relationship);
      const automation = processes.automationCandidates
        .filter((c) => c.workflowId === wf.id)
        .map(
          (c) =>
            c.quickAutomation ?? c.aiOpportunity ?? c.futureAutomation ?? "",
        )
        .filter(Boolean);

      return {
        id: wf.id,
        name: wf.name,
        purpose: wf.purpose,
        trigger: wf.trigger,
        owner: wf.owner,
        steps: wf.steps.map((s) => ({
          order: s.order,
          name: s.name,
          actor: s.actor,
          manual: s.manual,
          duration: s.estimatedDuration,
        })),
        approvals,
        actors,
        dependencies: deps,
        automationOpportunities: automation,
      };
    }),
    visualizationWorkflowIds: processes.workflows.map((w) => w.id),
    evidence: [
      { source: "process", id: processes.id, label: "Business Processes" },
      ...evidence.slice(0, 3),
    ],
  };
}
