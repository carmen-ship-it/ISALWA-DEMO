/**
 * 6. Business Evolution — how our understanding of the business improved
 * over time. Pure re-presentation of `lib/history` (Mission 15's append-only
 * evolutionary memory) — no new tracking, no recomputation of snapshots.
 */

import { ensureEvolutionHistory } from "@/lib/history";
import type { CompanyWorkspace } from "@/types";
import type { BusinessEvolutionMoment, BusinessEvolutionSummary } from "./types";

const RELEVANT_KINDS = new Set([
  "understanding_up",
  "understanding_down",
  "maturity_up",
  "maturity_down",
  "module_added",
  "process_added",
  "recommendation_added",
  "roadmap_advanced",
  "stage_changed",
  "risk_resolved",
]);

export function deriveBusinessEvolution(
  workspace: CompanyWorkspace,
): BusinessEvolutionSummary {
  const history = ensureEvolutionHistory(workspace.evolutionHistory);
  const moments: BusinessEvolutionMoment[] = history.timeline
    .filter((entry) => RELEVANT_KINDS.has(entry.kind))
    .slice(0, 8)
    .map((entry) => ({
      id: entry.id,
      at: entry.at,
      title: entry.title,
      description: entry.description,
      polarity: entry.polarity === "focus" ? "neutral" : entry.polarity,
    }));

  const firstSnapshot = history.snapshots[0] ?? null;
  const latestSnapshot = history.snapshots[history.snapshots.length - 1] ?? null;
  const understandingStart = firstSnapshot?.businessUnderstanding ?? null;
  const understandingNow =
    latestSnapshot?.businessUnderstanding ?? workspace.businessUnderstanding;

  const visitCount = history.snapshots.length;

  let narrative: string;
  if (visitCount === 0) {
    narrative =
      "Aún no hay historial suficiente para narrar la evolución — esto se acumula con cada visita.";
  } else if (understandingStart != null && understandingNow > understandingStart) {
    narrative = `La comprensión del negocio avanzó de ${understandingStart}% a ${understandingNow}% a lo largo de ${visitCount} captura(s) de estado.`;
  } else if (understandingStart != null && understandingNow < understandingStart) {
    narrative = `La comprensión del negocio se revisó de ${understandingStart}% a ${understandingNow}% conforme llegó nueva evidencia — es normal al corregir supuestos iniciales.`;
  } else {
    narrative = `La comprensión del negocio se mantiene en ${understandingNow}% a lo largo de ${visitCount} captura(s) de estado.`;
  }

  return {
    narrative,
    moments,
    understandingStart,
    understandingNow,
    visitCount,
  };
}
