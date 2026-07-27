import { formatThinkingPreamble, markQuestionAsked, planNextQuestion } from "@/lib/reasoning";
import { createId, nowIso } from "@/lib/utils";
import type { ConversationTurn, Interview, Question } from "@/types";
import type { GuidedStageDefinition } from "@/lib/discovery/stages";

/**
 * Guided Assessment orchestration actions.
 *
 * Everything here composes EXISTING exported engine functions
 * (`markQuestionAsked`, `planNextQuestion` from lib/reasoning) — nothing
 * here scores an answer, upserts a fact, or reorders the adaptive
 * planner. It only decides what the UI shows next.
 */

function createTurn(
  role: ConversationTurn["role"],
  content: string,
): ConversationTurn {
  return { id: createId("turn"), role, content, createdAt: nowIso() };
}

/**
 * Skip the currently active adaptive question.
 *
 * Marks the question's key "asked" (so the planner never offers it again)
 * WITHOUT recording an answer or touching `knownFacts`. Discovery score is
 * computed purely from fact evidence (see scoreDimension in
 * lib/reasoning/confidence/score.ts, which never reads asked keys) — so
 * skipping a question can never inflate Business Understanding.
 */
export function skipCurrentQuestion(interview: Interview): Interview {
  const current = interview.conversation.currentQuestion;
  if (!current || interview.phase !== "interview") return interview;

  const memory = markQuestionAsked(interview.memory, current.questionKey);
  const nextQuestion = planNextQuestion(memory);

  const message = nextQuestion
    ? `Sin problema, seguimos con otra pregunta.\n\n${nextQuestion.prompt}`
    : "Sin problema. Por ahora no tengo más preguntas pendientes para esta sesión.";

  return {
    ...interview,
    memory,
    updatedAt: nowIso(),
    phase: nextQuestion ? "interview" : "synthesizing",
    conversation: {
      ...interview.conversation,
      currentQuestion: nextQuestion,
      turns: [...interview.conversation.turns, createTurn("architect", message)],
    },
  };
}

const MAX_STAGE_SKIP_STEPS = 8;

/**
 * Skip every consecutive question the planner offers for the given
 * dimensions (i.e. "skip this stage"), bounded so a change of topic by the
 * planner always wins. Stops immediately once the planner moves to a
 * different dimension or runs out of questions.
 */
export function skipCurrentStage(
  interview: Interview,
  stageDimensions: ReadonlySet<string>,
): Interview {
  let next = interview;
  for (let i = 0; i < MAX_STAGE_SKIP_STEPS; i += 1) {
    const dimension = next.conversation.currentQuestion?.dimension;
    if (next.phase !== "interview" || !dimension || !stageDimensions.has(dimension)) {
      break;
    }
    next = skipCurrentQuestion(next);
  }
  return next;
}

export interface StageSwitchResult {
  interview: Interview;
  /** True when the chosen stage has no unanswered question left — evidence already covers it. */
  stageDone: boolean;
}

/**
 * Free stage navigation (Guided Assessment UX).
 *
 * The adaptive engine (`planNextQuestion` / Mission 10 consultant ranking)
 * still owns which question is highest-value — this only narrows its ranked
 * pool to the dimensions of the stage the client just chose, so picking
 * "Finanzas" surfaces a finance question instead of whatever globally ranks
 * higher. It replaces the still-unanswered question at the top of the
 * conversation (never a question the client already answered) with the new
 * one, rewriting only that last architect turn so the visible narrative
 * always matches the active question.
 *
 * Returns `stageDone: true` (interview unchanged) when the stage's
 * dimensions are already fully covered by evidence — callers should tell
 * the client to review that stage or pick another one, never fabricate a
 * question the engine has nothing left to ask.
 */
export function switchToStage(
  interview: Interview,
  stage: GuidedStageDefinition,
): StageSwitchResult {
  if (interview.phase !== "interview" || stage.dimensions.length === 0) {
    return { interview, stageDone: false };
  }

  const dimensions = new Set(stage.dimensions);
  const nextQuestion = planNextQuestion(interview.memory, dimensions);

  const turns = interview.conversation.turns;
  const lastTurn = turns[turns.length - 1];
  const replacesPendingQuestion =
    lastTurn?.role === "architect" &&
    interview.conversation.currentQuestion !== null;

  if (!nextQuestion) {
    const message = `Ya tenemos buena evidencia en ${stage.title.toLowerCase()} — no hay más preguntas pendientes aquí. Puede revisar lo registrado o elegir otra etapa.`;
    const doneTurns = replacesPendingQuestion
      ? [...turns.slice(0, -1), { ...lastTurn, content: message }]
      : [...turns, createTurn("architect", message)];

    return {
      interview: {
        ...interview,
        updatedAt: nowIso(),
        conversation: {
          ...interview.conversation,
          currentQuestion: null,
          turns: doneTurns,
        },
      },
      stageDone: true,
    };
  }

  const preamble = formatThinkingPreamble(interview.memory);
  const message = `${preamble}\n\n${nextQuestion.prompt}`;

  const nextTurns = replacesPendingQuestion
    ? [...turns.slice(0, -1), { ...lastTurn, content: message }]
    : [...turns, createTurn("architect", message)];

  return {
    interview: {
      ...interview,
      updatedAt: nowIso(),
      conversation: {
        ...interview.conversation,
        currentQuestion: nextQuestion,
        turns: nextTurns,
      },
    },
    stageDone: false,
  };
}

/**
 * Reopen a previously answered topic for editing.
 *
 * Installs a reconstructed Question (see lib/discovery/question-lookup.ts —
 * built from existing catalog/library copy, never invented) as the active
 * question. Submitting through the normal answer path
 * (architectAgent.handleTurn → submitAnswer → think → absorbAnswerIntoMemory)
 * re-runs the unmodified engine pipeline, which upserts the SAME
 * knownFacts entry by key — a genuine in-place edit using only existing
 * engine APIs, no engine rewrite.
 */
export function prepareAnswerEdit(
  interview: Interview,
  question: Question,
): Interview {
  if (interview.phase === "complete") return interview;
  return {
    ...interview,
    // Facts only ever exist once onboarding has resolved into "interview" —
    // normalizing here avoids re-triggering the identity/company branches.
    phase: "interview",
    conversation: {
      ...interview.conversation,
      currentQuestion: question,
    },
  };
}
