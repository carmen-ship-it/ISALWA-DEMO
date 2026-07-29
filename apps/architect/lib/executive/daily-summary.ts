/**
 * Short Spanish daily summary for the executive cockpit — Mission 13.
 * Deterministic copy from existing workspace + score signals. No LLM.
 */

import type { CompanyWorkspace } from "@/types";
import { countDiscoverySessions } from "@/lib/memory/meeting-kind";
import { healthLabel, understandingLevel } from "@/lib/presentation";
import type { ExecutiveScore } from "./types";

function severityRank(s: string): number {
  const map: Record<string, number> = {
    critical: 4,
    high: 3,
    moderate: 2,
    low: 1,
  };
  return map[s] ?? 0;
}

export function deriveDailySummary(
  workspace: CompanyWorkspace,
  score: ExecutiveScore,
): string {
  const consulting = workspace.conversationMemory?.consulting;
  const company = workspace.companyName;
  const understanding = understandingLevel(workspace.businessUnderstanding);
  // Real human discovery sessions only — never internal transcript ingestion
  // (`lib/documents/pipeline.ts` also writes `Meeting` records). A company
  // that only pasted transcripts has never had "la primera sesión de
  // descubrimiento" through Architect, even though `workspace.meetings` is
  // non-empty. See `lib/memory/meeting-kind.ts`.
  const discoverySessions = countDiscoverySessions(workspace.meetings);

  const topRisk = (consulting?.risks ?? [])
    .slice()
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))[0];

  const topPriority =
    consulting?.recommendations.find((r) => r.priority === "now")?.title ??
    consulting?.recommendations.find((r) => r.priority === "next")?.title ??
    workspace.openQuestions[0] ??
    null;

  const healthBit =
    consulting?.health.overall != null
      ? healthLabel(consulting.health.overall, "percent")
      : score.label;

  const parts: string[] = [];

  parts.push(
    `${company}: comprensión ${understanding.toLowerCase()}, salud ${healthBit.toLowerCase()} (${score.overall}/100).`,
  );

  if (topRisk) {
    parts.push(`Riesgo principal: ${topRisk.title}.`);
  } else if (discoverySessions === 0) {
    parts.push("Listo para la primera sesión de descubrimiento.");
  }

  if (topPriority) {
    parts.push(`Prioridad de hoy: ${topPriority}.`);
  } else if (!topRisk) {
    parts.push(
      "Las prioridades se consolidarán conforme crezca la evidencia.",
    );
  }

  return parts.join(" ");
}
