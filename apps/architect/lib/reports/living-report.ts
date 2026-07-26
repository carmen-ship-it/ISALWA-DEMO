import type {
  DepartmentAnalysis,
  DiscoveryReport,
  Module,
  Workflow,
} from "@/types";

/**
 * Living report — evolves across meetings.
 * Does not regenerate from absolute zero when prior report exists.
 * McKinsey tone preserved; evidence from the latest interview wins on conflict.
 */
export function evolveLivingReport(
  prior: DiscoveryReport | null,
  next: DiscoveryReport,
): DiscoveryReport {
  if (!prior) return next;

  return {
    ...next,
    id: prior.id,
    generatedAt: next.generatedAt,
    executiveSummary: preferRicher(prior.executiveSummary, next.executiveSummary),
    businessSnapshot: preferRicher(prior.businessSnapshot, next.businessSnapshot),
    companySummary: preferRicher(prior.companySummary, next.companySummary),
    currentWorkflow: mergeWorkflows(prior.currentWorkflow, next.currentWorkflow),
    currentSystems: uniqueStrings([
      ...prior.currentSystems,
      ...next.currentSystems,
    ]),
    risks: uniqueStrings([...prior.risks, ...next.risks]),
    operationalBottlenecks: uniqueStrings([
      ...prior.operationalBottlenecks,
      ...next.operationalBottlenecks,
    ]),
    departmentAnalysis: mergeDepartments(
      prior.departmentAnalysis,
      next.departmentAnalysis,
    ),
    softwareRecommendations: uniqueStrings([
      ...prior.softwareRecommendations,
      ...next.softwareRecommendations,
    ]),
    painPoints: mergeByTitle(prior.painPoints, next.painPoints),
    opportunities: mergeByTitle(prior.opportunities, next.opportunities),
    potentialModules: mergeModules(prior.potentialModules, next.potentialModules),
    suggestedRoadmap:
      next.suggestedRoadmap.length > 0
        ? next.suggestedRoadmap
        : prior.suggestedRoadmap,
    estimatedPhases:
      next.estimatedPhases.length > 0
        ? next.estimatedPhases
        : prior.estimatedPhases,
    estimatedComplexity: next.estimatedComplexity,
    estimatedTimeline: next.estimatedTimeline,
    riskAreas: uniqueStrings([...prior.riskAreas, ...next.riskAreas]),
    aiOpportunities: uniqueStrings([
      ...prior.aiOpportunities,
      ...next.aiOpportunities,
    ]),
    futureIntegrations: uniqueStrings([
      ...prior.futureIntegrations,
      ...next.futureIntegrations,
    ]),
    unansweredQuestions: next.unansweredQuestions.length
      ? next.unansweredQuestions
      : prior.unansweredQuestions,
    executiveConclusion: preferRicher(
      prior.executiveConclusion,
      next.executiveConclusion,
    ),
  };
}

function preferRicher(a: string, b: string): string {
  if (!a.trim()) return b;
  if (!b.trim()) return a;
  return b.length >= a.length * 0.7 ? b : `${b}\n\n(Contexto anterior conservado.) ${a}`;
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const key = value.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

function mergeWorkflows(prior: Workflow[], next: Workflow[]): Workflow[] {
  const map = new Map<string, Workflow>();
  for (const item of prior) map.set(item.name.toLowerCase(), item);
  for (const item of next) map.set(item.name.toLowerCase(), item);
  return [...map.values()];
}

function mergeModules(prior: Module[], next: Module[]): Module[] {
  const map = new Map<string, Module>();
  for (const item of prior) map.set(item.name.toLowerCase(), item);
  for (const item of next) map.set(item.name.toLowerCase(), item);
  return [...map.values()];
}

function mergeDepartments(
  prior: DepartmentAnalysis[],
  next: DepartmentAnalysis[],
): DepartmentAnalysis[] {
  const map = new Map<string, DepartmentAnalysis>();
  for (const item of prior) map.set(item.department.toLowerCase(), item);
  for (const item of next) map.set(item.department.toLowerCase(), item);
  return [...map.values()];
}

function mergeByTitle<T extends { id: string; title: string }>(
  prior: T[],
  next: T[],
): T[] {
  const map = new Map<string, T>();
  for (const item of prior) map.set(item.title.toLowerCase(), item);
  for (const item of next) map.set(item.title.toLowerCase(), item);
  return [...map.values()];
}
