import type {
  ConversationMemory,
  DiscoveryDimension,
  DiscoveryScore,
  DimensionStatus,
  Industry,
  UnknownFact,
} from "@/types";

export const DIMENSION_LABELS: Record<DiscoveryDimension, string> = {
  sales: "Ventas",
  customers: "Clientes",
  geography: "Geografía",
  team: "Equipo",
  operations: "Operaciones",
  finance: "Finanzas",
  production: "Producción",
  systems: "Sistemas",
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

/** Industries where production planning is not a required discovery dimension. */
const PRODUCTION_OPTIONAL: ReadonlySet<Industry> = new Set([
  "services",
  "retail",
  "healthcare",
]);

/** Minimum business understanding before the interview may conclude. */
export const CONCLUSION_THRESHOLD = 78;

export function createEmptyScore(): DiscoveryScore {
  return {
    overall: 0,
    dimensions: CORE_DIMENSIONS.map((id) => ({
      id,
      label: DIMENSION_LABELS[id],
      covered: false,
      confidence: 0,
      applicable: true,
    })),
    readyToConclude: false,
    stillNeed: CORE_DIMENSIONS.map((id) => DIMENSION_LABELS[id]),
  };
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** Recompute score and keep summary fields aligned — single source of truth. */
export function applyDiscoveryScore(
  memory: ConversationMemory,
): ConversationMemory {
  const score = computeDiscoveryScore(memory);
  return {
    ...memory,
    score,
    summary: {
      ...memory.summary,
      confidenceScore: score.overall,
      missingInformation: score.stillNeed,
    },
  };
}

export function computeDiscoveryScore(
  memory: ConversationMemory,
): DiscoveryScore {
  const factKeys = new Set(memory.knownFacts.map((fact) => fact.key));
  const asked = new Set(memory.askedQuestionKeys);
  const industry = memory.summary.industry;
  const productionApplicable = !PRODUCTION_OPTIONAL.has(industry);

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

  // Slight boost only when production evidence already exists — never invent coverage.
  if (
    productionApplicable &&
    (industry === "manufacturing" || industry === "distribution") &&
    dimensionConfidence.production > 0
  ) {
    dimensionConfidence.production = Math.min(
      100,
      dimensionConfidence.production + 5,
    );
  }

  const dimensions: DimensionStatus[] = CORE_DIMENSIONS.map((id) => {
    const applicable = id !== "production" || productionApplicable;
    const confidence = applicable ? dimensionConfidence[id] : 0;
    return {
      id,
      label: DIMENSION_LABELS[id],
      applicable,
      // Non-applicable dims do not block conclusion and are not "gaps".
      covered: applicable ? confidence >= 55 : true,
      confidence,
    };
  });

  // Overall = average of applicable category confidences only (one source of truth).
  const scored = dimensions.filter((d) => d.applicable !== false);
  const avg =
    scored.length === 0
      ? 0
      : scored.reduce((sum, d) => sum + d.confidence, 0) / scored.length;
  const overall = clamp(avg);

  const stillNeed = [
    ...dimensions
      .filter((d) => d.applicable !== false && !d.covered)
      .map((d) => d.label),
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
  _asked: Set<string>,
  keys: string[],
): number {
  let score = 0;
  for (const key of keys) {
    // Evidence only — asking a question must not inflate understanding.
    if (factKeys.has(key)) score += 34;
  }
  return Math.min(100, score);
}

export function unknownsFromGaps(score: DiscoveryScore): UnknownFact[] {
  return score.dimensions
    .filter((dimension) => dimension.applicable !== false && !dimension.covered)
    .map((dimension, index) => ({
      id: `unknown_${dimension.id}`,
      key: dimension.id,
      label: dimension.label,
      priority: 80 - index * 5,
      dimension: dimension.id,
      reason: `Aún falta claridad sobre ${dimension.label}.`,
    }));
}
