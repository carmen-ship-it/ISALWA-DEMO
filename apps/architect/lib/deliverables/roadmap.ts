import { moduleLabel, opportunityHorizonLabel, phaseLabel } from "@/lib/presentation";
import type {
  CompanyWorkspace,
  DeliverableEvidenceRef,
  DeliverableRoadmapPhase,
  DevelopmentRoadmapDeliverable,
} from "@/types";

/**
 * Development roadmap from Solution Architecture phases (dependency-ordered).
 * Falls back to blueprint opportunity horizons when solution is absent.
 */
export function buildDevelopmentRoadmap(
  workspace: CompanyWorkspace,
  evidence: DeliverableEvidenceRef[],
): DevelopmentRoadmapDeliverable {
  const solution = workspace.solutionArchitecture;
  const blueprint = workspace.blueprints.find(
    (b) => b.id === workspace.currentBlueprintId,
  );

  let phases: DeliverableRoadmapPhase[] =
    solution?.roadmap
      .slice()
      .sort((a, b) => a.phase - b.phase)
      .map((p) => ({
        phase: p.phase,
        name: phaseLabel(p.name),
        goals: p.goals,
        modules: p.modules.map(moduleLabel),
        dependencies: p.dependencies,
        businessValue: p.businessValue,
        complexity: p.estimatedComplexity,
      })) ?? [];

  if (phases.length === 0) {
    const horizons = [
      "Quick Wins",
      "30-day Projects",
      "90-day Projects",
      "Strategic Initiatives",
    ] as const;
    phases = horizons.map((horizon, index) => {
      const items =
        blueprint?.opportunities
          .filter((o) => o.horizon === horizon)
          .map((o) => o.title) ?? [];
      const horizonEs = opportunityHorizonLabel(horizon);
      return {
        phase: index + 1,
        name: horizonEs,
        goals: items.length ? items : [`Avanzar en ${horizonEs.toLowerCase()}`],
        modules: blueprint?.modules.slice(0, 3).map((m) => moduleLabel(m.name)) ?? [],
        dependencies: index === 0 ? [] : [`Fase ${index}`],
        businessValue: `Progreso frente a ${horizonEs.toLowerCase()}`,
        complexity: index < 2 ? "moderate" : "high",
      };
    });
  }

  const future = [
    ...(solution?.aiAgents.map((a) => `IA: ${a.name}`) ?? []),
    ...(blueprint?.futureArchitecture.future.notes.slice(0, 4) ?? []),
    "Visualización continua de procesos y regeneración de entregables",
  ];

  return {
    kind: "development_roadmap",
    phases,
    future,
    evidence: evidence.slice(0, 4),
  };
}
