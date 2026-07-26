/**
 * Executive Experience — Mission 9.5 presentation derivation.
 * Mission 13 attaches the living ExecutiveCockpit (daily home).
 * No new engines. Pure projection of existing workspace models.
 * Never falls back to seed/mock recommendations or modules.
 */

import type {
  CompanyWorkspace,
  ProcessRiskLevel,
  SolutionModule,
} from "@/types";
import { deriveExecutiveCockpit } from "./cockpit";
import type { ExecutiveCockpit } from "./types";

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
  expectedRoi: "High" | "Moderate" | "Strategic" | null;
  priority: string | null;
  phase: string | null;
  confidence: number;
  businessValue: string | null;
  departments: string[];
}

export interface ReasoningCard {
  id: string;
  question: string;
  subject: string;
  evidence: string[];
  confidence: number;
  priority: string | null;
  businessValue: string | null;
  departments: string[];
  phase: string | null;
}

export interface ProcessInsightCard {
  id: string;
  name: string;
  purpose: string;
  priority: string | null;
  confidence: number;
  businessValue: string | null;
  evidence: string[];
  departments: string[];
  phase: string | null;
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
  topOpportunities: string[];
  aiReadiness: number | null;
  executiveRecommendation: string | null;
}

export interface AnimatedBlueprintModel {
  departments: string[];
  modules: Array<{ id: string; name: string; purpose: string }>;
  connections: Array<{ from: string; to: string }>;
}

export interface ExecutiveExperienceModel {
  journey: JourneyStage[];
  dashboard: ExecutiveDashboardModel;
  /** Mission 13 — living daily cockpit assembled from existing packs. */
  cockpit: ExecutiveCockpit;
  modules: ModuleInsightCard[];
  reasoning: ReasoningCard[];
  processes: ProcessInsightCard[];
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
      label: "Entrevista",
      detail:
        meetings > 0
          ? `${meetings} sesión${meetings === 1 ? "" : "es"} de descubrimiento registrada${meetings === 1 ? "" : "s"}`
          : "Listo para la primera sesión de descubrimiento",
      complete: meetings > 0 || workspace.businessUnderstanding > 0,
    },
    {
      id: "learned",
      label: "Negocio comprendido",
      detail:
        workspace.businessUnderstanding >= 40
          ? "Comprensión del negocio en buen camino"
          : "Aún mapeando cómo opera la empresa",
      complete: workspace.businessUnderstanding >= 40,
    },
    {
      id: "problems",
      label: "Problemas identificados",
      detail:
        workspace.painPoints.length > 0
          ? `${workspace.painPoints.length} punto${workspace.painPoints.length === 1 ? "" : "s"} de dolor con evidencia`
          : "Los dolores emergen conforme profundiza el descubrimiento",
      complete: workspace.painPoints.length > 0,
    },
    {
      id: "architecture",
      label: "Arquitectura generada",
      detail: solution
        ? `${solution.modules.length} capacidades recomendadas`
        : blueprint
          ? "Blueprint de negocio disponible"
          : "Pendiente de blueprint de negocio",
      complete: solution != null || blueprint != null,
    },
    {
      id: "recommended",
      label: "Software recomendado",
      detail: workspace.deliverables
        ? "Paquete de consultoría listo"
        : (solution?.modules.length ?? 0) > 0
          ? `${solution!.modules.length} capacidades sugeridas con evidencia`
          : "Las recomendaciones evolucionan con evidencia",
      complete:
        workspace.deliverables != null || (solution?.modules.length ?? 0) > 0,
    },
  ];

  const topRisk = consulting?.risks
    .slice()
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))[0];

  const quickWins = (consulting?.opportunities ?? [])
    .filter((o) => o.horizon === "Quick Wins" || o.horizon === "30-day")
    .slice(0, 4)
    .map((o) => o.title);

  const topOpportunities = (consulting?.opportunities ?? [])
    .slice()
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 4)
    .map((o) => o.title);

  const priorities = (consulting?.recommendations ?? [])
    .filter((r) => r.priority === "now" || r.priority === "next")
    .slice(0, 4)
    .map((r) => r.title);

  const investmentAreas = solution?.modules.slice(0, 5).map((m) => m.name) ?? [];

  const estimatedPhases =
    solution?.roadmap.map((p) => `Fase ${p.phase}: ${p.name}`) ?? [];

  const aiDimension = consulting?.health.gauges.find(
    (d) => d.id === "ai_readiness",
  );

  const executiveRecommendation =
    consulting?.recommendations.find((r) => r.priority === "now")?.rationale ??
    workspace.deliverables?.executiveSummary.executiveRecommendation ??
    null;

  const dashboard: ExecutiveDashboardModel = {
    businessUnderstanding: workspace.businessUnderstanding,
    maturity: consulting?.maturity.overall ?? null,
    health: consulting?.health.overall ?? null,
    topRisk: topRisk?.title ?? null,
    riskLevel: (topRisk?.severity as ProcessRiskLevel | undefined) ?? "unknown",
    priorities,
    quickWins,
    investmentAreas,
    estimatedPhases,
    consultingConfidence: consulting?.confidence.overall ?? null,
    topOpportunities,
    aiReadiness: aiDimension?.score ?? null,
    executiveRecommendation,
  };

  const modules = buildModuleCards(workspace, solution?.modules ?? []);
  const reasoning = buildReasoningCards(workspace);
  const processes = buildProcessCards(workspace);

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
    meetings <= 1 ? "Día 1" : meetings === 2 ? "Día 2" : `Día ${meetings}`;

  return {
    journey,
    dashboard,
    cockpit: deriveExecutiveCockpit(workspace),
    modules,
    reasoning,
    processes,
    blueprint: animated,
    dayLabel,
  };
}

function buildModuleCards(
  workspace: CompanyWorkspace,
  solutionModules: SolutionModule[],
): ModuleInsightCard[] {
  if (solutionModules.length === 0) return [];

  const pains = workspace.painPoints;
  const blueprint = workspace.blueprints.find(
    (b) => b.id === workspace.currentBlueprintId,
  );

  return solutionModules.slice(0, 6).map((mod, index) => {
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
          : [];

    const phaseEntry = workspace.solutionArchitecture?.roadmap.find((p) =>
      p.modules.some((n) => n.toLowerCase() === mod.name.toLowerCase()),
    );

    const deptNames =
      blueprint?.departments
        .filter((d) => {
          const caps =
            blueprint.capabilities
              .filter((c) => d.capabilityIds.includes(c.id))
              .map((c) => c.name)
              .join(" ") ?? "";
          return matchesModule(mod.name, caps);
        })
        .map((d) => d.name) ?? [];

    return {
      id: mod.id,
      name: mod.name,
      why,
      expectedRoi: phaseEntry?.businessValue
        ? index < 2
          ? "High"
          : index < 4
            ? "Moderate"
            : "Strategic"
        : null,
      priority: phaseEntry ? `Fase ${phaseEntry.phase}` : null,
      phase: phaseEntry ? `Fase ${phaseEntry.phase}` : null,
      confidence: mod.confidence,
      businessValue: phaseEntry?.businessValue ?? mod.purpose,
      departments: deptNames,
    };
  });
}

function buildReasoningCards(workspace: CompanyWorkspace): ReasoningCard[] {
  const consulting = workspace.conversationMemory?.consulting;
  if (!consulting) return [];

  return consulting.recommendations
    .filter((rec) => rec.evidence.length > 0 || rec.rationale)
    .slice(0, 6)
    .map((rec) => ({
      id: rec.id,
      question: "¿Por qué recomendamos",
      subject: stripRecommendVerb(rec.title),
      evidence:
        rec.evidence.length > 0
          ? rec.evidence.slice(0, 4)
          : [rec.rationale],
      confidence: consulting.confidence.overall,
      priority: rec.priority,
      businessValue: rec.rationale,
      departments: [],
      phase: null,
    }));
}

function buildProcessCards(workspace: CompanyWorkspace): ProcessInsightCard[] {
  const processes = workspace.businessProcesses;
  if (!processes) return [];

  return processes.workflows.slice(0, 6).map((wf) => ({
    id: wf.id,
    name: wf.name,
    purpose: wf.purpose,
    priority: null,
    confidence: processes.overallConfidence ?? 0.7,
    businessValue: wf.purpose,
    evidence: wf.steps.slice(0, 3).map((s) => `${s.name} · ${s.actor}`),
    departments: wf.department ? [wf.department] : [],
    phase: null,
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
    .replace(/^(recommend|implement|build|add|introduce|recomendar|implementar)\s+/i, "")
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
