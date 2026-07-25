import type {
  BusinessAssessmentDeliverable,
  CompanyWorkspace,
  DeliverableEvidenceRef,
} from "@/types";

export function buildBusinessAssessment(
  workspace: CompanyWorkspace,
  evidence: DeliverableEvidenceRef[],
): BusinessAssessmentDeliverable {
  const consulting = workspace.conversationMemory?.consulting;
  const processes = workspace.businessProcesses;
  const blueprint = workspace.blueprints.find(
    (b) => b.id === workspace.currentBlueprintId,
  );

  return {
    kind: "business_assessment",
    currentProcesses:
      processes?.workflows.map((w) => w.name) ??
      blueprint?.workflows.map((w) => w.name) ??
      [],
    departments:
      blueprint?.departments.map((d) => d.name) ??
      processes?.workflows
        .map((w) => w.department)
        .filter((d): d is string => d != null)
        .filter((v, i, a) => a.indexOf(v) === i) ??
      [],
    maturity:
      consulting?.maturity.dimensions.map((d) => ({
        dimension: d.label,
        score: d.score,
        confidence: d.confidence,
      })) ?? [],
    healthScores:
      consulting?.health.gauges.map((g) => ({
        dimension: g.label,
        score: g.score,
        confidence: g.confidence,
      })) ?? [],
    painPoints: [
      ...workspace.painPoints.map((p) => p.title),
      ...(blueprint?.painPoints.map((p) => p.title) ?? []),
    ].filter((v, i, a) => a.indexOf(v) === i),
    risks: (consulting?.risks ?? []).map((r) => ({
      title: r.title,
      severity: r.severity,
      impact: r.businessImpact,
    })),
    dependencies:
      processes?.dependencies.map(
        (d) => `${d.relationship} (${d.fromWorkflowId} → ${d.toWorkflowId})`,
      ) ?? [],
    automationOpportunities: [
      ...(processes?.automationCandidates
        .map((c) => c.quickAutomation ?? c.aiOpportunity ?? c.futureAutomation)
        .filter((x): x is string => x != null) ?? []),
      ...(consulting?.opportunities
        .filter((o) => /automat/i.test(o.title))
        .map((o) => o.title) ?? []),
    ].slice(0, 12),
    overallMaturity: consulting?.maturity.overall ?? null,
    overallHealth: consulting?.health.overall ?? null,
    evidence: evidence.slice(0, 6),
  };
}
