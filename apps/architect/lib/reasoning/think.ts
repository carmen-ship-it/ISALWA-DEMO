import { absorbAnswerIntoMemory } from "@/lib/reasoning/memory/absorb";
import {
  formatThinkingPreamble,
  markQuestionAsked,
  planNextQuestion,
} from "@/lib/reasoning/planner/next-question";
import { generateInsights } from "@/lib/reasoning/observations/insights";
import { generateOpportunities } from "@/lib/reasoning/recommendations/opportunities";
import { evaluateConsultingIntelligence } from "@/lib/consulting";
import { createId, nowIso } from "@/lib/utils";
import type {
  Interview,
  Question,
} from "@/types";

export interface ThoughtResult {
  interview: Interview;
  architectMessage: string;
  shouldConclude: boolean;
  nextQuestion: Question | null;
}

const MAX_ADAPTIVE_QUESTIONS = 18;

/**
 * Consultant brain — runs after every substantive answer.
 * Mission 5: deterministic consulting intelligence updates every turn.
 * UI must never contain this logic; it only renders the result.
 */
export function think(
  interview: Interview,
  answerText: string,
  answeredQuestion: Question | null,
): ThoughtResult {
  const absorbed = absorbAnswerIntoMemory(
    interview.memory,
    interview.business,
    answerText,
    answeredQuestion,
  );

  let memory = markQuestionAsked(
    absorbed.memory,
    answeredQuestion?.questionKey,
  );
  const business = absorbed.business;

  // Mission 5 — deepen consulting evaluation (no LLM).
  memory = evaluateConsultingIntelligence(memory, business, answerText);

  const existingObs = new Set(interview.observations.map((item) => item.id));
  const { observations: newObservations, insights: newInsights } =
    generateInsights(
      memory,
      business.signals.map((signal) => ({
        id: signal.id,
        evidence: signal.evidence,
      })),
      existingObs,
    );

  const existingOpp = new Set(interview.opportunities.map((item) => item.id));
  const newOpportunities = generateOpportunities(
    memory,
    business.signals.map((signal) => signal.id),
    existingOpp,
  );

  memory = {
    ...memory,
    summary: {
      ...memory.summary,
      opportunities: Array.from(
        new Set([
          ...memory.summary.opportunities,
          ...newOpportunities.map((item) => item.title),
          ...memory.consulting.opportunities.map((item) => item.title),
        ]),
      ),
    },
  };

  const interviewQuestionCount =
    interview.conversation.interviewQuestionCount +
    (interview.phase === "interview" || interview.phase === "business" ? 1 : 0);

  const forceConclude =
    interviewQuestionCount >= MAX_ADAPTIVE_QUESTIONS &&
    memory.followUpQueue.length === 0;

  const shouldConclude =
    (memory.score.readyToConclude || forceConclude) &&
    interview.phase === "interview";

  if (shouldConclude) {
    const preamble = formatThinkingPreamble(memory);
    const message = `${preamble}\n\nI have enough confidence to draft the blueprint. Give me a moment to synthesize.`;

    const nextInterview: Interview = {
      ...interview,
      business,
      memory,
      observations: [...interview.observations, ...newObservations],
      insights: [...interview.insights, ...newInsights],
      opportunities: [...interview.opportunities, ...newOpportunities],
      phase: "synthesizing",
      estimatedMinutesRemaining: 1,
      updatedAt: nowIso(),
      conversation: {
        ...interview.conversation,
        interviewQuestionCount,
        currentQuestion: null,
        topicsCovered: Array.from(
          new Set([
            ...interview.conversation.topicsCovered,
            ...(answeredQuestion?.questionKey
              ? [answeredQuestion.questionKey]
              : []),
          ]),
        ),
        turns: [
          ...interview.conversation.turns,
          {
            id: createId("turn"),
            role: "architect",
            content: message,
            createdAt: nowIso(),
          },
        ],
      },
    };

    return {
      interview: nextInterview,
      architectMessage: message,
      shouldConclude: true,
      nextQuestion: null,
    };
  }

  const nextQuestion = planNextQuestion(memory);
  const preamble = formatThinkingPreamble(memory);

  const message = nextQuestion
    ? `${preamble}\n\n${nextQuestion.prompt}`
    : `${preamble}\n\nI have enough to draft the first blueprint.`;

  const nextInterview: Interview = {
    ...interview,
    business,
    memory,
    observations: [...interview.observations, ...newObservations],
    insights: [...interview.insights, ...newInsights],
    opportunities: [...interview.opportunities, ...newOpportunities],
    phase: nextQuestion ? "interview" : "synthesizing",
    estimatedMinutesRemaining: Math.max(
      3,
      interview.estimatedTotalMinutes -
        interview.conversation.answers.length * 2,
    ),
    updatedAt: nowIso(),
    conversation: {
      ...interview.conversation,
      interviewQuestionCount,
      currentQuestion: nextQuestion,
      topicsCovered: Array.from(
        new Set([
          ...interview.conversation.topicsCovered,
          ...(answeredQuestion?.questionKey
            ? [answeredQuestion.questionKey]
            : []),
        ]),
      ),
      turns: [
        ...interview.conversation.turns,
        {
          id: createId("turn"),
          role: "architect",
          content: message,
          createdAt: nowIso(),
        },
      ],
    },
  };

  return {
    interview: nextInterview,
    architectMessage: message,
    shouldConclude: !nextQuestion,
    nextQuestion,
  };
}

export { createEmptyMemory } from "@/lib/reasoning/memory/absorb";
