/**
 * Open risks / needs attention for the cockpit — Mission 13.
 * Surface-only: no push notifications, no email.
 */

import { coverageAreaLabel } from "@/lib/presentation";
import type { CompanyWorkspace, RiskSeverity } from "@/types";
import type { CockpitAlert } from "./types";

function severityRank(s: string): number {
  const map: Record<string, number> = {
    critical: 4,
    high: 3,
    moderate: 2,
    low: 1,
    attention: 0,
  };
  return map[s] ?? 0;
}

function hashId(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = (h * 31 + text.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

export function deriveCockpitAlerts(
  workspace: CompanyWorkspace,
): CockpitAlert[] {
  const alerts: CockpitAlert[] = [];
  const consulting = workspace.conversationMemory?.consulting;
  const processes = workspace.businessProcesses;
  const memory = workspace.conversationMemory;

  for (const risk of consulting?.risks ?? []) {
    alerts.push({
      id: `consulting-${risk.id}`,
      title: risk.title,
      severity: risk.severity,
      detail: risk.businessImpact || risk.recommendedMitigation,
      source: "consulting",
    });
  }

  for (const bottleneck of processes?.bottlenecks ?? []) {
    if (
      bottleneck.consultingRiskId &&
      alerts.some((a) => a.id === `consulting-${bottleneck.consultingRiskId}`)
    ) {
      continue;
    }
    alerts.push({
      id: `process-${bottleneck.id}`,
      title: bottleneck.title,
      severity: bottleneck.severity as RiskSeverity,
      detail: bottleneck.businessImpact,
      source: "process",
    });
  }

  const openQs = workspace.openQuestions.slice(0, 3);
  for (const q of openQs) {
    alerts.push({
      id: `memory-q-${hashId(q)}`,
      title: "Pregunta abierta",
      severity: "attention",
      detail: q,
      source: "memory",
    });
  }

  const stillNeed = memory?.score.stillNeed.slice(0, 2) ?? [];
  for (const need of stillNeed) {
    if (openQs.some((q) => q.toLowerCase().includes(need.toLowerCase()))) {
      continue;
    }
    alerts.push({
      id: `memory-need-${hashId(need)}`,
      title: "Evidencia pendiente",
      severity: "attention",
      detail: need,
      source: "memory",
    });
  }

  const thinCoverage =
    workspace.knowledge?.coverage
      ?.filter((c) => c.percent < 30)
      .slice(0, 2) ?? [];
  for (const slice of thinCoverage) {
    const areaEs = coverageAreaLabel(slice.area);
    alerts.push({
      id: `knowledge-${slice.area}`,
      title: `Cobertura limitada: ${areaEs}`,
      severity: "attention",
      detail:
        slice.note ||
        `El área de ${areaEs} todavía necesita más evidencia.`,
      source: "knowledge",
    });
  }

  return alerts
    .slice()
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
    .slice(0, 10);
}
