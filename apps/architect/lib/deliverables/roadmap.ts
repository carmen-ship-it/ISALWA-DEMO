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
        name: p.name,
        goals: p.goals,
        modules: [...p.modules],
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
      return {
        phase: index + 1,
        name: horizon,
        goals: items.length ? items : [`Advance ${horizon.toLowerCase()}`],
        modules: blueprint?.modules.slice(0, 3).map((m) => m.name) ?? [],
        dependencies: index === 0 ? [] : [`Phase ${index}`],
        businessValue: `Progress against ${horizon}`,
        complexity: index < 2 ? "moderate" : "high",
      };
    });
  }

  const future = [
    ...(solution?.aiAgents.map((a) => `AI: ${a.name}`) ?? []),
    ...(blueprint?.futureArchitecture.future.notes.slice(0, 4) ?? []),
    "Continuous process visualization and deliverable regeneration",
  ];

  return {
    kind: "development_roadmap",
    phases,
    future,
    evidence: evidence.slice(0, 4),
  };
}
