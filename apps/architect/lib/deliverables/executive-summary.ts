import type {
  CompanyWorkspace,
  DeliverableEvidenceRef,
  ExecutiveSummaryDeliverable,
} from "@/types";

export function buildExecutiveSummary(
  workspace: CompanyWorkspace,
  evidence: DeliverableEvidenceRef[],
): ExecutiveSummaryDeliverable {
  const consulting = workspace.conversationMemory?.consulting;
  const blueprint = workspace.blueprints.find(
    (b) => b.id === workspace.currentBlueprintId,
  );
  const solution = workspace.solutionArchitecture;
  const report = workspace.currentReport;

  const problems = [
    ...workspace.painPoints.slice(0, 6).map((p) => p.title),
    ...(blueprint?.painPoints.slice(0, 4).map((p) => p.title) ?? []),
  ].filter((v, i, a) => a.indexOf(v) === i);

  const biggestRisks = (consulting?.risks ?? [])
    .slice()
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
    .slice(0, 5)
    .map((r) => r.title);

  const immediateOpportunities = (consulting?.opportunities ?? [])
    .filter((o) => o.horizon === "Quick Wins" || o.horizon === "30-day")
    .slice(0, 5)
    .map((o) => o.title);

  const strategicOpportunities = (consulting?.opportunities ?? [])
    .filter((o) => o.horizon === "strategic" || o.horizon === "1-year" || o.horizon === "6-month")
    .slice(0, 5)
    .map((o) => o.title);

  const recommendedRoadmap =
    solution?.roadmap.map(
      (p) => `Phase ${p.phase}: ${p.name} — ${p.businessValue}`,
    ) ??
    report?.suggestedRoadmap.map((r) => r.name) ??
    ["Foundation", "Core operations", "Automation", "AI assistance"];

  const investmentAreas = [
    ...(solution?.modules.slice(0, 5).map((m) => m.name) ?? []),
    ...(blueprint?.modules.slice(0, 3).map((m) => m.name) ?? []),
  ].filter((v, i, a) => a.indexOf(v) === i);

  const vision =
    report?.executiveSummary ??
    blueprint?.summary ??
    `Design an operating system for ${workspace.companyName} that replaces fragile tools with durable workflows.`;

  const currentState =
    blueprint?.futureArchitecture.current.summary ??
    (consulting
      ? `Maturity ${Math.round(consulting.maturity.overall * 100)}% · Health ${Math.round(consulting.health.overall * 100)}%`
      : null) ??
    `${workspace.companyName} is in ${workspace.currentStage} with ${workspace.businessUnderstanding}% business understanding.`;

  const executiveRecommendation =
    consulting?.recommendations[0]?.title != null
      ? `${consulting.recommendations[0].title}. ${consulting.recommendations[0].rationale}`
      : `Prioritize ${recommendedRoadmap[0] ?? "foundation"} while reducing ${biggestRisks[0] ?? "operational risk"}.`;

  return {
    kind: "executive_summary",
    vision,
    currentState,
    problems: problems.length ? problems : ["Discovery incomplete — problems not yet confirmed"],
    biggestRisks: biggestRisks.length ? biggestRisks : ["Risk profile incomplete"],
    immediateOpportunities: immediateOpportunities.length
      ? immediateOpportunities
      : ["Complete discovery to surface quick wins"],
    strategicOpportunities: strategicOpportunities.length
      ? strategicOpportunities
      : ["Strategic opportunities pending deeper discovery"],
    recommendedRoadmap,
    investmentAreas: investmentAreas.length ? investmentAreas : ["Core platform"],
    executiveRecommendation,
    evidence: evidence.slice(0, 6),
  };
}

function severityRank(s: string): number {
  const map: Record<string, number> = {
    critical: 4,
    high: 3,
    moderate: 2,
    low: 1,
  };
  return map[s] ?? 0;
}
