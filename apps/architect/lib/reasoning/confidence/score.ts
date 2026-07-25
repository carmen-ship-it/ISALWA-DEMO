import type {
  ConversationMemory,
  DiscoveryDimension,
  DiscoveryScore,
  DimensionStatus,
  UnknownFact,
} from "@/types";

export const DIMENSION_LABELS: Record<DiscoveryDimension, string> = {
  sales: "Sales",
  customers: "Customers",
  geography: "Geography",
  team: "Team",
  operations: "Operations",
  finance: "Finance",
  production: "Production",
  systems: "Systems",
};

const CORE_DIMENSIONS: DiscoveryDimension[] = [
  "sales",
  "customers",
  "geography",
  "team",
  "operations",
  "finance",
  "production",
  "systems",
];

/** Minimum business understanding before the interview may conclude. */
export const CONCLUSION_THRESHOLD = 78;

export function createEmptyScore(): DiscoveryScore {
  return {
    overall: 8,
    dimensions: CORE_DIMENSIONS.map((id) => ({
      id,
      label: DIMENSION_LABELS[id],
      covered: false,
      confidence: 0,
    })),
    readyToConclude: false,
    stillNeed: CORE_DIMENSIONS.map((id) => DIMENSION_LABELS[id]),
  };
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function computeDiscoveryScore(
  memory: ConversationMemory,
): DiscoveryScore {
  const factKeys = new Set(memory.knownFacts.map((fact) => fact.key));
  const asked = new Set(memory.askedQuestionKeys);

  const dimensionConfidence: Record<DiscoveryDimension, number> = {
    sales: scoreDimension(factKeys, asked, [
      "sales_motion",
      "order_intake",
      "fact_sales",
    ]),
    customers: scoreDimension(factKeys, asked, [
      "customer_contact",
      "fact_customers",
      "customer_count",
    ]),
    geography: scoreDimension(factKeys, asked, [
      "geography",
      "fact_geography",
    ]),
    team: scoreDimension(factKeys, asked, [
      "team_structure",
      "fact_team",
      "departments",
    ]),
    operations: scoreDimension(factKeys, asked, [
      "bottlenecks",
      "order_intake",
      "inventory_flow",
      "fulfillment",
    ]),
    finance: scoreDimension(factKeys, asked, [
      "finance_process",
      "approvals",
      "collections",
      "revenue_stage",
    ]),
    production: scoreDimension(factKeys, asked, [
      "production_planning",
      "manufacturing_flow",
      "work_orders",
    ]),
    systems: scoreDimension(factKeys, asked, [
      "current_software",
      "information_storage",
      "excel_depth",
      "whatsapp_depth",
      "paper_depth",
    ]),
  };

  // Industry-aware weighting: production less critical for services/retail.
  const industry = memory.summary.industry;
  if (industry === "services" || industry === "retail" || industry === "healthcare") {
    dimensionConfidence.production = Math.max(
      dimensionConfidence.production,
      memory.summary.industry !== "unknown" ? 55 : 0,
    );
  }
  if (industry === "manufacturing" || industry === "distribution") {
    dimensionConfidence.production = Math.min(
      100,
      dimensionConfidence.production + 5,
    );
  }

  const dimensions: DimensionStatus[] = CORE_DIMENSIONS.map((id) => {
    const confidence = dimensionConfidence[id];
    return {
      id,
      label: DIMENSION_LABELS[id],
      covered: confidence >= 55,
      confidence,
    };
  });

  const coveredCount = dimensions.filter((d) => d.covered).length;
  const avg =
    dimensions.reduce((sum, d) => sum + d.confidence, 0) / dimensions.length;
  const industryBoost = memory.summary.industryConfidence * 12;
  const factBoost = Math.min(18, memory.knownFacts.length * 2);
  const overall = clamp(avg * 0.7 + coveredCount * 4 + industryBoost + factBoost);

  const stillNeed = [
    ...dimensions.filter((d) => !d.covered).map((d) => d.label),
    ...memory.unknownFacts
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 3)
      .map((u) => u.label),
  ].filter((value, index, arr) => arr.indexOf(value) === index);

  const criticalCovered = ["sales", "customers", "systems", "operations"].every(
    (id) => dimensions.find((d) => d.id === id)?.covered,
  );

  const readyToConclude =
    overall >= CONCLUSION_THRESHOLD &&
    criticalCovered &&
    memory.followUpQueue.length === 0;

  return {
    overall,
    dimensions,
    readyToConclude,
    stillNeed: stillNeed.slice(0, 6),
  };
}

function scoreDimension(
  factKeys: Set<string>,
  asked: Set<string>,
  keys: string[],
): number {
  let score = 0;
  for (const key of keys) {
    if (factKeys.has(key) || asked.has(key)) score += 34;
  }
  return Math.min(100, score);
}

export function unknownsFromGaps(score: DiscoveryScore): UnknownFact[] {
  return score.dimensions
    .filter((dimension) => !dimension.covered)
    .map((dimension, index) => ({
      id: `unknown_${dimension.id}`,
      key: dimension.id,
      label: dimension.label,
      priority: 80 - index * 5,
      dimension: dimension.id,
      reason: `Business understanding still weak on ${dimension.label}.`,
    }));
}
