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
        title: `Base de ${mod.name}`,
        acceptanceCriteria: [
          `Existe el andamiaje del módulo ${mod.name}`,
          "Permisos por rol aplicados a los actores principales",
          "Eventos de auditoría registrados para crear/actualizar",
        ],
        priority,
        dependencies: phase?.dependencies ?? [],
      },
      ...relatedWorkflows.map((w) => ({
        id: createId("story"),
        title: `Flujo: ${w.name}`,
        acceptanceCriteria: [
          `El camino esperado de «${w.name}» se completa`,
          "Los traspasos conservan la información requerida",
          w.owner
            ? `El rol responsable (${w.owner}) puede operar el flujo`
            : "El rol responsable puede operar el flujo",
        ],
        priority,
        dependencies: [`Base de ${mod.name}`],
      })),
    ];

    return {
      id: createId("epic"),
      title: mod.name,
      features: [
        {
          id: createId("feature"),
          title: `Capacidad de ${mod.name}`,
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
