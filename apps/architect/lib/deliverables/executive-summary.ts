import { moduleLabel, phaseLabel } from "@/lib/presentation";
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
      (p) => `Fase ${p.phase}: ${phaseLabel(p.name)} — ${p.businessValue}`,
    ) ??
    report?.suggestedRoadmap.map((r) => phaseLabel(r.name)) ??
    ["Cimientos", "Operaciones centrales", "Automatización", "Asistencia de IA"];

  const investmentAreas = [
    ...(solution?.modules.slice(0, 5).map((m) => moduleLabel(m.name)) ?? []),
    ...(blueprint?.modules.slice(0, 3).map((m) => moduleLabel(m.name)) ?? []),
  ].filter((v, i, a) => a.indexOf(v) === i);

  const vision =
    report?.executiveSummary ??
    blueprint?.summary ??
    `Diseñar un sistema operativo para ${workspace.companyName} que reemplace herramientas frágiles por flujos de trabajo duraderos.`;

  const currentState =
    blueprint?.futureArchitecture.current.summary ??
    (consulting
      ? `Madurez ${Math.round(consulting.maturity.overall)}% · Salud ${Math.round(consulting.health.overall)}%`
      : null) ??
    `${workspace.companyName} está en etapa de ${workspace.currentStage} con ${workspace.businessUnderstanding}% de comprensión del negocio.`;

  const executiveRecommendation =
    consulting?.recommendations[0]?.title != null
      ? `${consulting.recommendations[0].title}. ${consulting.recommendations[0].rationale}`
      : `Priorizar ${recommendedRoadmap[0] ?? "cimientos"} mientras se reduce ${biggestRisks[0] ?? "el riesgo operativo"}.`;

  return {
    kind: "executive_summary",
    vision,
    currentState,
    problems: problems.length ? problems : ["Descubrimiento incompleto — problemas aún sin confirmar"],
    biggestRisks: biggestRisks.length ? biggestRisks : ["Perfil de riesgo incompleto"],
    immediateOpportunities: immediateOpportunities.length
      ? immediateOpportunities
      : ["Completar el descubrimiento para revelar victorias rápidas"],
    strategicOpportunities: strategicOpportunities.length
      ? strategicOpportunities
      : ["Oportunidades estratégicas pendientes de un descubrimiento más profundo"],
    recommendedRoadmap,
    investmentAreas: investmentAreas.length ? investmentAreas : ["Plataforma central"],
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
