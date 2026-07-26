import type { ConversationMemory, QuestionCandidate } from "@/types";
import { estimateConfidenceGain } from "./confidence-engine";
import {
  applyConsequenceBias,
  generateConsequenceQuestions,
} from "./consequence-engine";
import {
  CONTRADICTION_LIBRARY,
  HYPOTHESIS_LIBRARY,
  enrichCandidate,
  type LibraryQuestion,
  type QuestionIntent,
} from "./question-library";
import {
  departmentBalanceBoost,
  generateTopicQuestions,
  thinkingModeBoost,
} from "./topic-selection";

export interface PrioritizedQuestion extends LibraryQuestion {
  /** Composite score — highest value unknown wins. */
  score: number;
  scoreBreakdown: {
    basePriority: number;
    confidenceGain: number;
    impactWeight: number;
    intentWeight: number;
    departmentBoost: number;
    modeBoost: number;
    evidenceGapBoost: number;
  };
}

const IMPACT_WEIGHT: Record<LibraryQuestion["estimatedImpact"], number> = {
  critical: 20,
  high: 14,
  medium: 8,
  low: 3,
};

const INTENT_WEIGHT: Record<QuestionIntent, number> = {
  consequence: 22,
  contradiction: 20,
  hypothesis_validation: 16,
  evidence_gap: 14,
  follow_up: 12,
  department_balance: 10,
  discovery: 6,
};

function evidenceGapBoost(
  memory: ConversationMemory,
  question: LibraryQuestion,
): number {
  const dim = memory.score.dimensions.find((d) => d.id === question.dimension);
  if (!dim || dim.applicable === false) return -8;
  if (!dim.covered) return 16 + Math.round((100 - dim.confidence) / 10);
  if (dim.confidence < 45) return 10;
  if (dim.confidence < 65) return 4;
  return -4;
}

/**
 * Score one candidate: maximize business understanding, not questionnaire order.
 */
export function scoreQuestion(
  memory: ConversationMemory,
  raw: LibraryQuestion,
): PrioritizedQuestion {
  const biased = applyConsequenceBias(raw, memory);
  const gain = estimateConfidenceGain(memory, biased);
  const departmentBoost = departmentBalanceBoost(memory, biased.dimension);
  const modeBoost = thinkingModeBoost(memory, biased);
  const gapBoost = evidenceGapBoost(memory, biased);
  const impactWeight = IMPACT_WEIGHT[biased.estimatedImpact];
  const intentWeight = INTENT_WEIGHT[biased.intent];

  const scoreBreakdown = {
    basePriority: biased.priority,
    confidenceGain: gain.expectedGain,
    impactWeight,
    intentWeight,
    departmentBoost,
    modeBoost,
    evidenceGapBoost: gapBoost,
  };

  const score =
    biased.priority +
    gain.expectedGain * 1.4 +
    impactWeight +
    intentWeight +
    departmentBoost +
    modeBoost +
    gapBoost;

  return {
    ...biased,
    confidenceGain: gain.expectedGain,
    reason: `${biased.reason} (${gain.rationale})`,
    score: Math.round(score),
    scoreBreakdown,
  };
}

function contradictionCandidates(
  memory: ConversationMemory,
): LibraryQuestion[] {
  const asked = new Set(memory.askedQuestionKeys);
  const contradictions = [
    ...(memory.consulting?.contradictions ?? []),
    ...memory.contradictions,
  ];
  const statements = [
    ...contradictions.map(
      (c) =>
        `${c.statement} ${"claimA" in c ? (c.claimA ?? "") : ""} ${"claimB" in c ? (c.claimB ?? "") : ""}`,
    ),
    ...memory.whiteboard.contradictions,
  ]
    .join("\n")
    .toLowerCase();

  if (!statements.trim()) return [];

  const matched = CONTRADICTION_LIBRARY.filter((item) => {
    if (asked.has(item.key)) return false;
    if (
      item.key === "clarify_system_vs_spreadsheet" &&
      /spreadsheet|excel|system-of-record|sistema|source of truth/i.test(
        statements,
      )
    ) {
      return true;
    }
    if (
      item.key === "clarify_process_vs_adhoc" &&
      /ad hoc|process discipline|estandar|variable/i.test(statements)
    ) {
      return true;
    }
    if (
      item.key === "clarify_visibility_gap" &&
      /visibility|visibilidad/i.test(statements)
    ) {
      return true;
    }
    if (
      item.key === "clarify_team_capacity" &&
      /team capacity|single-person|one person|persona única|i do everything/i.test(
        statements,
      )
    ) {
      return true;
    }
    return false;
  });

  if (matched.length > 0) return matched.slice(0, 2);

  const fallback = CONTRADICTION_LIBRARY.find((item) => !asked.has(item.key));
  return fallback ? [enrichCandidate(fallback)] : [];
}

function hypothesisCandidates(memory: ConversationMemory): LibraryQuestion[] {
  const asked = new Set(memory.askedQuestionKeys);
  const active = memory.hypotheses.filter((h) => h.status === "active");
  if (active.length === 0) return [];

  const hasToolSignal =
    memory.summary.currentSoftware.length > 0 ||
    memory.painPoints.some((p) => /excel|whatsapp|manual/i.test(p.title));

  return HYPOTHESIS_LIBRARY.filter((item) => {
    if (asked.has(item.key)) return false;
    if (item.triggers?.includes("systems_known") && !hasToolSignal) {
      return false;
    }
    return true;
  }).slice(0, 2);
}

function followUpsAsLibrary(
  memory: ConversationMemory,
): LibraryQuestion[] {
  const asked = new Set(memory.askedQuestionKeys);
  return memory.followUpQueue
    .filter((item) => !asked.has(item.key))
    .map((item) =>
      enrichCandidate(item, {
        intent: "follow_up",
        thinkingMode: "operational",
      }),
    );
}

function catalogAsLibrary(
  catalog: QuestionCandidate[],
  memory: ConversationMemory,
): LibraryQuestion[] {
  const asked = new Set(memory.askedQuestionKeys);
  return catalog
    .filter((item) => !asked.has(item.key))
    .map((item) =>
      enrichCandidate(item, {
        intent: "evidence_gap",
        thinkingMode: "balanced",
      }),
    );
}

/**
 * Build the full candidate pool and rank by business-understanding value.
 */
export function prioritizeQuestions(
  memory: ConversationMemory,
  catalog: QuestionCandidate[] = [],
): PrioritizedQuestion[] {
  const poolMap = new Map<string, LibraryQuestion>();

  const addAll = (items: LibraryQuestion[]) => {
    for (const item of items) {
      const existing = poolMap.get(item.key);
      if (!existing || item.priority > existing.priority) {
        poolMap.set(item.key, item);
      }
    }
  };

  // Order of insertion does not decide winner — score does.
  addAll(generateConsequenceQuestions(memory));
  addAll(contradictionCandidates(memory));
  addAll(hypothesisCandidates(memory));
  addAll(generateTopicQuestions(memory));
  addAll(followUpsAsLibrary(memory));
  addAll(catalogAsLibrary(catalog, memory));

  return Array.from(poolMap.values())
    .map((item) => scoreQuestion(memory, item))
    .sort((a, b) => b.score - a.score || b.priority - a.priority);
}

/**
 * Pick the single highest-value unknown.
 */
export function pickHighestValueQuestion(
  memory: ConversationMemory,
  catalog: QuestionCandidate[] = [],
): PrioritizedQuestion | null {
  const ranked = prioritizeQuestions(memory, catalog);
  return ranked[0] ?? null;
}
