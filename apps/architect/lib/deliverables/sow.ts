import type {
  CompanyWorkspace,
  DeliverableEvidenceRef,
  DeliverableRoadmapPhase,
  ImplementationPlanDeliverable,
} from "@/types";

/** SOW-style implementation plan — structured narrative, not a legal document export. */
export function buildImplementationPlan(
  workspace: CompanyWorkspace,
  phases: DeliverableRoadmapPhase[],
  evidence: DeliverableEvidenceRef[],
): ImplementationPlanDeliverable {
  const consulting = workspace.conversationMemory?.consulting;

  return {
    kind: "implementation_plan",
    phases: phases.map((p) => ({
      name: `Fase ${p.phase}: ${p.name}`,
      objectives: p.goals,
      workstreams: p.modules.map((m) => `Frente de trabajo de ${m}`),
      exitCriteria: [
        `Módulos en vivo: ${p.modules.join(", ") || "módulos definidos"}`,
        `Valor de negocio alcanzado: ${p.businessValue}`,
        "Aprobación de los interesados sobre los criterios de aceptación",
      ],
    })),
    dependencies: phases.flatMap((p) => p.dependencies),
    risks: (consulting?.risks ?? [])
      .slice(0, 6)
      .map((r) => `${r.title} — ${r.recommendedMitigation}`),
    evidence: evidence.slice(0, 4),
  };
}

export function buildSow(
  workspace: CompanyWorkspace,
  phases: DeliverableRoadmapPhase[],
  evidence: DeliverableEvidenceRef[],
): ImplementationPlanDeliverable {
  return buildImplementationPlan(workspace, phases, evidence);
}
