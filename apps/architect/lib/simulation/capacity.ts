/**
 * Capacity heuristics — production headroom, warehouse throughput, regional load.
 */

import type { DomainRuleFn, RuleContribution, ScenarioId } from "./types";

const RELEVANT: ScenarioId[] = [
  "increase_production",
  "open_warehouse",
  "new_region",
  "hire_salespeople",
];

export const contributeCapacity: DomainRuleFn = (scenarioId, signals) => {
  if (!RELEVANT.includes(scenarioId)) return null;

  const out: RuleContribution = {
    domain: "capacity",
    likelyImpact: [],
    risks: [],
    dependencies: [],
    signalsUsed: [],
    confidenceDelta: 0,
  };

  switch (scenarioId) {
    case "increase_production": {
      out.likelyImpact.push(
        "Mayor throughput operativo si la capacidad de planta y la cadena de suministro acompañan el aumento.",
      );
      out.risks.push(
        "Cuellos de botella en calidad, mantenimiento o insumos si se escala sin holgura medida.",
      );
      out.dependencies.push(
        "Visibilidad de utilización actual de planta, lead times de proveedores y control de calidad.",
      );
      out.timelineBand = "90_days";
      if (signals.operationsMaturity != null) {
        out.signalsUsed.push("operationsMaturity");
        if (signals.operationsMaturity < 0.45) {
          out.risks.push(
            "Madurez operativa baja: el aumento de producción puede amplificar retrabajo y paros.",
          );
          out.confidenceDelta -= 0.08;
        } else {
          out.likelyImpact.push(
            "La madurez operativa observada sugiere que un incremento gradual es absorbible.",
          );
          out.confidenceDelta += 0.06;
        }
      }
      if (signals.hasExcelDependency) {
        out.signalsUsed.push("hasExcelDependency");
        out.risks.push(
          "Planificación en Excel dificulta ver capacidad real antes de comprometer volumen.",
        );
        out.dependencies.push("Tablero único de capacidad (no hojas dispersas).");
      }
      break;
    }
    case "open_warehouse": {
      out.likelyImpact.push(
        "Más capacidad de almacenamiento y mejor servicio a clientes cercanos al nuevo nodo.",
      );
      out.risks.push(
        "Subutilización inicial y costos fijos si la demanda regional no justifica el espacio.",
      );
      out.dependencies.push(
        "Pronóstico de demanda local, diseño de layout y regla de inventario entre sitios.",
      );
      out.timelineBand = "6_months";
      out.investmentBand = "high";
      if (signals.geographyHint) {
        out.signalsUsed.push("geographyHint");
        out.likelyImpact.push(
          `La geografía mencionada (${signals.geographyHint}) ayuda a acotar la ubicación del almacén.`,
        );
        out.confidenceDelta += 0.05;
      }
      break;
    }
    case "new_region": {
      out.likelyImpact.push(
        "La red operativa debe absorber pedidos, stock y servicio en la nueva región sin degradar la actual.",
      );
      out.risks.push(
        "Sobrecarga de capacidad central si la región nueva se atiende solo desde el sitio actual.",
      );
      out.dependencies.push(
        "Definir modelo de fulfillment (directo, 3PL o nodo local) antes del go-live comercial.",
      );
      out.timelineBand = "6_months";
      break;
    }
    case "hire_salespeople": {
      out.likelyImpact.push(
        "La capacidad comercial crece; operaciones y fulfillment deben aguantar el volumen adicional.",
      );
      out.risks.push(
        "Promesas de venta por encima de la capacidad de entrega dañan la reputación.",
      );
      out.dependencies.push(
        "Alinear cuota de ventas con capacidad de producción / inventario disponible.",
      );
      if (signals.companySizeBand === "small") {
        out.signalsUsed.push("companySizeBand");
        out.risks.push(
          "En equipos pequeños, un pico de pedidos puede saturar operaciones con rapidez.",
        );
      }
      break;
    }
    default:
      return null;
  }

  return out;
};
