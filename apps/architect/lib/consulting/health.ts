import type {
  BusinessHealthModel,
  ConsultingRisk,
  ConversationMemory,
  HealthDimension,
  MaturityModel,
  ScoredDimension,
} from "@/types";

const LABELS: Record<HealthDimension, string> = {
  commercial: "Commercial",
  operations: "Operations",
  technology: "Technology",
  people: "People",
  processes: "Processes",
  data: "Data",
  ai_readiness: "AI Readiness",
  execution: "Execution",
};

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function maturityScore(maturity: MaturityModel, id: string): number {
  return maturity.dimensions.find((d) => d.id === id)?.score ?? 40;
}

/**
 * Business health gauges — derived from maturity + risks.
 */
export function evaluateHealth(
  memory: ConversationMemory,
  maturity: MaturityModel,
  risks: ConsultingRisk[],
): BusinessHealthModel {
  const riskPenalty = Math.min(35, risks.length * 5);
  const criticalPenalty =
    risks.filter((r) => r.severity === "critical").length * 8;
  const open = memory.score.stillNeed.length;

  const gauges: ScoredDimension[] = [
    gauge(
      "commercial",
      maturityScore(maturity, "sales") * 0.6 +
        maturityScore(maturity, "customer") * 0.4,
      maturity.confidence,
      memory.summary.customerCountHint
        ? [memory.summary.customerCountHint]
        : ["Commercial signals from discovery"],
    ),
    gauge(
      "operations",
      maturityScore(maturity, "operations") - riskPenalty * 0.3,
      maturity.confidence,
      memory.painPoints.map((p) => p.title).slice(0, 3),
    ),
    gauge(
      "technology",
      maturityScore(maturity, "technology") - riskPenalty * 0.2,
      maturity.confidence,
      memory.summary.currentSoftware.slice(0, 4),
    ),
    gauge(
      "people",
      maturityScore(maturity, "people") - criticalPenalty * 0.4,
      maturity.confidence,
      memory.summary.teamHint ? [memory.summary.teamHint] : [],
    ),
    gauge(
      "processes",
      maturityScore(maturity, "documentation") * 0.5 +
        maturityScore(maturity, "operations") * 0.5 -
        riskPenalty * 0.25,
      maturity.confidence,
      memory.assumptions.map((a) => a.statement).slice(0, 2),
    ),
    gauge(
      "data",
      maturityScore(maturity, "data") - riskPenalty * 0.35,
      maturity.confidence,
      memory.summary.currentSoftware.slice(0, 3),
    ),
    gauge(
      "ai_readiness",
      clamp(
        maturityScore(maturity, "data") * 0.5 +
          maturityScore(maturity, "automation") * 0.3 +
          maturityScore(maturity, "documentation") * 0.2 -
          criticalPenalty,
      ),
      Math.max(20, maturity.confidence - 15),
      [
        "AI readiness follows data quality, process clarity, and ownership — not tooling fashion.",
      ],
    ),
    gauge(
      "execution",
      clamp(memory.summary.confidenceScore - open * 3 - riskPenalty * 0.2),
      memory.summary.confidenceScore,
      memory.score.stillNeed.slice(0, 3).map((item) => `Open: ${item}`),
    ),
  ];

  const overall = clamp(
    gauges.reduce((sum, g) => sum + g.score, 0) / gauges.length,
  );
  const confidence = clamp(
    gauges.reduce((sum, g) => sum + g.confidence, 0) / gauges.length,
  );

  return { gauges, overall, confidence };
}

function gauge(
  id: HealthDimension,
  score: number,
  confidence: number,
  evidence: string[],
): ScoredDimension {
  return {
    id,
    label: LABELS[id],
    score: clamp(score),
    confidence: clamp(confidence),
    evidence:
      evidence.length > 0 ? evidence : [`Emerging signal for ${LABELS[id]}.`],
  };
}

export function emptyHealth(): BusinessHealthModel {
  return {
    gauges: (Object.keys(LABELS) as HealthDimension[]).map((id) => ({
      id,
      label: LABELS[id],
      score: 0,
      confidence: 0,
      evidence: [],
    })),
    overall: 0,
    confidence: 0,
  };
}
