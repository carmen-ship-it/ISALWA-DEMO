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
      name: `Phase ${p.phase}: ${p.name}`,
      objectives: p.goals,
      workstreams: p.modules.map((m) => `${m} workstream`),
      exitCriteria: [
        `Modules live: ${p.modules.join(", ") || "scoped modules"}`,
        `Business value realized: ${p.businessValue}`,
        "Stakeholder sign-off on acceptance criteria",
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
