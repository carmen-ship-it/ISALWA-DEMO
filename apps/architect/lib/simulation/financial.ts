/**
 * Financial heuristics — investment band, cash timing, cost structure.
 * Deterministic bands only — not forecasts or valuations.
 */

import type {
  DomainRuleFn,
  InvestmentBand,
  ScenarioId,
  TimelineBand,
} from "./types";

const BASE_INVESTMENT: Record<ScenarioId, InvestmentBand> = {
  hire_salespeople: "high",
  automate_approvals: "moderate",
  open_warehouse: "very_high",
  add_crm: "moderate",
  increase_production: "high",
  reduce_staff: "low",
  new_region: "very_high",
};

const BASE_TIMELINE: Record<ScenarioId, TimelineBand> = {
  hire_salespeople: "90_days",
  automate_approvals: "90_days",
  open_warehouse: "6_months",
  add_crm: "90_days",
  increase_production: "90_days",
  reduce_staff: "30_days",
  new_region: "12_months",
};

const INVESTMENT_SUMMARY: Record<InvestmentBand, string> = {
  low: "Inversión relativa baja (principalmente esfuerzo interno y cambio de proceso).",
  moderate: "Inversión moderada (herramientas, implementación y capacitación).",
  high: "Inversión alta (nómina, CapEx operativo o proyecto de sistemas significativo).",
  very_high:
    "Inversión muy alta (infraestructura, inventario, personal y go-to-market regional).",
};

export const contributeFinancial: DomainRuleFn = (scenarioId, signals) => {
  let band = BASE_INVESTMENT[scenarioId];
  let timeline = BASE_TIMELINE[scenarioId];
  const signalsUsed: string[] = [];
  let confidenceDelta = 0;

  if (signals.companySizeBand !== "unknown") {
    signalsUsed.push("companySizeBand");
    if (signals.companySizeBand === "small") {
      if (band === "moderate") band = "high";
      else if (band === "high") band = "very_high";
      confidenceDelta += 0.02;
    } else if (signals.companySizeBand === "large" && band === "very_high") {
      band = "high";
    }
  }

  const likelyImpact: string[] = [];
  const risks: string[] = [];
  const dependencies: string[] = [];

  switch (scenarioId) {
    case "hire_salespeople":
      likelyImpact.push(
        "Costo de personal y comisiones sube antes de que el ingreso incremental se materialice.",
      );
      risks.push(
        "Payback lento si el ciclo de venta es largo o la tasa de cierre es débil.",
      );
      dependencies.push("Presupuesto de nómina + comisiones y horizonte de payback acordado.");
      break;
    case "automate_approvals":
      likelyImpact.push(
        "Costo de implementación moderado; ahorro principal en tiempo de ciclo y menos retrabajo.",
      );
      risks.push("ROI diluido si solo se digitaliza el formulario sin cambiar umbrales.");
      break;
    case "open_warehouse":
      likelyImpact.push(
        "CapEx / arriendo, fit-out, sistemas e inventario inicial concentran el desembolso.",
      );
      risks.push("Costos fijos mensuales antes de alcanzar utilización objetivo.");
      dependencies.push("Caso de inversión con break-even de utilización del sitio.");
      break;
    case "add_crm":
      likelyImpact.push(
        "Licencias + implementación; el valor financiero llega vía conversión y menos fuga de deals.",
      );
      risks.push("Costo hundido si la adopción queda bajo el umbral de uso diario.");
      break;
    case "increase_production":
      likelyImpact.push(
        "Mayor costo variable (materiales, energía, overtime) y posible CapEx de equipo.",
      );
      risks.push("Margen se comprime si el precio o el mix no acompañan el volumen.");
      break;
    case "reduce_staff":
      likelyImpact.push(
        "Ahorro de nómina en el corto plazo; posibles costos de liquidación y pérdida de capacidad.",
      );
      risks.push(
        "Ahorro aparente se invierte en errores, overtime o recontratación de emergencia.",
      );
      timeline = "30_days";
      break;
    case "new_region":
      likelyImpact.push(
        "Inversión comercial + operativa (viaje, stock, partners, marketing local).",
      );
      risks.push("Cash burn prolongado si la tracción local tarda más de dos ciclos de venta.");
      dependencies.push("Presupuesto de lanzamiento regional con gates de continuidad.");
      break;
  }

  return {
    domain: "financial",
    likelyImpact,
    risks,
    dependencies,
    signalsUsed,
    confidenceDelta,
    investmentBand: band,
    timelineBand: timeline,
  };
};

export function investmentSummary(band: InvestmentBand): string {
  return INVESTMENT_SUMMARY[band];
}

export function investmentScale(band: InvestmentBand): 1 | 2 | 3 | 4 | 5 {
  switch (band) {
    case "low":
      return 1;
    case "moderate":
      return 2;
    case "high":
      return 4;
    case "very_high":
      return 5;
  }
}

export function timelineSummary(band: TimelineBand): string {
  switch (band) {
    case "2_weeks":
      return "Horizonte típico: ~2 semanas para un piloto acotado.";
    case "30_days":
      return "Horizonte típico: ~30 días para ver efectos operativos iniciales.";
    case "90_days":
      return "Horizonte típico: ~90 días para implementación y primeros resultados.";
    case "6_months":
      return "Horizonte típico: ~6 meses hasta operación estable.";
    case "12_months":
      return "Horizonte típico: ~12 meses para madurar el escenario completo.";
  }
}

export function timelineWeeks(band: TimelineBand): number {
  switch (band) {
    case "2_weeks":
      return 2;
    case "30_days":
      return 4;
    case "90_days":
      return 13;
    case "6_months":
      return 26;
    case "12_months":
      return 52;
  }
}

export { BASE_INVESTMENT, BASE_TIMELINE };
