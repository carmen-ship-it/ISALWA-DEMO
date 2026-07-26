/**
 * Prioritize existing recommendations / opportunities for the cockpit — Mission 13.
 */

import type { CompanyWorkspace } from "@/types";
import type { CockpitRecommendation } from "./types";

const STRATEGIC_HORIZONS = new Set([
  "90-day",
  "6-month",
  "1-year",
  "strategic",
  "Strategic Initiatives",
  "Innovation",
]);

const QUICK_HORIZONS = new Set([
  "Quick Wins",
  "30-day",
  "30-day Projects",
]);

function horizonLabel(horizon: string | null | undefined): string | null {
  if (!horizon) return null;
  const map: Record<string, string> = {
    "Quick Wins": "Victorias rápidas",
    "30-day": "30 días",
    "30-day Projects": "30 días",
    "90-day": "90 días",
    "90-day Projects": "90 días",
    "6-month": "6 meses",
    "1-year": "1 año",
    strategic: "Estratégico",
    "Strategic Initiatives": "Estratégico",
    Innovation: "Innovación",
  };
  return map[horizon] ?? horizon;
}

export function deriveCockpitQuickWins(
  workspace: CompanyWorkspace,
): CockpitRecommendation[] {
  const consulting = workspace.conversationMemory?.consulting;
  const fromConsulting = (consulting?.opportunities ?? [])
    .filter((o) => QUICK_HORIZONS.has(o.horizon))
    .slice()
    .sort((a, b) => b.confidence - a.confidence)
    .map(
      (o): CockpitRecommendation => ({
        id: o.id,
        title: o.title,
        kind: "quick_win",
        horizon: horizonLabel(o.horizon),
        confidence: o.confidence,
        rationale: o.estimatedImpact,
      }),
    );

  if (fromConsulting.length > 0) return fromConsulting.slice(0, 5);

  return (workspace.opportunities ?? [])
    .filter(
      (o) =>
        o.impact === "quick_win" ||
        /rápid|inmediato/i.test(`${o.title} ${o.description}`),
    )
    .slice(0, 5)
    .map((o) => ({
      id: o.id,
      title: o.title,
      kind: "quick_win" as const,
      horizon: "Victorias rápidas",
      confidence: null,
      rationale: o.description || null,
    }));
}

export function deriveCockpitStrategicOpportunities(
  workspace: CompanyWorkspace,
): CockpitRecommendation[] {
  const consulting = workspace.conversationMemory?.consulting;
  const fromConsulting = (consulting?.opportunities ?? [])
    .filter((o) => STRATEGIC_HORIZONS.has(o.horizon))
    .slice()
    .sort((a, b) => b.confidence - a.confidence)
    .map(
      (o): CockpitRecommendation => ({
        id: o.id,
        title: o.title,
        kind: "strategic",
        horizon: horizonLabel(o.horizon),
        confidence: o.confidence,
        rationale: o.estimatedImpact,
      }),
    );

  if (fromConsulting.length >= 3) return fromConsulting.slice(0, 5);

  const filler = (consulting?.opportunities ?? [])
    .filter((o) => !QUICK_HORIZONS.has(o.horizon))
    .slice()
    .sort((a, b) => b.confidence - a.confidence)
    .map(
      (o): CockpitRecommendation => ({
        id: `fill-${o.id}`,
        title: o.title,
        kind: "strategic",
        horizon: horizonLabel(o.horizon),
        confidence: o.confidence,
        rationale: o.estimatedImpact,
      }),
    );

  const seen = new Set(fromConsulting.map((o) => o.title));
  const merged = [...fromConsulting];
  for (const item of filler) {
    if (seen.has(item.title)) continue;
    merged.push(item);
    if (merged.length >= 5) break;
  }

  if (merged.length > 0) return merged;

  return (workspace.opportunities ?? [])
    .filter((o) => o.impact === "strategic" || o.impact === "high")
    .slice(0, 5)
    .map((o) => ({
      id: o.id,
      title: o.title,
      kind: "strategic" as const,
      horizon: "Estratégico",
      confidence: null,
      rationale: o.description || null,
    }));
}

export function deriveCockpitPriorityRecommendations(
  workspace: CompanyWorkspace,
): CockpitRecommendation[] {
  const consulting = workspace.conversationMemory?.consulting;
  const order = { now: 0, next: 1, later: 2 } as const;

  return (consulting?.recommendations ?? [])
    .slice()
    .sort((a, b) => order[a.priority] - order[b.priority])
    .slice(0, 6)
    .map((r) => ({
      id: r.id,
      title: r.title,
      kind: "priority" as const,
      horizon:
        r.priority === "now"
          ? "Ahora"
          : r.priority === "next"
            ? "Siguiente"
            : "Más adelante",
      confidence: consulting?.confidence.overall ?? null,
      rationale: r.rationale,
    }));
}
