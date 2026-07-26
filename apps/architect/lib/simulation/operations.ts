/**
 * Operations heuristics — process load, approvals, production, warehouse ops.
 */

import type { DomainRuleFn, RuleContribution, ScenarioId } from "./types";

const RELEVANT: ScenarioId[] = [
  "automate_approvals",
  "increase_production",
  "open_warehouse",
  "reduce_staff",
  "add_crm",
  "hire_salespeople",
];

export const contributeOperations: DomainRuleFn = (scenarioId, signals) => {
  if (!RELEVANT.includes(scenarioId)) return null;

  const out: RuleContribution = {
    domain: "operations",
    likelyImpact: [],
    risks: [],
    dependencies: [],
    signalsUsed: [],
    confidenceDelta: 0,
  };

  if (signals.operationsMaturity != null) {
    out.signalsUsed.push("operationsMaturity");
  }
  if (signals.automationScore != null) {
    out.signalsUsed.push("automationScore");
  }

  switch (scenarioId) {
    case "automate_approvals": {
      out.likelyImpact.push(
        "Menor tiempo de ciclo en flujos que hoy esperan firmas o revisiones manuales.",
      );
      out.risks.push(
        "Automatizar sin umbrales claros puede aprobar excepciones riesgosas o bloquear casos legítimos.",
      );
      out.dependencies.push(
        "Inventario de aprobaciones actuales, dueños, SLAs y excepciones documentadas.",
      );
      out.timelineBand = "90_days";
      out.investmentBand = "moderate";
      if (signals.hasManualApprovals) {
        out.signalsUsed.push("hasManualApprovals");
        out.likelyImpact.push(
          "Hay evidencia de aprobaciones manuales: el escenario ataca un freno operativo real.",
        );
        out.confidenceDelta += 0.1;
      }
      if (signals.automationScore != null && signals.automationScore < 0.35) {
        out.likelyImpact.push(
          "Automatización de procesos baja hoy: el upside de estandarizar aprobaciones es alto.",
        );
        out.confidenceDelta += 0.05;
      }
      break;
    }
    case "increase_production": {
      out.likelyImpact.push(
        "Más volumen de salida si el flujo de planta, calidad y mantenimiento están listos.",
      );
      out.risks.push(
        "WIP y desperdicio suben si se empuja volumen sin estabilizar el proceso.",
      );
      out.dependencies.push(
        "Estándares de proceso, OEE / utilización básica y plan de mantenimiento preventivo.",
      );
      if (signals.operationsMaturity != null && signals.operationsMaturity >= 0.55) {
        out.confidenceDelta += 0.05;
      }
      break;
    }
    case "open_warehouse": {
      out.likelyImpact.push(
        "Nuevo nodo logístico: cambia rutas, lead times y políticas de reposición.",
      );
      out.risks.push(
        "Procesos de recepción/picking inconsistentes entre sitios generan errores de inventario.",
      );
      out.dependencies.push(
        "SOPs de almacén, etiquetado y sistema de inventario compartido entre nodos.",
      );
      break;
    }
    case "reduce_staff": {
      out.likelyImpact.push(
        "Las operaciones deben absorber el mismo trabajo con menos manos — solo viable con simplificación.",
      );
      out.risks.push(
        "Colas y errores aumentan si se recorta sin eliminar pasos o automatizar.",
      );
      out.dependencies.push(
        "Identificar procesos candidatos a simplificar o automatizar antes del recorte.",
      );
      break;
    }
    case "add_crm": {
      out.likelyImpact.push(
        "Operaciones comerciales más predecibles: handoffs venta→entrega con menos retrabajo.",
      );
      out.dependencies.push(
        "Integrar estados de pedido / entrega con el CRM o un sistema hermano.",
      );
      break;
    }
    case "hire_salespeople": {
      out.likelyImpact.push(
        "Más demanda entrante hacia operaciones (cotización, fulfillment, postventa).",
      );
      out.risks.push(
        "SLA de entrega se degrada si operaciones no escala con el equipo comercial.",
      );
      out.dependencies.push("Capacidad de fulfillment y reglas de promesa de fecha.");
      break;
    }
    default:
      return null;
  }

  return out;
};
