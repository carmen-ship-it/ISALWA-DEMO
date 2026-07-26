/**
 * 1. Business DNA — seven evidence-derived traits.
 * Reuses `ConsultingIntelligence.maturity` (lib/consulting/maturity.ts) and
 * `ConsultingIntelligence.risks` (lib/consulting/risk.ts) already computed
 * on the workspace's ConversationMemory. Never scores anything new — only
 * narrates what those engines already found, in executive Spanish.
 *
 * `evaluateMaturity` always fills a dimension's evidence with a canned
 * fallback string when it found nothing real — `realDimensionEvidence`
 * strips that placeholder so a trait only appears when there is a genuine
 * signal (a real risk pattern or real dimension evidence).
 */

import { strengthBand } from "@/lib/presentation";
import type { CompanyWorkspace, MaturityDimension } from "@/types";
import {
  consultingOf,
  evidence,
  hasRiskPattern,
  realDimensionEvidence,
  riskEvidence,
} from "./shared";
import type { BusinessDnaTrait, InsightEvidence } from "./types";

function bandToStrength(score: number): BusinessDnaTrait["strength"] {
  switch (strengthBand(score, "percent")) {
    case "High":
      return "alta";
    case "Medium":
      return "media";
    case "Low":
      return "baja";
    default:
      return "emergente";
  }
}

export function deriveBusinessDna(workspace: CompanyWorkspace): BusinessDnaTrait[] {
  const consulting = consultingOf(workspace);
  const traits: BusinessDnaTrait[] = [];

  const dimension = (id: MaturityDimension) =>
    consulting?.maturity.dimensions.find((d) => d.id === id) ?? null;

  const realEvidence = (id: MaturityDimension) =>
    realDimensionEvidence(dimension(id)?.evidence ?? []);

  const dimensionEvidence = (
    id: MaturityDimension,
    kind: "known_fact" | "pain_point" = "known_fact",
  ): InsightEvidence[] =>
    realEvidence(id).map((quote, i) => evidence(kind, `${id}_${i}`, quote, quote));

  // Decision Speed
  const leadership = dimension("leadership");
  const leadershipEvidence = realEvidence("leadership");
  const singleOwner = hasRiskPattern(consulting, "single_employee_owns_everything");
  const manualApprovals = hasRiskPattern(consulting, "manual_approvals");
  if (leadership && (leadershipEvidence.length > 0 || singleOwner || manualApprovals)) {
    const slow = Boolean(singleOwner || manualApprovals);
    traits.push({
      id: "decision_speed",
      label: "Velocidad de decisión",
      observation: slow
        ? "Las decisiones importantes pasan por una sola persona o por aprobaciones informales, lo que alarga los tiempos de respuesta."
        : "El liderazgo cuenta con evidencia de toma de decisiones distribuida, sin depender de un único cuello de botella.",
      evidence: [
        ...dimensionEvidence("leadership"),
        ...(singleOwner ? riskEvidence(singleOwner) : []),
        ...(manualApprovals ? riskEvidence(manualApprovals) : []),
      ].slice(0, 4),
      strength: slow ? "baja" : bandToStrength(leadership.score),
    });
  }

  // Approval Culture
  if (manualApprovals) {
    traits.push({
      id: "approval_culture",
      label: "Cultura de aprobación",
      observation:
        "Las aprobaciones son informales y concentradas — no hay umbrales ni respaldos definidos.",
      evidence: riskEvidence(manualApprovals),
      strength: "baja",
    });
  } else {
    const financeEvidence = realEvidence("finance");
    if (financeEvidence.length > 0) {
      traits.push({
        id: "approval_culture",
        label: "Cultura de aprobación",
        observation:
          "No encontramos evidencia de aprobaciones informales o sin control — señal de un proceso más estructurado.",
        evidence: dimensionEvidence("finance"),
        strength: bandToStrength(dimension("finance")!.score),
      });
    }
  }

  // Documentation Culture
  const documentation = dimension("documentation");
  const documentationEvidence = realEvidence("documentation");
  const noDocs = hasRiskPattern(consulting, "no_documentation");
  const tribal = hasRiskPattern(consulting, "tribal_knowledge");
  if (documentation && (documentationEvidence.length > 0 || noDocs || tribal)) {
    const weak = Boolean(noDocs || tribal);
    traits.push({
      id: "documentation_culture",
      label: "Cultura documental",
      observation: weak
        ? "El conocimiento operativo vive en las personas más que en documentos — hay poca tradición de dejar procesos por escrito."
        : "Existe evidencia de procesos y políticas documentadas que sostienen la operación.",
      evidence: [
        ...dimensionEvidence("documentation"),
        ...(noDocs ? riskEvidence(noDocs) : []),
        ...(tribal ? riskEvidence(tribal) : []),
      ].slice(0, 4),
      strength: weak ? "baja" : bandToStrength(documentation.score),
    });
  }

  // Operational Discipline
  const operations = dimension("operations");
  const operationsEvidence = realEvidence("operations");
  const paperForms = hasRiskPattern(consulting, "paper_forms");
  const duplicateWork = hasRiskPattern(consulting, "duplicate_work");
  if (operations && operationsEvidence.length > 0) {
    const frictions = [paperForms, duplicateWork].filter(Boolean);
    traits.push({
      id: "operational_discipline",
      label: "Disciplina operativa",
      observation:
        frictions.length > 0
          ? "La operación sigue patrones reconocibles, pero conviven con fricciones manuales que rompen la disciplina en puntos concretos."
          : "La operación muestra procesos consistentes, sin señales fuertes de trabajo duplicado o formularios manuales.",
      evidence: [
        ...dimensionEvidence("operations"),
        ...frictions.flatMap((r) => riskEvidence(r!)),
      ].slice(0, 4),
      strength: bandToStrength(operations.score),
    });
  }

  // Automation Culture
  const automation = dimension("automation");
  const automationEvidence = realEvidence("automation");
  const manualReporting = hasRiskPattern(consulting, "manual_reporting");
  if (automation && (automationEvidence.length > 0 || manualReporting)) {
    traits.push({
      id: "automation_culture",
      label: "Cultura de automatización",
      observation: manualReporting
        ? "Buena parte del trabajo repetitivo — como reportes — todavía se arma a mano en lugar de generarse solo."
        : "Hay evidencia de flujos que ya corren con menos intervención manual de la que es típico en esta etapa.",
      evidence: [
        ...dimensionEvidence("automation"),
        ...(manualReporting ? riskEvidence(manualReporting) : []),
      ].slice(0, 4),
      strength: manualReporting ? "baja" : bandToStrength(automation.score),
    });
  }

  // Growth Stage
  const summary = workspace.conversationMemory?.summary;
  if (summary?.revenueStage || summary?.companySize) {
    const parts = [
      summary.revenueStage ? `etapa de ingresos "${summary.revenueStage}"` : null,
      summary.companySize ? `tamaño de equipo "${summary.companySize}"` : null,
    ].filter(Boolean);
    traits.push({
      id: "growth_stage",
      label: "Etapa de crecimiento",
      observation: `La empresa se declara en ${parts.join(" y ")}.`,
      evidence: [
        summary.revenueStage
          ? evidence("known_fact", "revenue_stage", summary.revenueStage, summary.revenueStage)
          : null,
        summary.companySize
          ? evidence("known_fact", "company_size", summary.companySize, summary.companySize)
          : null,
      ].filter((e): e is InsightEvidence => e != null),
      strength: parts.length === 2 ? "alta" : "media",
    });
  }

  // Technology Adoption
  const technology = dimension("technology");
  const technologyEvidence = realEvidence("technology");
  const tools = summary?.currentSoftware ?? [];
  const excelDependency = hasRiskPattern(consulting, "excel_dependency");
  const whatsappDependency = hasRiskPattern(consulting, "whatsapp_dependency");
  if (technology && (tools.length > 0 || technologyEvidence.length > 0)) {
    const adHoc = [excelDependency, whatsappDependency].filter(Boolean);
    traits.push({
      id: "technology_adoption",
      label: "Adopción tecnológica",
      observation:
        adHoc.length > 0
          ? `Las herramientas reportadas (${tools.slice(0, 4).join(", ") || "sin listar"}) incluyen soluciones improvisadas que hacen de sistema principal.`
          : tools.length > 0
            ? `El negocio ya opera con herramientas formales: ${tools.slice(0, 4).join(", ")}.`
            : "Hay evidencia de madurez tecnológica sin depender de herramientas improvisadas.",
      evidence: [
        ...tools.slice(0, 3).map((t) => evidence("known_fact", `tool_${t}`, t, t)),
        ...adHoc.flatMap((r) => riskEvidence(r!)),
      ].slice(0, 4),
      strength: adHoc.length > 0 ? "baja" : bandToStrength(technology.score),
    });
  }

  return traits;
}
