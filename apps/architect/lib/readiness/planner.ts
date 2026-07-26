/**
 * Consultant Readiness Engine — adaptive interview filters.
 *
 * The question planner (`lib/consulting/questions`) already ranks candidates
 * by information gain. Readiness adds the judgement a senior consultant
 * brings to the same list: *don't ask what the file already answers.* A
 * handbook covers HR, SOPs cover the process, an explained approval chain
 * closes finance — so those topics drop out of the pool instead of being
 * asked again.
 *
 * This module deliberately adds **no score term**: readiness is derived from
 * the very numbers the planner already weighs, so scoring it twice would
 * double-count the same evidence. It only filters, and it only ever narrows
 * a pool it can prove is safe to narrow.
 *
 * Nor does it decide when the interview ends. That bar is the conclusion
 * threshold in `computeDiscoveryScore`, and readiness does not move it —
 * whether we have heard enough to advise is reported to the client through
 * `assessment.advice`, not enforced against the planner.
 *
 * Imported only through leaf modules so the planner ↔ readiness relationship
 * stays acyclic.
 */

import type { ConversationMemory, DiscoveryDimension } from "@/types";
import { evaluateReadiness } from "./evaluate";
import { snapshotFromMemory } from "./snapshot";
import type {
  ReadinessAssessment,
  ReadinessInterviewAction,
  ReadinessState,
  TopicReadiness,
} from "./types";

/** Intents that exist to resolve something open — never filtered away. */
const ALWAYS_KEEP_INTENTS = new Set([
  "contradiction",
  "follow_up",
  "consequence",
]);

export interface ReadinessFilterCandidate {
  key: string;
  dimension: DiscoveryDimension;
  intent?: string;
}

/** Readiness for the live interview, derived from working memory alone. */
export function assessMemoryReadiness(
  memory: ConversationMemory,
): ReadinessAssessment {
  return evaluateReadiness(snapshotFromMemory(memory));
}

/** What the interview should do about one topic right now. */
export function topicInterviewAction(
  assessment: ReadinessAssessment,
  dimension: DiscoveryDimension,
): ReadinessInterviewAction {
  return (
    assessment.topics.find((topic) => topic.topic === dimension)
      ?.interviewAction ?? "ask"
  );
}

const STATE_URGENCY: Record<ReadinessState, number> = {
  needs_information: 0,
  almost_ready: 1,
  ready: 2,
};

/**
 * The topic a group of dimensions should be judged by — the least ready one,
 * because that is what still holds the group back. Used by the guided
 * interview to tell the client where the current stage stands.
 */
export function pickTopicReadiness(
  assessment: ReadinessAssessment,
  dimensions: DiscoveryDimension[],
): TopicReadiness | null {
  const matches = assessment.topics.filter(
    (topic) => topic.applicable && dimensions.includes(topic.topic),
  );
  if (matches.length === 0) return null;
  return matches
    .slice()
    .sort((a, b) => STATE_URGENCY[a.state] - STATE_URGENCY[b.state])[0]!;
}

/**
 * Drop candidates whose topic the evidence already answers.
 *
 * Two guardrails keep this from ever starving the interview: clarification
 * intents survive the filter, and an empty result falls back to the original
 * pool — readiness may skip a question, never the conversation.
 */
export function filterQuestionsByReadiness<T extends ReadinessFilterCandidate>(
  memory: ConversationMemory,
  candidates: T[],
  assessment: ReadinessAssessment = assessMemoryReadiness(memory),
): T[] {
  if (candidates.length === 0) return candidates;

  const skippable = new Set(
    assessment.topics
      .filter((topic) => topic.interviewAction === "skip")
      .map((topic) => topic.topic),
  );
  if (skippable.size === 0) return candidates;

  const kept = candidates.filter(
    (candidate) =>
      !skippable.has(candidate.dimension) ||
      (candidate.intent != null && ALWAYS_KEEP_INTENTS.has(candidate.intent)),
  );

  return kept.length > 0 ? kept : candidates;
}
