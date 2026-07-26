/**
 * Composite executive business-health score — Mission 13.
 * Deterministic weighted blend of existing consulting / understanding / process signals.
 */

import type { CompanyWorkspace } from "@/types";
import type { ExecutiveScore, ExecutiveScoreComponent } from "./types";

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function severityPenalty(risks: Array<{ severity: string }>): number {
  let penalty = 0;
  for (const r of risks) {
    switch (r.severity) {
      case "critical":
        penalty += 12;
        break;
      case "high":
        penalty += 8;
        break;
      case "moderate":
        penalty += 4;
        break;
      case "low":
        penalty += 1;
        break;
      default:
        break;
    }
  }
  return Math.min(40, penalty);
}

function scoreLabel(overall: number): string {
  if (overall >= 75) return "Sólida";
  if (overall >= 55) return "Estable";
  if (overall >= 35) return "Bajo presión";
  return "Requiere atención";
}

export function deriveExecutiveScore(
  workspace: CompanyWorkspace,
): ExecutiveScore {
  const consulting = workspace.conversationMemory?.consulting;
  const processes = workspace.businessProcesses;
  const risks = consulting?.risks ?? [];

  const understanding = clamp(workspace.businessUnderstanding);
  const health = consulting?.health.overall ?? null;
  const maturity = consulting?.maturity.overall ?? null;
  const confidence = consulting?.confidence.overall ?? null;
  const automationMaturity =
    consulting?.maturity.dimensions.find((d) => d.id === "automation")
      ?.score ?? null;
  const processAutomation =
    processes && processes.workflows.length > 0
      ? clamp(
          processes.workflows.reduce(
            (sum, w) => sum + w.metrics.automationScore,
            0,
          ) / processes.workflows.length,
        )
      : null;
  const riskHealth = clamp(100 - severityPenalty(risks));

  const components: ExecutiveScoreComponent[] = [];

  const push = (
    id: string,
    label: string,
    score: number | null,
    weight: number,
  ) => {
    if (score == null) return;
    components.push({ id, label, score: clamp(score), weight });
  };

  push("understanding", "Comprensión del negocio", understanding, 0.22);
  push("health", "Salud consultiva", health, 0.22);
  push("maturity", "Madurez operativa", maturity, 0.18);
  push("risk", "Exposición a riesgos", riskHealth, 0.18);
  push("confidence", "Calidad de evidencia", confidence, 0.1);
  push(
    "automation",
    "Automatización",
    processAutomation ?? automationMaturity,
    0.1,
  );

  if (components.length === 0) {
    return {
      overall: understanding,
      label: scoreLabel(understanding),
      components: [
        {
          id: "understanding",
          label: "Comprensión del negocio",
          score: understanding,
          weight: 1,
        },
      ],
    };
  }

  const weightSum = components.reduce((s, c) => s + c.weight, 0);
  const overall = clamp(
    components.reduce((s, c) => s + c.score * (c.weight / weightSum), 0),
  );

  return {
    overall,
    label: scoreLabel(overall),
    components,
  };
}
