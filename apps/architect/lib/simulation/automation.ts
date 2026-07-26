/**
 * Automation heuristics — approvals, CRM workflows, process digitization.
 */

import type { DomainRuleFn, RuleContribution, ScenarioId } from "./types";

const RELEVANT: ScenarioId[] = [
  "automate_approvals",
  "add_crm",
  "reduce_staff",
  "increase_production",
];

export const contributeAutomation: DomainRuleFn = (scenarioId, signals) => {
  if (!RELEVANT.includes(scenarioId)) return null;

  const out: RuleContribution = {
    domain: "automation",
    likelyImpact: [],
    risks: [],
    dependencies: [],
    signalsUsed: [],
    confidenceDelta: 0,
  };

  if (signals.automationScore != null) {
    out.signalsUsed.push("automationScore");
  }

  switch (scenarioId) {
    case "automate_approvals": {
      out.likelyImpact.push(
        "Reglas y rutas de aprobación reducen esperas y crean rastro auditable.",
      );
      out.risks.push(
        "Excepciones no modeladas generan workarounds paralelos (el papel informal regresa).",
      );
      out.dependencies.push(
        "Motor de workflow o CRM/ERP con approval chains; dueños de regla de negocio.",
      );
      out.timelineBand = "90_days";
      out.investmentBand = "moderate";
      if (signals.hasManualApprovals) {
        out.signalsUsed.push("hasManualApprovals");
        out.confidenceDelta += 0.08;
      }
      if (signals.consultingRiskIds.includes("no_audit_trail")) {
        out.signalsUsed.push("no_audit_trail");
        out.likelyImpact.push(
          "Además de velocidad, se gana trazabilidad donde hoy no hay audit trail.",
        );
        out.confidenceDelta += 0.05;
      }
      break;
    }
    case "add_crm": {
      out.likelyImpact.push(
        "Automatizaciones ligeras (recordatorios, etapas, tareas) mejoran disciplina comercial.",
      );
      out.risks.push(
        "Sobre-automatizar notificaciones genera ruido y los usuarios desactivan el CRM.",
      );
      out.dependencies.push(
        "Empezar con 2–3 automatizaciones de alto valor; medir adopción semanal.",
      );
      break;
    }
    case "reduce_staff": {
      out.likelyImpact.push(
        "Sin automatizar pasos repetitivos, el recorte de personal solo traslada carga.",
      );
      out.risks.push(
        "Recortar antes de automatizar suele romper SLAs en 30–60 días.",
      );
      out.dependencies.push(
        "Lista priorizada de automatizaciones / simplificaciones previas al recorte.",
      );
      if (signals.automationScore != null && signals.automationScore < 0.4) {
        out.confidenceDelta -= 0.08;
        out.risks.push(
          "Score de automatización bajo: el escenario de reducción es especialmente frágil.",
        );
      }
      break;
    }
    case "increase_production": {
      out.likelyImpact.push(
        "Tableros y órdenes digitales ayudan a sostener un ritmo de producción más alto.",
      );
      out.dependencies.push(
        "Captura digital de órdenes de producción y desviaciones (no solo pizarras).",
      );
      break;
    }
    default:
      return null;
  }

  return out;
};
