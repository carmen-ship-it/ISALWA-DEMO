import { createId } from "@/lib/utils";
import type {
  CompanyWorkspace,
  DeliverableEvidenceRef,
  DeliverableRoadmapPhase,
  SprintBacklogDeliverable,
} from "@/types";

export function buildSprintBacklog(
  workspace: CompanyWorkspace,
  phases: DeliverableRoadmapPhase[],
  evidence: DeliverableEvidenceRef[],
): SprintBacklogDeliverable {
  const solution = workspace.solutionArchitecture;
  const processes = workspace.businessProcesses;

  const moduleSource = solution?.modules.length
    ? solution.modules.map((m) => ({
        id: m.id,
        name: m.name,
        purpose: m.purpose,
      }))
    : workspace.modules.map((m) => ({
        id: m.id,
        name: m.name,
        purpose: m.purpose,
      }));

  const epics = moduleSource.slice(0, 10).map((mod, index) => {
    const phase = phases.find((p) =>
      p.modules.some((m) => m.toLowerCase() === mod.name.toLowerCase()),
    );
    const priority: "P0" | "P1" | "P2" | "P3" =
      index < 2 ? "P0" : index < 5 ? "P1" : index < 8 ? "P2" : "P3";

    const relatedWorkflows =
      processes?.workflows
        .filter((w) =>
          w.name.toLowerCase().includes(mod.name.toLowerCase().slice(0, 4)),
        )
        .slice(0, 2) ?? [];

    const stories = [
      {
        id: createId("story"),
        title: `Foundation for ${mod.name}`,
        acceptanceCriteria: [
          `${mod.name} module scaffold exists`,
          "Role permissions enforced for primary actors",
          "Audit events recorded for create/update",
        ],
        priority,
        dependencies: phase?.dependencies ?? [],
      },
      ...relatedWorkflows.map((w) => ({
        id: createId("story"),
        title: `Workflow: ${w.name}`,
        acceptanceCriteria: [
          `Happy path for “${w.name}” completes`,
          "Handoffs preserve required information",
          w.owner
            ? `Owner role (${w.owner}) can operate the flow`
            : "Owner role can operate the flow",
        ],
        priority,
        dependencies: [`Foundation for ${mod.name}`],
      })),
    ];

    return {
      id: createId("epic"),
      title: mod.name,
      features: [
        {
          id: createId("feature"),
          title: `${mod.name} capability`,
          stories,
        },
      ],
    };
  });

  return {
    kind: "sprint_backlog",
    epics,
    evidence: evidence.slice(0, 4),
  };
}
