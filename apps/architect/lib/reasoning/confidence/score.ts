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

/**
 * Dimensions that must be covered before the interview may conclude — the
 * same four the Readiness Engine gates the Blueprint on.
 */
export const CRITICAL_DIMENSIONS: DiscoveryDimension[] = [
  "sales",
  "customers",
  "systems",
  "operations",
];

/**
 * The fact keys that count as evidence for each dimension. This is the single
 * source of truth for "what do we still not know": `computeDiscoveryScore`
 * counts them, and the Readiness Engine (`lib/readiness`) names the missing
 * ones back to the client in plain Spanish. Keys prefixed `evidence_` are
 * contributed by imported evidence rather than the interview.
 */
export const DIMENSION_EVIDENCE_KEYS: Record<DiscoveryDimension, string[]> = {
  sales: [
    "sales_motion",
    "order_intake",
    "fact_sales",
    "evidence_sales",
    "evidence_sales_strong",
  ],
  customers: [
    "customer_contact",
    "fact_customers",
    "customer_count",
    "evidence_customers",
    "evidence_customers_strong",
  ],
  geography: [
    "geography",
    "fact_geography",
    "evidence_geography",
    "evidence_geography_strong",
  ],
  team: [
    "team_structure",
    "fact_team",
    "departments",
    "evidence_team",
    "evidence_team_strong",
  ],
  operations: [
    "bottlenecks",
    "order_intake",
    "inventory_flow",
    "fulfillment",
    "evidence_operations",
    "evidence_operations_strong",
  ],
  finance: [
    "finance_process",
    "approvals",
    "collections",
    "revenue_stage",
    "evidence_finance",
    "evidence_finance_strong",
  ],
  production: [
    "production_planning",
    "manufacturing_flow",
    "work_orders",
    "evidence_production",
    "evidence_production_strong",
  ],
  systems: [
    "current_software",
    "information_storage",
    "excel_depth",
    "whatsapp_depth",
    "paper_depth",
    "evidence_systems",
    "evidence_systems_strong",
  ],
};

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

  const dimensionConfidence = CORE_DIMENSIONS.reduce(
    (acc, id) => {
      acc[id] = scoreDimension(factKeys, asked, DIMENSION_EVIDENCE_KEYS[id]);
      return acc;
    },
    {} as Record<DiscoveryDimension, number>,
  );

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

  const criticalCovered = CRITICAL_DIMENSIONS.every(
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

/**
 * Confidence points one known evidence key contributes to its dimension.
 * Exported so downstream engines (the Missing Information Engine's
 * confidence-lift estimate, `lib/readiness/missing-information.ts`) can
 * derive an honest "what would this gap be worth" figure from the *same*
 * increment this score uses, instead of inventing a second number.
 */
export const EVIDENCE_FACT_INCREMENT = 34;

function scoreDimension(
  factKeys: Set<string>,
  _asked: Set<string>,
  keys: string[],
): number {
  let score = 0;
  for (const key of keys) {
    // Evidence only — asking a question must not inflate understanding.
    if (factKeys.has(key)) score += EVIDENCE_FACT_INCREMENT;
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
