/**
 * Executive Experience — Mission 9.5 presentation derivation.
 * No new engines. Pure projection of existing workspace models.
 */

import type {
  CompanyWorkspace,
  ProcessRiskLevel,
  SolutionModule,
} from "@/types";

export type JourneyStageId =
  | "interview"
  | "learned"
  | "problems"
  | "architecture"
  | "recommended";

export interface JourneyStage {
  id: JourneyStageId;
  label: string;
  detail: string;
  complete: boolean;
}

export interface ModuleInsightCard {
  id: string;
  name: string;
  why: string[];
  expectedRoi: "High" | "Moderate" | "Strategic";
  priority: string;
  phase: string;
  confidence: number;
}

export interface ReasoningCard {
  id: string;
  question: string;
  subject: string;
  evidence: string[];
  confidence: number;
}

export interface ExecutiveDashboardModel {
  businessUnderstanding: number;
  maturity: number | null;
  health: number | null;
  topRisk: string | null;
  riskLevel: ProcessRiskLevel | "unknown";
  priorities: string[];
  quickWins: string[];
  investmentAreas: string[];
  estimatedPhases: string[];
  consultingConfidence: number | null;
}

export interface AnimatedBlueprintModel {
  departments: string[];
  modules: Array<{ id: string; name: string; purpose: string }>;
  connections: Array<{ from: string; to: string }>;
}

export interface ExecutiveExperienceModel {
  journey: JourneyStage[];
  dashboard: ExecutiveDashboardModel;
  modules: ModuleInsightCard[];
  reasoning: ReasoningCard[];
  blueprint: AnimatedBlueprintModel;
  dayLabel: string;
}

export function deriveExecutiveExperience(
  workspace: CompanyWorkspace,
): ExecutiveExperienceModel {
  const consulting = workspace.conversationMemory?.consulting;
  const solution = workspace.solutionArchitecture;
  const blueprint = workspace.blueprints.find(
    (b) => b.id === workspace.currentBlueprintId,
  );
  const meetings = workspace.meetings.length;

  const journey: JourneyStage[] = [
    {
      id: "interview",
      label: "Interview",
      detail:
        meetings > 0
          ? `${meetings} discovery session${meetings === 1 ? "" : "s"} captured`
          : "Ready for first discovery session",
      complete: meetings > 0 || workspace.businessUnderstanding > 0,
    },
    {
      id: "learned",
      label: "Business learned",
      detail:
        workspace.businessUnderstanding >= 40
          ? `${workspace.businessUnderstanding}% business understanding`
          : "Still mapping how the company operates",
      complete: workspace.businessUnderstanding >= 40,
    },
    {
      id: "problems",
      label: "Problems identified",
      detail:
        workspace.painPoints.length > 0
          ? `${workspace.painPoints.length} pain points evidenced`
          : "Pains surface as discovery deepens",
      complete: workspace.painPoints.length > 0,
    },
    {
      id: "architecture",
      label: "Architecture generated",
      detail: solution
        ? `${solution.modules.length} modules · Blueprint v${solution.blueprintVersion}`
        : blueprint
          ? `Blueprint v${blueprint.version} ready`
          : "Awaiting Business Blueprint",
      complete: solution != null || blueprint != null,
    },
    {
      id: "recommended",
      label: "Software recommended",
      detail: workspace.deliverables
        ? "Consulting package ready"
        : workspace.modules.length > 0
          ? `${workspace.modules.length} modules suggested`
          : "Recommendations evolve with evidence",
      complete:
        workspace.deliverables != null ||
        (solution?.modules.length ?? 0) > 0 ||
        workspace.modules.length > 0,
    },
  ];

  const topRisk = consulting?.risks
    .slice()
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))[0];

  const quickWins = (consulting?.opportunities ?? [])
    .filter((o) => o.horizon === "Quick Wins" || o.horizon === "30-day")
    .slice(0, 4)
    .map((o) => o.title);

  const priorities = (consulting?.recommendations ?? [])
    .filter((r) => r.priority === "now" || r.priority === "next")
    .slice(0, 4)
    .map((r) => r.title);

  const investmentAreas =
    solution?.modules.slice(0, 5).map((m) => m.name) ??
    workspace.modules.slice(0, 5).map((m) => m.name);

  const estimatedPhases =
    solution?.roadmap.map((p) => `Phase ${p.phase}: ${p.name}`) ??
    workspace.currentReport?.suggestedRoadmap.map((p) => p.name) ??
    [];

  const dashboard: ExecutiveDashboardModel = {
    businessUnderstanding: workspace.businessUnderstanding,
    maturity: consulting?.maturity.overall ?? null,
    health: consulting?.health.overall ?? null,
    topRisk: topRisk?.title ?? null,
    riskLevel: (topRisk?.severity as ProcessRiskLevel | undefined) ?? "unknown",
    priorities: priorities.length
      ? priorities
      : workspace.recommendations.slice(0, 4).map((r) => r.title),
    quickWins: quickWins.length
      ? quickWins
      : workspace.opportunities.slice(0, 4).map((o) => o.title),
    investmentAreas,
    estimatedPhases,
    consultingConfidence: consulting?.confidence.overall ?? null,
  };

  const modules = buildModuleCards(workspace, solution?.modules ?? []);
  const reasoning = buildReasoningCards(workspace);
  const animated: AnimatedBlueprintModel = {
    departments:
      blueprint?.departments.map((d) => d.name) ??
      solution?.departments ??
      [],
    modules: (solution?.modules ?? []).slice(0, 8).map((m) => ({
      id: m.id,
      name: m.name,
      purpose: m.purpose,
    })),
    connections: (solution?.relationships ?? []).slice(0, 10).map((r) => ({
      from: r.fromEntity,
      to: r.toEntity,
    })),
  };

  const dayLabel =
    meetings <= 1 ? "Day 1" : meetings === 2 ? "Day 2" : `Day ${meetings}`;

  return {
    journey,
    dashboard,
    modules,
    reasoning,
    blueprint: animated,
    dayLabel,
  };
}

function buildModuleCards(
  workspace: CompanyWorkspace,
  solutionModules: SolutionModule[],
): ModuleInsightCard[] {
  const pains = workspace.painPoints;
  const source =
    solutionModules.length > 0
      ? solutionModules.map((m, index) => ({
          id: m.id,
          name: m.name,
          purpose: m.purpose,
          confidence: m.confidence,
          index,
        }))
      : workspace.modules.map((m, index) => ({
          id: m.id,
          name: m.name,
          purpose: m.purpose,
          confidence: 0.72,
          index,
        }));

  return source.slice(0, 6).map((mod) => {
    const relatedPains = pains
      .filter((p) =>
        matchesModule(mod.name, `${p.title} ${p.description} ${p.category}`),
      )
      .slice(0, 3)
      .map((p) => p.title);

    const why =
      relatedPains.length > 0
        ? relatedPains
        : mod.purpose
          ? [mod.purpose]
          : [`Evidence points to a ${mod.name} capability gap`];

    const phase =
      workspace.solutionArchitecture?.roadmap.find((p) =>
        p.modules.some((n) => n.toLowerCase() === mod.name.toLowerCase()),
      );

    return {
      id: mod.id,
      name: mod.name,
      why,
      expectedRoi:
        mod.index < 2 ? "High" : mod.index < 4 ? "Moderate" : "Strategic",
      priority: phase
        ? `Phase ${phase.phase}`
        : mod.index < 2
          ? "Phase 1"
          : mod.index < 4
            ? "Phase 2"
            : "Later",
      phase: phase ? `Phase ${phase.phase}` : mod.index < 2 ? "Phase 1" : "Later",
      confidence: mod.confidence,
    };
  });
}

function buildReasoningCards(workspace: CompanyWorkspace): ReasoningCard[] {
  const consulting = workspace.conversationMemory?.consulting;
  const fromConsulting = (consulting?.recommendations ?? []).slice(0, 4).map(
    (rec) => ({
      id: rec.id,
      question: `Why did I recommend`,
      subject: stripRecommendVerb(rec.title),
      evidence:
        rec.evidence.length > 0
          ? rec.evidence.slice(0, 4)
          : [rec.rationale],
      confidence: consulting?.confidence.overall ?? 0.8,
    }),
  );

  if (fromConsulting.length > 0) return fromConsulting;

  return workspace.recommendations.slice(0, 4).map((rec) => ({
    id: rec.id,
    question: "Why did I recommend",
    subject: stripRecommendVerb(rec.title),
    evidence:
      rec.relatedPainPoints.length > 0
        ? rec.relatedPainPoints.slice(0, 4)
        : [rec.rationale],
    confidence: 0.75,
  }));
}

function matchesModule(moduleName: string, blob: string): boolean {
  const n = moduleName.toLowerCase();
  const b = blob.toLowerCase();
  if (b.includes(n)) return true;
  const aliases: Record<string, RegExp> = {
    crm: /customer|crm|lead|pipeline|sales/i,
    sales: /sales|quote|order|pipeline/i,
    purchasing: /purchas|supplier|vendor|po\b/i,
    inventory: /inventor|stock|warehouse|sku/i,
    finance: /financ|invoice|collect|account/i,
    production: /product|manufactur|shop floor/i,
    collections: /collect|receivable|ar\b/i,
    hr: /\bhr\b|people|employee/i,
  };
  const re = aliases[n];
  return re ? re.test(b) : false;
}

function stripRecommendVerb(title: string): string {
  return title
    .replace(/^(recommend|implement|build|add|introduce)\s+/i, "")
    .replace(/\?$/, "")
    .trim() || title;
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
