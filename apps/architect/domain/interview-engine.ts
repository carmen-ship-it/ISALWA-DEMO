import {
  ESTIMATED_INTERVIEW_MINUTES,
  ROLE_CHOICES,
  WELCOME_MESSAGE,
} from "@/data/catalog";
import {
  createEmptyMemory,
  formatThinkingPreamble,
  planNextQuestion,
  think,
} from "@/lib/reasoning";
import { createId, nowIso } from "@/lib/utils";
import type {
  Answer,
  ConversationTurn,
  DiscoveryPhase,
  Interview,
  ParticipantRole,
  Question,
} from "@/types";

function createTurn(
  role: ConversationTurn["role"],
  content: string,
  extras?: Partial<ConversationTurn>,
): ConversationTurn {
  return {
    id: createId("turn"),
    role,
    content,
    createdAt: nowIso(),
    ...extras,
  };
}

function canResumeIntoInterview(interview: Interview): boolean {
  return Boolean(
    interview.workspaceId &&
      interview.participant.name &&
      interview.participant.companyName &&
      interview.memory.knownFacts.length > 0,
  );
}

/** Continue adaptive discovery from restored ConversationMemory. */
function enterResumedInterview(interview: Interview): Interview {
  const focus =
    interview.memory.score.stillNeed[0] ??
    interview.memory.questionsRemaining[0]?.label ??
    null;

  const nextQuestion = planNextQuestion(interview.memory);
  const preamble = formatThinkingPreamble(interview.memory);
  const bridge = focus
    ? `Good. Let's continue with ${focus}.`
    : "Good. Let's continue from where we left off.";

  const message = nextQuestion
    ? `${bridge}\n\n${preamble}\n\n${nextQuestion.prompt}`
    : `${bridge}\n\n${preamble}\n\nI have enough to refine the living report.`;

  return touch({
    ...interview,
    phase: nextQuestion ? "interview" : "synthesizing",
    conversation: {
      ...interview.conversation,
      readyConfirmed: true,
      currentQuestion: nextQuestion,
      turns: [
        ...interview.conversation.turns,
        createTurn("architect", message),
      ],
    },
  });
}

export function createInterview(): Interview {
  const welcomeQuestion: Question = {
    id: "q_ready",
    prompt: "Ready?",
    kind: "confirmation",
    questionKey: "ready",
    choices: [
      { id: "ready_yes", label: "Yes, let's begin", value: "yes" },
      { id: "ready_later", label: "Not right now", value: "later" },
    ],
  };

  return {
    id: createId("interview"),
    createdAt: nowIso(),
    updatedAt: nowIso(),
    phase: "welcome",
    workspaceId: null,
    participant: {
      role: null,
      name: null,
      companyName: null,
    },
    business: {
      companyName: null,
      description: null,
      industry: "unknown",
      industryConfidence: 0,
      sizeHint: null,
      currentTools: [],
      signals: [],
      departments: [],
      revenueStage: null,
      businessModel: null,
    },
    conversation: {
      turns: [createTurn("architect", WELCOME_MESSAGE)],
      currentQuestion: welcomeQuestion,
      answers: [],
      topicsCovered: [],
      topicsRemaining: [],
      interviewQuestionCount: 0,
      readyConfirmed: false,
    },
    memory: createEmptyMemory(),
    observations: [],
    opportunities: [],
    insights: [],
    report: null,
    estimatedMinutesRemaining: ESTIMATED_INTERVIEW_MINUTES,
    estimatedTotalMinutes: ESTIMATED_INTERVIEW_MINUTES,
  };
}

function touch(interview: Interview): Interview {
  return { ...interview, updatedAt: nowIso() };
}

function remainingMinutes(interview: Interview): number {
  const answered = interview.conversation.answers.length;
  const total = interview.estimatedTotalMinutes;
  return Math.max(3, total - answered * 2);
}

function appendArchitect(
  interview: Interview,
  message: string,
  question: Question | null,
  phase: DiscoveryPhase,
): Interview {
  return touch({
    ...interview,
    phase,
    estimatedMinutesRemaining: remainingMinutes(interview),
    conversation: {
      ...interview.conversation,
      turns: [...interview.conversation.turns, createTurn("architect", message)],
      currentQuestion: question,
    },
  });
}

function recordAnswer(
  interview: Interview,
  value: string,
): { interview: Interview; answer: Answer; question: Question } {
  const question = interview.conversation.currentQuestion;
  if (!question) {
    throw new Error("No active question to answer.");
  }

  const answer: Answer = {
    id: createId("answer"),
    questionId: question.id,
    value,
    answeredAt: nowIso(),
    raw: value,
  };

  const participantTurn = createTurn("participant", value, {
    questionId: question.id,
    answerId: answer.id,
  });

  const next: Interview = touch({
    ...interview,
    conversation: {
      ...interview.conversation,
      turns: [...interview.conversation.turns, participantTurn],
      answers: [...interview.conversation.answers, answer],
      currentQuestion: null,
    },
  });

  return { interview: next, answer, question };
}

/**
 * Identity onboarding stays linear.
 * After the business description, the consultant brain takes over —
 * no fixed question order.
 */
export function submitAnswer(interview: Interview, value: string): Interview {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Answer cannot be empty.");
  }

  const previousQuestion = interview.conversation.currentQuestion;
  const { interview: withAnswer, question } = recordAnswer(interview, trimmed);
  const phase = withAnswer.phase;

  if (phase === "welcome") {
    if (trimmed === "later") {
      const readyQuestion: Question = {
        id: "q_ready",
        prompt: "Ready?",
        kind: "confirmation",
        questionKey: "ready",
        choices: [
          { id: "ready_yes", label: "Yes, let's begin", value: "yes" },
          { id: "ready_later", label: "Not right now", value: "later" },
        ],
      };

      return appendArchitect(
        withAnswer,
        "No rush. When you are ready, return here and we will begin properly.",
        readyQuestion,
        "welcome",
      );
    }

    // Resume path (Mission 2): identity + memory already known — never restart from zero.
    if (canResumeIntoInterview(withAnswer)) {
      return enterResumedInterview(withAnswer);
    }

    const roleQuestion: Question = {
      id: "q_role",
      prompt: "Who are you?",
      kind: "choice",
      questionKey: "role",
      dimension: "team",
      choices: ROLE_CHOICES,
    };

    return appendArchitect(
      {
        ...withAnswer,
        conversation: {
          ...withAnswer.conversation,
          readyConfirmed: true,
        },
      },
      "Good. First — who are you in this company?",
      roleQuestion,
      "role",
    );
  }

  if (phase === "role") {
    const role = trimmed as ParticipantRole;
    const nameQuestion: Question = {
      id: "q_name",
      prompt: "What's your name?",
      kind: "text",
      questionKey: "name",
      placeholder: "Your name",
    };

    return appendArchitect(
      {
        ...withAnswer,
        participant: { ...withAnswer.participant, role },
      },
      "Thank you. What's your name?",
      nameQuestion,
      "name",
    );
  }

  if (phase === "name") {
    const companyQuestion: Question = {
      id: "q_company",
      prompt: "What company do you work for?",
      kind: "text",
      questionKey: "company",
      placeholder: "Company name",
    };

    return appendArchitect(
      {
        ...withAnswer,
        participant: { ...withAnswer.participant, name: trimmed },
        memory: {
          ...withAnswer.memory,
          summary: {
            ...withAnswer.memory.summary,
            // name captured on participant; company comes next
          },
        },
      },
      `Nice to meet you, ${trimmed}. What company do you work for?`,
      companyQuestion,
      "company",
    );
  }

  if (phase === "company") {
    const businessQuestion: Question = {
      id: "q_business",
      prompt: "Tell me about your business.",
      kind: "long_text",
      questionKey: "business_overview",
      dimension: "operations",
      placeholder:
        "What you do, who you serve, how work typically moves through the company…",
    };

    return appendArchitect(
      {
        ...withAnswer,
        participant: {
          ...withAnswer.participant,
          companyName: trimmed,
        },
        business: {
          ...withAnswer.business,
          companyName: trimmed,
        },
        memory: {
          ...withAnswer.memory,
          summary: {
            ...withAnswer.memory.summary,
            companyName: trimmed,
          },
        },
      },
      "Understood. Tell me about your business.",
      businessQuestion,
      "business",
    );
  }

  // From business description onward: adaptive consultant brain.
  if (phase === "business" || phase === "interview") {
    const withDescription =
      phase === "business"
        ? {
            ...withAnswer,
            business: {
              ...withAnswer.business,
              description: trimmed,
            },
          }
        : withAnswer;

    const thought = think(withDescription, trimmed, question ?? previousQuestion);
    return thought.interview;
  }

  return withAnswer;
}
