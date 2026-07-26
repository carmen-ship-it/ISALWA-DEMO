/**
 * Inventory heuristics — stock, warehouse, production buffers, regional SKUs.
 */

import type { DomainRuleFn, RuleContribution, ScenarioId } from "./types";

const RELEVANT: ScenarioId[] = [
  "open_warehouse",
  "increase_production",
  "new_region",
  "hire_salespeople",
  "reduce_staff",
];

export const contributeInventory: DomainRuleFn = (scenarioId, signals) => {
  if (!RELEVANT.includes(scenarioId)) return null;

  const out: RuleContribution = {
    domain: "inventory",
    likelyImpact: [],
    risks: [],
    dependencies: [],
    signalsUsed: [],
    confidenceDelta: 0,
  };

  if (signals.hasErp) {
    out.signalsUsed.push("hasErp");
    out.confidenceDelta += 0.04;
  }
  if (signals.hasExcelDependency) {
    out.signalsUsed.push("hasExcelDependency");
  }

  switch (scenarioId) {
    case "open_warehouse": {
      out.likelyImpact.push(
        "Stock más cerca del cliente; menor lead time si se reposiciona con reglas claras.",
      );
      out.risks.push(
        "Inventario duplicado entre sitios eleva capital de trabajo y obsolescencia.",
      );
      out.dependencies.push(
        "Política de min/max por SKU, ownership de stock y conteos cíclicos en el nuevo sitio.",
      );
      out.investmentBand = "high";
      out.timelineBand = "6_months";
      if (!signals.hasErp && signals.hasExcelDependency) {
        out.risks.push(
          "Sin ERP y con Excel: el segundo almacén suele desincronizar existencias con rapidez.",
        );
        out.dependencies.push("Sistema de inventario único antes o al abrir el almacén.");
        out.confidenceDelta -= 0.08;
      }
      break;
    }
    case "increase_production": {
      out.likelyImpact.push(
        "Mayor consumo de materia prima y posible acumulación de producto terminado.",
      );
      out.risks.push(
        "Quiebres de insumos o sobrestock si no se sincroniza MPS / compras con el nuevo ritmo.",
      );
      out.dependencies.push(
        "Cobertura de materiales, lead times de compra y espacio de almacén de PT.",
      );
      break;
    }
    case "new_region": {
      out.likelyImpact.push(
        "Puede requerirse stock de seguridad regional o envíos directos con buffers mayores.",
      );
      out.risks.push(
        "SKUs mal dimensionados para la región generan quiebres o mercadería lenta.",
      );
      out.dependencies.push(
        "Catálogo regional, tiempos de tránsito y política de reposición inter-sitio.",
      );
      break;
    }
    case "hire_salespeople": {
      out.likelyImpact.push(
        "Mayor presión sobre disponibilidad de producto / capacidad de promesa de entrega.",
      );
      out.risks.push(
        "Overpromise comercial si el ATP (available-to-promise) no es visible al vendedor.",
      );
      out.dependencies.push("Vista de disponibilidad para el equipo comercial.");
      break;
    }
    case "reduce_staff": {
      out.risks.push(
        "Menos manos en recepción/picking eleva errores de inventario si no hay escaneo o controles.",
      );
      out.dependencies.push(
        "Controles de inventario (escaneo, conteos) que no dependan solo de headcount.",
      );
      break;
    }
    default:
      return null;
  }

  return out;
};
