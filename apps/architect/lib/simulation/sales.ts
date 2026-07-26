/**
 * Sales heuristics — pipeline capacity, CRM, territory expansion.
 */

import type { DomainRuleFn, RuleContribution, ScenarioId } from "./types";

const RELEVANT: ScenarioId[] = [
  "hire_salespeople",
  "add_crm",
  "new_region",
  "automate_approvals",
];

export const contributeSales: DomainRuleFn = (scenarioId, signals) => {
  if (!RELEVANT.includes(scenarioId)) return null;

  const out: RuleContribution = {
    domain: "sales",
    likelyImpact: [],
    risks: [],
    dependencies: [],
    signalsUsed: [],
    confidenceDelta: 0,
  };

  if (signals.salesMaturity != null) {
    out.signalsUsed.push("salesMaturity");
  }

  switch (scenarioId) {
    case "hire_salespeople": {
      out.likelyImpact.push(
        "Mayor capacidad de prospección y seguimiento; el impacto en ingresos depende del ciclo de venta.",
      );
      out.risks.push(
        "Sin territorio y cuota claros, los nuevos vendedores compiten entre sí o dejan cuentas huérfanas.",
      );
      out.dependencies.push(
        "Segmentación de cuentas, reglas de asignación y meta de actividad semanal.",
      );
      if (signals.salesMaturity != null && signals.salesMaturity < 0.4) {
        out.risks.push(
          "Madurez comercial baja: contratar sin proceso de ventas documentado suele diluir el ROI.",
        );
        out.confidenceDelta -= 0.07;
      } else if (signals.salesMaturity != null && signals.salesMaturity >= 0.6) {
        out.likelyImpact.push(
          "Con madurez comercial razonable, las contrataciones pueden apalancar un proceso ya existente.",
        );
        out.confidenceDelta += 0.06;
      }
      if (signals.hasWhatsappDependency) {
        out.signalsUsed.push("hasWhatsappDependency");
        out.risks.push(
          "Ventas en WhatsApp personal: al crecer el equipo se pierde historial y continuidad.",
        );
        out.dependencies.push(
          "Canalizar conversaciones comerciales a un registro compartido (CRM).",
        );
      }
      break;
    }
    case "add_crm": {
      out.likelyImpact.push(
        "Visibilidad de pipeline, seguimiento de oportunidades y menor dependencia de memoria individual.",
      );
      out.risks.push(
        "Adopción baja si el CRM no reemplaza el flujo real (WhatsApp / Excel) en las primeras semanas.",
      );
      out.dependencies.push(
        "Campos mínimos, dueños de etapa, limpieza de datos iniciales y capacitación corta.",
      );
      out.timelineBand = "90_days";
      out.investmentBand = "moderate";
      if (signals.hasCrm) {
        out.signalsUsed.push("hasCrm");
        out.likelyImpact.push(
          "Ya hay señal de CRM: el escenario se interpreta como consolidación / adopción, no greenfield.",
        );
        out.risks.push(
          "Duplicar herramientas CRM sin retirar la anterior fragmenta aún más el pipeline.",
        );
        out.confidenceDelta += 0.04;
      }
      if (signals.hasWhatsappDependency || signals.hasExcelDependency) {
        if (signals.hasExcelDependency) out.signalsUsed.push("hasExcelDependency");
        if (signals.hasWhatsappDependency) out.signalsUsed.push("hasWhatsappDependency");
        out.likelyImpact.push(
          "Sustituir Excel/WhatsApp como sistema de verdad comercial es el mayor impacto esperado.",
        );
        out.confidenceDelta += 0.05;
      }
      break;
    }
    case "new_region": {
      out.likelyImpact.push(
        "Nuevo mercado geográfico: pipeline incremental si hay producto-market fit local y cobertura.",
      );
      out.risks.push(
        "Canibalización o precios inconsistentes si no hay reglas de territorio y descuentos.",
      );
      out.dependencies.push(
        "Precio, condiciones comerciales y owner de la región definidos antes de vender.",
      );
      if (signals.geographyHint) {
        out.signalsUsed.push("geographyHint");
        out.confidenceDelta += 0.04;
      }
      break;
    }
    case "automate_approvals": {
      out.likelyImpact.push(
        "Cotizaciones y descuentos avanzan más rápido cuando las aprobaciones no esperan a una sola persona.",
      );
      out.risks.push(
        "Reglas demasiado laxas pueden erosionar margen; demasiado estrictas frenan al equipo de ventas.",
      );
      out.dependencies.push(
        "Umbrales de descuento / crédito por rol, con auditoría.",
      );
      break;
    }
    default:
      return null;
  }

  return out;
};
