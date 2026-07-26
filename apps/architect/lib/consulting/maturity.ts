import type {
  BusinessProfile,
  ConversationMemory,
  MaturityDimension,
  MaturityModel,
  ScoredDimension,
} from "@/types";

const LABELS: Record<MaturityDimension, string> = {
  sales: "Madurez comercial",
  operations: "Madurez operativa",
  finance: "Madurez financiera",
  technology: "Madurez tecnológica",
  leadership: "Madurez de liderazgo",
  documentation: "Madurez de documentación",
  automation: "Madurez de automatización",
  data: "Madurez de datos",
  customer: "Madurez de clientes",
  people: "Madurez de personas",
};

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function textBlob(memory: ConversationMemory, business: BusinessProfile): string {
  return [
    ...memory.knownFacts.map((f) => f.statement),
    ...memory.painPoints.map((p) => `${p.title} ${p.description}`),
    ...memory.summary.painPoints,
    ...business.signals.map((s) => s.label),
    ...memory.summary.currentSoftware,
    business.description ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

function scoreFromSignals(
  base: number,
  positives: number,
  negatives: number,
  coverage: number,
): { score: number; confidence: number } {
  const score = clamp(base + positives * 8 - negatives * 12);
  const confidence = clamp(25 + coverage * 15 + (positives + negatives) * 8);
  return { score, confidence };
}

/**
 * Continuous business maturity scoring — deterministic.
 */
export function evaluateMaturity(
  memory: ConversationMemory,
  business: BusinessProfile,
): MaturityModel {
  const blob = textBlob(memory, business);
  const facts = memory.knownFacts.length;
  const pains = memory.painPoints.length;
  const tools = memory.summary.currentSoftware.length;
  const covered = memory.score.dimensions.filter((d) => d.covered).length;

  const dims: Array<{
    id: MaturityDimension;
    positives: number;
    negatives: number;
    evidence: string[];
  }> = [
    {
      id: "sales",
      positives:
        Number(/crm|pipeline|quote|advisor|sales process/i.test(blob)) +
        Number(Boolean(memory.summary.customerCountHint)),
      negatives: Number(/whatsapp|lost.*history|no pipeline/i.test(blob)),
      evidence: memory.knownFacts
        .filter((f) => /sales|customer|quote|commercial/i.test(f.statement))
        .map((f) => f.statement)
        .slice(0, 3),
    },
    {
      id: "operations",
      positives: Number(/process|workflow|sop|standard/i.test(blob)),
      negatives: Number(
        /manual|bottleneck|excel everywhere|paper|tribal/i.test(blob),
      ),
      evidence: memory.painPoints
        .filter((p) => /ops|manual|process|production|purchas/i.test(p.title))
        .map((p) => p.title)
        .slice(0, 3),
    },
    {
      id: "finance",
      positives: Number(/invoice|collection|accounting|erp/i.test(blob)),
      negatives: Number(/manual approv|no audit|spreadsheet.*finance/i.test(blob)),
      evidence: memory.knownFacts
        .filter((f) => /finance|invoice|collect|approv|credit/i.test(f.statement))
        .map((f) => f.statement)
        .slice(0, 3),
    },
    {
      id: "technology",
      positives: Number(tools > 0) + Number(/erp|crm|system of record/i.test(blob)),
      negatives: Number(/excel|whatsapp|paper|google sheets/i.test(blob)),
      evidence: memory.summary.currentSoftware.slice(0, 4),
    },
    {
      id: "leadership",
      positives:
        Number(Boolean(memory.summary.teamHint)) +
        Number(/owner|founder|manager|leadership/i.test(blob)),
      negatives: Number(/single person|one person|only i know/i.test(blob)),
      evidence: memory.summary.teamHint ? [memory.summary.teamHint] : [],
    },
    {
      id: "documentation",
      positives: Number(/document|sop|policy|handbook/i.test(blob)),
      negatives: Number(
        /no (sop|documentation)|don'?t document|undocumented/i.test(blob),
      ),
      evidence: memory.assumptions
        .filter((a) => /document|sop|policy/i.test(a.statement))
        .map((a) => a.statement)
        .slice(0, 2),
    },
    {
      id: "automation",
      positives: Number(/automat|workflow engine|integration/i.test(blob)),
      negatives: Number(/manual|by hand|copy.?paste|re-?enter/i.test(blob)),
      evidence: memory.painPoints
        .filter((p) => /manual|duplicate|approv/i.test(p.title))
        .map((p) => p.title)
        .slice(0, 3),
    },
    {
      id: "data",
      positives: Number(/database|crm|single source|master data/i.test(blob)),
      negatives: Number(
        /excel|lost|fragment|no (shared|central) (history|record)/i.test(blob),
      ),
      evidence: business.signals
        .filter((s) => /excel|visibility|whatsapp/i.test(s.id))
        .map((s) => s.label)
        .slice(0, 3),
    },
    {
      id: "customer",
      positives:
        Number(Boolean(memory.summary.customerCountHint)) +
        Number(/customer history|crm|account/i.test(blob)),
      negatives: Number(/whatsapp.*customer|lost.*customer/i.test(blob)),
      evidence: memory.summary.customerCountHint
        ? [memory.summary.customerCountHint]
        : [],
    },
    {
      id: "people",
      positives:
        Number(Boolean(memory.summary.teamHint)) +
        Number(/roles|department|team/i.test(blob)),
      negatives: Number(/tribal|only .+ knows|key person/i.test(blob)),
      evidence: memory.summary.teamHint ? [memory.summary.teamHint] : [],
    },
  ];

  const dimensions: ScoredDimension[] = dims.map((dim) => {
    const base = 42 + Math.min(facts, 6) * 3 - Math.min(pains, 5) * 2;
    const { score, confidence } = scoreFromSignals(
      base,
      dim.positives,
      dim.negatives,
      covered,
    );
    return {
      id: dim.id,
      label: LABELS[dim.id],
      score,
      confidence,
      evidence:
        dim.evidence.length > 0
          ? dim.evidence
          : [`Evidencia directa limitada sobre ${LABELS[dim.id].toLowerCase()}.`],
    };
  });

  const overall = clamp(
    dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length,
  );
  const confidence = clamp(
    dimensions.reduce((sum, d) => sum + d.confidence, 0) / dimensions.length,
  );

  return { dimensions, overall, confidence };
}

export function emptyMaturity(): MaturityModel {
  return {
    dimensions: (Object.keys(LABELS) as MaturityDimension[]).map((id) => ({
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
