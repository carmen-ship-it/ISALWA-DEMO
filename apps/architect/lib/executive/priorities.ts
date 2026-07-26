/**
 * Current priorities list for the executive cockpit — Mission 13.
 */

import type { CompanyWorkspace } from "@/types";
import type { PriorityItem } from "./types";

function hashId(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = (h * 31 + text.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

export function deriveCockpitPriorities(
  workspace: CompanyWorkspace,
): PriorityItem[] {
  const consulting = workspace.conversationMemory?.consulting;
  const items: PriorityItem[] = [];
  const seen = new Set<string>();

  const push = (item: PriorityItem) => {
    const key = item.title.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    items.push(item);
  };

  for (const rec of consulting?.recommendations ?? []) {
    if (rec.priority === "later" && items.length >= 4) continue;
    push({
      id: `rec-${rec.id}`,
      title: rec.title,
      urgency: rec.priority,
      rationale: rec.rationale,
      source: "recommendation",
    });
  }

  for (const risk of consulting?.risks ?? []) {
    if (risk.severity !== "critical" && risk.severity !== "high") continue;
    push({
      id: `risk-${risk.id}`,
      title: `Mitigar: ${risk.title}`,
      urgency: risk.severity === "critical" ? "now" : "next",
      rationale: risk.recommendedMitigation,
      source: "risk",
    });
  }

  for (const q of workspace.openQuestions.slice(0, 3)) {
    push({
      id: `decision-${hashId(q)}`,
      title: q,
      urgency: "next",
      rationale: "Decisión o validación pendiente del descubrimiento",
      source: "decision",
    });
  }

  if (items.length < 3) {
    for (const opp of consulting?.opportunities ?? []) {
      if (opp.horizon !== "Quick Wins" && opp.horizon !== "30-day") continue;
      push({
        id: `opp-${opp.id}`,
        title: opp.title,
        urgency: "next",
        rationale: opp.estimatedImpact,
        source: "opportunity",
      });
      if (items.length >= 5) break;
    }
  }

  const urgencyOrder = { now: 0, next: 1, later: 2 } as const;
  return items
    .slice()
    .sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency])
    .slice(0, 6);
}
