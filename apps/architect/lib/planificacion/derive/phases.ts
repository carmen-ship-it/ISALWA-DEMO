import type { CompanyWorkspace, PlanificacionDerivedPhase } from "@/types";
import { stableKeyFor } from "./helpers";

export function derivePhases(workspace: CompanyWorkspace): PlanificacionDerivedPhase[] {
  const phases: PlanificacionDerivedPhase[] = [];
  const solution = workspace.solutionArchitecture;

  for (const phase of solution?.roadmap ?? []) {
    const stableKey = stableKeyFor("phase", `solution-${phase.id}`);
    phases.push({
      id: phase.id,
      stableKey,
      phase: phase.phase,
      name: phase.name,
      summary: phase.businessValue,
      goals: phase.goals,
      modules: [...phase.modules],
      dependencies: [...phase.dependencies],
      confidence: phase.confidence,
      sourceEngines: ["solution"],
    });
  }

  const roadmap = workspace.deliverables?.developmentRoadmap;
  for (const phase of roadmap?.phases ?? []) {
    const stableKey = stableKeyFor("phase", `deliverable-roadmap-${phase.phase}-${phase.name}`);
    if (phases.some((p) => p.stableKey === stableKey)) continue;
    phases.push({
      id: stableKey,
      stableKey,
      phase: phase.phase,
      name: phase.name,
      summary: phase.businessValue,
      goals: [...phase.goals],
      modules: [...phase.modules],
      dependencies: [...phase.dependencies],
      confidence: 0.65,
      sourceEngines: ["deliverables"],
    });
  }

  const implPlan = workspace.deliverables?.implementationPlan;
  const implPhases = implPlan?.phases ?? [];
  const implDependencies = implPlan?.dependencies ?? [];
  for (let index = 0; index < implPhases.length; index++) {
    const phase = implPhases[index];
    const stableKey = stableKeyFor("phase", `deliverable-impl-${index}-${phase.name}`);
    if (phases.some((p) => p.stableKey === stableKey)) continue;
    phases.push({
      id: stableKey,
      stableKey,
      phase: index + 1,
      name: phase.name,
      summary: phase.objectives.join(" · "),
      goals: [...phase.objectives],
      modules: [...phase.workstreams],
      dependencies: [...implDependencies],
      confidence: 0.6,
      sourceEngines: ["deliverables"],
    });
  }

  return phases.sort((a, b) => a.phase - b.phase);
}
