/**
 * 9. Business Intelligence Timeline — the "We Learned" progress feed.
 * Reuses `workspace.timeline` (existing event log) and the evolutionary
 * history timeline (`lib/history`) — reframed as learning moments in
 * executive Spanish. No new event tracking.
 */

import { sortTimelineNewestFirst } from "@/lib/timeline";
import { ensureEvolutionHistory } from "@/lib/history";
import type { CompanyWorkspace, TimelineCategory } from "@/types";
import type { LearnedTimelineEntry } from "./types";

const CATEGORY_SOURCE: Partial<Record<TimelineCategory, LearnedTimelineEntry["source"]>> = {
  discovery: "meeting",
  meeting: "meeting",
  knowledge: "document",
  recommendation: "recommendation",
  module: "recommendation",
};

export function deriveLearnedTimeline(
  workspace: CompanyWorkspace,
): LearnedTimelineEntry[] {
  const entries: LearnedTimelineEntry[] = [];

  const workspaceEvents = sortTimelineNewestFirst(workspace.timeline).slice(0, 10);
  for (const event of workspaceEvents) {
    const source = CATEGORY_SOURCE[event.category];
    if (!source) continue;
    entries.push({
      id: event.id,
      at: event.date,
      headline: event.title,
      detail: event.description,
      source,
    });
  }

  const history = ensureEvolutionHistory(workspace.evolutionHistory);
  const milestoneEntries = history.timeline
    .filter((m) => m.kind !== "visit" && m.kind !== "snapshot")
    .slice(0, 6)
    .map((m) => ({
      id: m.id,
      at: m.at,
      headline: m.title,
      detail: m.description,
      source: "milestone" as const,
    }));

  const merged = [...entries, ...milestoneEntries]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 12);

  const seen = new Set<string>();
  return merged.filter((entry) => {
    const key = `${entry.headline}_${entry.detail}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
