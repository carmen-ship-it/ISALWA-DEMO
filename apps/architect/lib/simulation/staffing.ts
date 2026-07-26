/**
 * Staffing heuristics — hiring, reduction, coverage for new regions.
 */

import type { DomainRuleFn, RuleContribution, ScenarioId } from "./types";

const RELEVANT: ScenarioId[] = [
  "hire_salespeople",
  "reduce_staff",
  "new_region",
  "open_warehouse",
  "increase_production",
];

export const contributeStaffing: DomainRuleFn = (scenarioId, signals) => {
  if (!RELEVANT.includes(scenarioId)) return null;

  const out: RuleContribution = {
    domain: "staffing",
    likelyImpact: [],
    risks: [],
    dependencies: [],
    signalsUsed: [],
    confidenceDelta: 0,
  };

  if (signals.teamHint) {
    out.signalsUsed.push("teamHint");
    out.confidenceDelta += 0.03;
  }
  if (signals.peopleMaturity != null) {
    out.signalsUsed.push("peopleMaturity");
  }

  switch (scenarioId) {
    case "hire_salespeople": {
      out.likelyImpact.push(
        "Más cobertura comercial y potencial de pipeline si el onboarding y el territorio están claros.",
      );
      out.risks.push(
        "Costo fijo de nómina antes de que el ciclo de ventas produzca ingresos.",
      );
      out.dependencies.push(
        "Perfil de rol, plan de comisión, playbook de ventas y tiempo de rampa (típicamente 60–120 días).",
      );
      out.timelineBand = "90_days";
      out.investmentBand =
        signals.companySizeBand === "large" ? "moderate" : "high";
      if (signals.peopleMaturity != null && signals.peopleMaturity < 0.4) {
        out.risks.push(
          "Madurez de personas baja: sin proceso de onboarding, las contrataciones rinden tarde o fallan.",
        );
        out.confidenceDelta -= 0.06;
      }
      if (signals.hasCrm) {
        out.signalsUsed.push("hasCrm");
        out.likelyImpact.push(
          "Con CRM existente, la rampa de nuevos vendedores suele ser más medible.",
        );
        out.confidenceDelta += 0.05;
      } else {
        out.dependencies.push(
          "CRM o tablero comercial mínimo para asignar leads y medir actividad.",
        );
      }
      break;
    }
    case "reduce_staff": {
      out.likelyImpact.push(
        "Menor gasto de personal en el corto plazo; procesos deben redistribuirse sin romper el servicio.",
      );
      out.risks.push(
        "Pérdida de conocimiento tácito y sobrecarga en roles remanentes (riesgo de errores y rotación).",
      );
      out.dependencies.push(
        "Mapa de roles críticos, backups documentados y plan de transición por proceso.",
      );
      out.timelineBand = "30_days";
      out.investmentBand = "low";
      if (signals.consultingRiskIds.includes("single_employee_owns_everything")) {
        out.signalsUsed.push("single_employee_owns_everything");
        out.risks.push(
          "Ya hay concentración de conocimiento: reducir personal puede crear un punto único de falla.",
        );
        out.confidenceDelta -= 0.1;
      }
      if (signals.consultingRiskIds.includes("tribal_knowledge")) {
        out.signalsUsed.push("tribal_knowledge");
        out.dependencies.push(
          "Documentar procesos clave antes de cualquier baja en roles operativos.",
        );
      }
      break;
    }
    case "new_region": {
      out.likelyImpact.push(
        "Se requiere cobertura local (ventas, servicio u operaciones) o un modelo remoto explícito.",
      );
      out.risks.push(
        "Estirar el equipo actual hacia la nueva región sin headcount dedicado degrada ambas plazas.",
      );
      out.dependencies.push(
        "Decisión de contratar local vs. viajeros vs. partners antes del lanzamiento.",
      );
      out.timelineBand = "6_months";
      break;
    }
    case "open_warehouse": {
      out.likelyImpact.push(
        "Nuevos roles de almacén (recibos, picking, inventario) o contrato 3PL con SLAs claros.",
      );
      out.risks.push(
        "Subdotación en el go-live genera errores de surtido y demoras.",
      );
      out.dependencies.push("Plan de personal o 3PL firmado alineado a la fecha de apertura.");
      break;
    }
    case "increase_production": {
      out.likelyImpact.push(
        "Puede necesitarse turno adicional, overtime o contratación de planta.",
      );
      out.risks.push(
        "Fatiga y calidad si se escala solo con overtime prolongado.",
      );
      out.dependencies.push("Política de turnos y capacidad de supervisión en planta.");
      break;
    }
    default:
      return null;
  }

  return out;
};
