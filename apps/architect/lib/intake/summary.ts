/**
 * Unified Business Knowledge Intake — client-facing summary copy.
 *
 * Builds the "✓ Aprendimos… / Aún necesitamos…" pair the Business Knowledge
 * workspace section shows after every upload/note — the literal client
 * promise: "the more information you provide, the fewer questions we need
 * to ask."
 */

import type { GapReport } from "./gaps";

export interface IntakeMergeCounts {
  addedEntities: number;
  reinforcedEntities: number;
  addedRelationships: number;
  addedFacts: number;
  addedBusinessRules: number;
  addedContradictions: number;
  addedPainSignals: number;
  addedOpportunities: number;
  addedUnknowns: number;
}

export function buildLearnedLines(
  counts: IntakeMergeCounts,
  sourceLabel: string,
): string[] {
  const lines: string[] = [];

  const learnedParts: string[] = [];
  if (counts.addedEntities > 0 || counts.reinforcedEntities > 0) {
    learnedParts.push(
      `${counts.addedEntities} elemento${counts.addedEntities === 1 ? "" : "s"} nuevo${counts.addedEntities === 1 ? "" : "s"}` +
        (counts.reinforcedEntities > 0
          ? ` y ${counts.reinforcedEntities} confirmado${counts.reinforcedEntities === 1 ? "" : "s"} de nuevo`
          : ""),
    );
  }
  if (counts.addedFacts > 0) {
    learnedParts.push(
      `${counts.addedFacts} declaración${counts.addedFacts === 1 ? "" : "es"}`,
    );
  }
  if (counts.addedRelationships > 0) {
    learnedParts.push(
      `${counts.addedRelationships} relación${counts.addedRelationships === 1 ? "" : "es"}`,
    );
  }
  if (counts.addedBusinessRules > 0) {
    learnedParts.push(
      `${counts.addedBusinessRules} regla${counts.addedBusinessRules === 1 ? "" : "s"} de negocio`,
    );
  }
  if (counts.addedPainSignals > 0) {
    learnedParts.push(
      `${counts.addedPainSignals} posible${counts.addedPainSignals === 1 ? "" : "s"} problema${counts.addedPainSignals === 1 ? "" : "s"}`,
    );
  }
  if (counts.addedOpportunities > 0) {
    learnedParts.push(
      `${counts.addedOpportunities} oportunidad${counts.addedOpportunities === 1 ? "" : "es"}`,
    );
  }

  if (learnedParts.length > 0) {
    lines.push(`Aprendimos de "${sourceLabel}": ${learnedParts.join(" · ")}.`);
  } else {
    lines.push(
      `"${sourceLabel}" fue recibido y archivado — sin datos estructurados nuevos esta vez.`,
    );
  }

  if (counts.addedContradictions > 0) {
    lines.push(
      `Encontramos ${counts.addedContradictions} punto${counts.addedContradictions === 1 ? "" : "s"} que conviene aclarar — hay cifras distintas para lo mismo.`,
    );
  }

  return lines;
}

export function buildStillNeedLines(gaps: GapReport): string[] {
  if (gaps.labelsEs.length === 0) {
    return ["Por ahora no detectamos vacíos claros en la evidencia cargada."];
  }
  return [`Aún necesitamos entender mejor: ${gaps.labelsEs.slice(0, 5).join(" · ")}.`];
}
