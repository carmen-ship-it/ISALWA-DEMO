import type {
  KnowledgeAsset,
  KnowledgeBusinessRule,
  KnowledgeContradictionFlag,
  KnowledgeCoverageArea,
  KnowledgeCoverageSlice,
  KnowledgeEntity,
  KnowledgeEntityKind,
  KnowledgeEvidenceLogEntry,
  KnowledgeRelationship,
  WorkspaceKnowledge,
} from "@/types";

const AREA_WEIGHT: Record<KnowledgeCoverageArea, number> = {
  Customers: 1,
  Sales: 1,
  Operations: 1,
  Finance: 1,
  HR: 1,
};

/**
 * Coverage is derived from processed knowledge assets — not hard-coded theater.
 * Mock assets still produce real percentages via this function.
 */
export function deriveKnowledgeCoverage(
  assets: KnowledgeAsset[],
): KnowledgeCoverageSlice[] {
  const areas: KnowledgeCoverageArea[] = [
    "Customers",
    "Sales",
    "Operations",
    "Finance",
    "HR",
  ];

  return areas.map((area) => {
    const evidence = assets.filter(
      (asset) =>
        asset.status === "processed" && asset.coverageAreas.includes(area),
    );
    const evidenceAssetIds = evidence.map((a) => a.id);

    if (evidence.length === 0) {
      return {
        area,
        percent: 0,
        evidenceAssetIds,
        note: "Aún no hay evidencia importada.",
      };
    }

    const confidenceSum = evidence.reduce(
      (sum, asset) => sum + asset.confidence * AREA_WEIGHT[area],
      0,
    );
    const avgConfidence = confidenceSum / evidence.length;
    const volumeBonus = Math.min(evidence.length * 12, 36);
    const percent = Math.min(
      98,
      Math.round(avgConfidence * 70 + volumeBonus),
    );

    return {
      area,
      percent,
      evidenceAssetIds,
      note: `${evidence.length} evidencia${evidence.length === 1 ? "" : "s"} · confianza promedio ${Math.round(avgConfidence * 100)}%`,
    };
  });
}

export function emptyWorkspaceKnowledge(): WorkspaceKnowledge {
  return {
    assets: [],
    entities: [],
    relationships: [],
    lastAnalysisAt: null,
    summary: null,
    themes: [],
    unknownAreas: ["Customers", "Sales", "Operations", "Finance", "HR"],
    coverage: deriveKnowledgeCoverage([]),
    businessRules: [],
    contradictions: [],
    evidenceLog: [],
  };
}

export function buildWorkspaceKnowledge(input: {
  assets: KnowledgeAsset[];
  entities: KnowledgeEntity[];
  relationships: KnowledgeRelationship[];
  summary: string;
  themes: string[];
  lastAnalysisAt: string;
  /** Unified Business Knowledge Intake — additive, defaults to []. */
  businessRules?: KnowledgeBusinessRule[];
  contradictions?: KnowledgeContradictionFlag[];
  evidenceLog?: KnowledgeEvidenceLogEntry[];
}): WorkspaceKnowledge {
  const coverage = deriveKnowledgeCoverage(input.assets);
  const unknownAreas = coverage
    .filter((slice) => slice.percent < 40)
    .map((slice) => slice.area);

  return {
    assets: input.assets,
    entities: input.entities,
    relationships: input.relationships,
    lastAnalysisAt: input.lastAnalysisAt,
    summary: input.summary,
    themes: input.themes,
    unknownAreas:
      unknownAreas.length > 0 ? unknownAreas : ["Follow-up interview topics"],
    coverage,
    businessRules: input.businessRules ?? [],
    contradictions: input.contradictions ?? [],
    evidenceLog: input.evidenceLog ?? [],
  };
}

export interface KnowledgeEntitySummary {
  total: number;
  documents: number;
  companies: number;
  departments: number;
  people: number;
  processes: number;
  customers: number;
  suppliers: number;
  systems: number;
}

/**
 * Honest breakdown of what the vault has actually found, by entity kind.
 * Zero counts mean the current pipeline has not produced that kind yet —
 * callers should render an explicit "aún no disponible" state, not fabricate data.
 */
export function summarizeKnowledgeEntities(
  entities: KnowledgeEntity[],
): KnowledgeEntitySummary {
  const count = (kind: KnowledgeEntityKind) =>
    entities.filter((entity) => entity.kind === kind).length;

  return {
    total: entities.length,
    documents: count("Document"),
    companies: count("Company"),
    departments: count("Department"),
    people: count("Person"),
    processes: count("Workflow"),
    customers: count("Customer"),
    suppliers: count("Supplier"),
    systems: count("System"),
  };
}

export function ensureWorkspaceKnowledge(
  knowledge: WorkspaceKnowledge | undefined | null,
): WorkspaceKnowledge {
  if (!knowledge) return emptyWorkspaceKnowledge();
  return {
    ...knowledge,
    assets: knowledge.assets ?? [],
    entities: knowledge.entities ?? [],
    relationships: knowledge.relationships ?? [],
    themes: knowledge.themes ?? [],
    unknownAreas: knowledge.unknownAreas ?? [],
    coverage:
      knowledge.coverage?.length > 0
        ? knowledge.coverage
        : deriveKnowledgeCoverage(knowledge.assets ?? []),
    businessRules: knowledge.businessRules ?? [],
    contradictions: knowledge.contradictions ?? [],
    evidenceLog: knowledge.evidenceLog ?? [],
  };
}
