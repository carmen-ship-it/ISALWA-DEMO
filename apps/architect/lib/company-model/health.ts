import type {
  CompanyDependency,
  CompanyInformationFlow,
  CompanyModelEvidenceRef,
  CompanyModelHealth,
  CompanyOwnership,
  CompanyWorkspace,
} from "@/types";

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function deriveCompanyModelHealth(
  workspace: CompanyWorkspace,
  ownership: CompanyOwnership[],
  dependencies: CompanyDependency[],
  informationFlows: CompanyInformationFlow[],
  evidence: CompanyModelEvidenceRef[],
): CompanyModelHealth {
  const consulting = workspace.conversationMemory?.consulting;
  const healthOverall = consulting?.health?.overall ?? null;
  const coverageAvg =
    workspace.knowledge?.coverage.length
      ? workspace.knowledge.coverage.reduce((s, c) => s + c.percent, 0) /
        workspace.knowledge.coverage.length
      : workspace.businessUnderstanding;

  const ownedWorkflows = ownership.filter((o) => o.kind === "workflow").length;
  const totalWorkflows = workspace.businessProcesses?.workflows.length ?? 0;
  const ownershipClarity =
    totalWorkflows === 0
      ? ownership.length > 0
        ? 55
        : 30
      : clamp((ownedWorkflows / totalWorkflows) * 100);

  const criticalDeps = dependencies.filter(
    (d) => d.criticality === "critical" || d.criticality === "high",
  ).length;
  const dependencyRisk = clamp(100 - criticalDeps * 12);

  const missingInfoFlows = informationFlows.filter(
    (f) => f.missingInformation.length > 0,
  ).length;
  const informationClarity =
    informationFlows.length === 0
      ? 40
      : clamp(
          100 - (missingInfoFlows / informationFlows.length) * 55,
        );

  const coverageScore = clamp(coverageAvg);
  const overallScore = clamp(
    (healthOverall ?? coverageScore) * 0.35 +
      ownershipClarity * 0.25 +
      dependencyRisk * 0.2 +
      informationClarity * 0.2,
  );

  const band =
    overallScore >= 75
      ? "strong"
      : overallScore >= 55
        ? "adequate"
        : overallScore >= 35
          ? "fragile"
          : "unknown";

  const notes: string[] = [];
  if (criticalDeps > 0) {
    notes.push(
      `${criticalDeps} critical/high dependencies require executive attention.`,
    );
  }
  if (ownershipClarity < 50) {
    notes.push("Ownership clarity is incomplete across workflows and capabilities.");
  }
  if (missingInfoFlows > 0) {
    notes.push(
      `${missingInfoFlows} information handoffs report missing inputs.`,
    );
  }
  if (notes.length === 0) {
    notes.push("Operating model coverage is directionally healthy from current evidence.");
  }

  return {
    band,
    overallScore,
    coverageScore,
    ownershipClarity,
    dependencyRisk,
    informationClarity,
    notes,
    confidence: evidence.length >= 4 ? 0.78 : 0.55,
    evidence: evidence.slice(0, 4),
  };
}
