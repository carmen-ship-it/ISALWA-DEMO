/**
 * Deterministic business-value and consequence copy (Spanish executive).
 * Frames existing engine outputs — does not invent new commercial claims.
 */

import {
  complexityLabel,
  departmentLabel,
  moduleLabel,
  opportunityHorizonLabel,
  severityLabel,
} from "@/lib/presentation";
import type {
  ConsultingOpportunity,
  ConsultingRisk,
  Recommendation,
  SolutionModule,
} from "@/types";

export function problemFromContext(opts: {
  title: string;
  risks: ConsultingRisk[];
  opportunities: ConsultingOpportunity[];
  rationale?: string;
  painTitles?: string[];
}): string {
  const risk = opts.risks[0];
  if (risk) {
    return `Problema: ${risk.title}. ${risk.businessImpact}`;
  }

  const opp = opts.opportunities[0];
  if (opp) {
    return `Oportunidad sin capturar: ${opp.title}. El negocio deja valor sobre la mesa mientras el proceso actual persiste.`;
  }

  if (opts.painTitles && opts.painTitles.length > 0) {
    return `Problema observado en discovery: ${opts.painTitles[0]}.${
      opts.painTitles[1] ? ` También aparece: ${opts.painTitles[1]}.` : ""
    }`;
  }

  if (opts.rationale) {
    return `Problema / contexto: ${opts.rationale}`;
  }

  return `Existe una fricción operativa que justifica priorizar: ${opts.title}.`;
}

export function observedPatternFromContext(opts: {
  patternLabel?: string;
  patternDescription?: string;
  risks: ConsultingRisk[];
  opportunities: ConsultingOpportunity[];
}): string {
  if (opts.patternLabel) {
    return opts.patternDescription
      ? `Patrón observado: ${opts.patternLabel}. ${opts.patternDescription}`
      : `Patrón observado: ${opts.patternLabel}.`;
  }

  const risk = opts.risks[0];
  if (risk) {
    return `Patrón de riesgo: ${risk.title} (${severityLabel(risk.severity)}).`;
  }

  const opp = opts.opportunities[0];
  if (opp) {
    return `Patrón de oportunidad en horizonte ${opportunityHorizonLabel(opp.horizon)}, con dificultad ${complexityLabel(opp.difficulty)}.`;
  }

  return "Patrón aún en formación — se deriva de la evidencia acumulada del discovery.";
}

export function businessConsequenceFromContext(opts: {
  risks: ConsultingRisk[];
  opportunities: ConsultingOpportunity[];
  rationale?: string;
}): string {
  const risk = opts.risks[0];
  if (risk) {
    return `Si no se actúa: ${risk.businessImpact}`;
  }

  const opp = opts.opportunities[0];
  if (opp) {
    return `Si se captura a tiempo: ${opp.estimatedImpact}`;
  }

  if (opts.rationale) {
    return `Consecuencia de negocio: ${opts.rationale}`;
  }

  return "La inacción prolonga fricción operativa y retrasa decisiones con datos confiables.";
}

export function businessValueFromContext(opts: {
  risks: ConsultingRisk[];
  opportunities: ConsultingOpportunity[];
  rationale?: string;
  module?: SolutionModule;
  phaseBusinessValue?: string | null;
}): string {
  if (opts.phaseBusinessValue) {
    return opts.phaseBusinessValue;
  }

  const opp = opts.opportunities[0];
  if (opp) {
    const depts =
      opp.departmentsAffected.length > 0
        ? ` Departamentos afectados: ${opp.departmentsAffected.map(departmentLabel).join(", ")}.`
        : "";
    return `Valor de negocio: ${opp.estimatedImpact}.${depts}`;
  }

  const risk = opts.risks[0];
  if (risk) {
    return `Valor de negocio: reducir la exposición de «${risk.title}» mediante ${risk.recommendedMitigation}`;
  }

  if (opts.module?.purpose) {
    return `Valor de negocio: ${opts.module.purpose}`;
  }

  if (opts.rationale) {
    return opts.rationale;
  }

  return "Valor de negocio: mejorar continuidad operativa y calidad de decisión con un sistema de registro compartido.";
}

export function recommendationStatement(opts: {
  title: string;
  mitigation?: string;
  rationale?: string;
}): string {
  const action = opts.mitigation ?? opts.title;
  const why = opts.rationale ? ` Fundamento: ${opts.rationale}` : "";
  return `Recomendamos: ${action}.${why}`;
}

export function supportingFactsFromWorkspace(opts: {
  evidenceQuotes: string[];
  knownFacts: string[];
  painTitles: string[];
  rationale?: string;
}): string[] {
  const facts = [
    ...opts.evidenceQuotes,
    ...opts.knownFacts,
    ...opts.painTitles.map((t) => `Punto de dolor: ${t}`),
  ];
  if (opts.rationale) facts.push(opts.rationale);
  return unique(facts).slice(0, 6);
}

export function futureDependenciesFromContext(opts: {
  opportunities: ConsultingOpportunity[];
  module?: SolutionModule;
  recommendation?: Recommendation | { title: string };
}): string[] {
  const deps: string[] = [];

  for (const opp of opts.opportunities) {
    deps.push(...opp.dependencies);
  }

  if (opts.module) {
    for (const name of opts.module.dependencies) {
      deps.push(`Módulo previo: ${moduleLabel(name)}`);
    }
    for (const expansion of opts.module.futureExpansion.slice(0, 2)) {
      deps.push(`Expansión futura: ${expansion}`);
    }
  }

  if (deps.length === 0 && opts.recommendation) {
    deps.push(
      "Alinear dueños de proceso y criterio de sistema de registro antes de implementar",
    );
  }

  return unique(deps).slice(0, 6);
}

function unique(items: string[]): string[] {
  return [...new Set(items.map((s) => s.trim()).filter(Boolean))];
}
