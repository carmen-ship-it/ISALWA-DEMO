import { lookupQuestionDisplay } from "@/lib/discovery/question-lookup";
import {
  GUIDED_STAGE_ORDER,
  dimensionToStage,
  type GuidedStageId,
} from "@/lib/discovery/stages";
import type { DiscoveryDimension, Interview, KnownFact, QuestionKind } from "@/types";

/**
 * Read-only projection of `interview.memory.knownFacts` for the Guided
 * Assessment Review stage. Facts are the engine's own deduplicated,
 * evidence-backed record of what has been answered (see
 * `upsertFact` in lib/reasoning/memory/absorb.ts) — this module adds no
 * new state, it only formats what already exists.
 */
export interface AnsweredTopic {
  key: string;
  statement: string;
  dimension?: DiscoveryDimension;
  /** 0-100, from the fact's own confidence (already existing evidence weight). */
  confidence: number;
  /** Best-effort original question text — null when no catalog match exists. */
  prompt: string | null;
  kind: QuestionKind;
  placeholder?: string;
  stage: GuidedStageId;
  createdAt: string;
}

/**
 * business_overview is tagged dimension "operations" for historical
 * reasons (see domain/interview-engine.ts) but belongs, presentation-wise,
 * to the Company stage where it was actually asked.
 */
const STAGE_OVERRIDE_BY_KEY: Partial<Record<string, GuidedStageId>> = {
  business_overview: "company",
};

function stageForFact(fact: KnownFact): GuidedStageId {
  return STAGE_OVERRIDE_BY_KEY[fact.key] ?? dimensionToStage(fact.dimension);
}

export function buildAnsweredTopics(interview: Interview): AnsweredTopic[] {
  return interview.memory.knownFacts
    .map((fact): AnsweredTopic => {
      const display = lookupQuestionDisplay(fact.key);
      return {
        key: fact.key,
        statement: fact.statement,
        dimension: fact.dimension,
        confidence: Math.round((fact.confidence ?? 0) * 100),
        prompt: display?.prompt ?? null,
        kind: display?.kind ?? "long_text",
        placeholder: display?.placeholder,
        stage: stageForFact(fact),
        createdAt: fact.createdAt,
      };
    })
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function groupTopicsByStage(
  topics: AnsweredTopic[],
): Record<GuidedStageId, AnsweredTopic[]> {
  const grouped = Object.fromEntries(
    GUIDED_STAGE_ORDER.map((id) => [id, [] as AnsweredTopic[]]),
  ) as Record<GuidedStageId, AnsweredTopic[]>;

  for (const topic of topics) {
    grouped[topic.stage].push(topic);
  }
  return grouped;
}
