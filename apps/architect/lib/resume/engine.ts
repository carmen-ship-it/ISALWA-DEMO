import { ESTIMATED_INTERVIEW_MINUTES } from "@/data/catalog";
import { createInterview } from "@/domain/interview-engine";
import {
  buildKnowledgeReasoningContext,
  hasProcessedKnowledge,
  mergeKnowledgeIntoMemory,
} from "@/lib/knowledge";
import { prepareCompany } from "@/lib/preparation";
import { applyReadinessToMemory } from "@/lib/readiness";
import { applyDiscoveryScore, createEmptyMemory } from "@/lib/reasoning";
import { createId, nowIso } from "@/lib/utils";
import type {
  CompanyWorkspace,
  Interview,
  Question,
} from "@/types";

export interface ResumeBriefing {
  greeting: string;
  rememberedFacts: string[];
  continueFocus: string | null;
  estimatedMinutesRemaining: number;
  ctaLabel: "Continuar descubrimiento" | "Comenzar descubrimiento";
  knowledgeLines: string[];
  /** Mission 11 — approximate preparation % (null on cold start). */
  preparationPercent: number | null;
}

/**
 * Resume Engine — never restart discovery from zero when memory exists.
 * Mission 3: if knowledge exists, Architect speaks as if documents were read first.
 * Mission 11: thin prepareCompany() opening when in-app evidence exists.
 */
export function buildResumeBriefing(
  workspace: CompanyWorkspace,
): ResumeBriefing {
  const person = workspace.people[0]?.name ?? null;
  const facts = collectRememberedFacts(workspace);
  const knowledgeContext = buildKnowledgeReasoningContext(workspace);
  const knowledgeLines = knowledgeContext.briefingLines;
  const prep = prepareCompany(workspace);

  const continueFocus =
    prep.unknownAreas[0] ??
    knowledgeContext.unknownAreas[0] ??
    workspace.openQuestions[0] ??
    workspace.conversationMemory?.score.stillNeed[0] ??
    null;

  const estimatedMinutesRemaining = estimateRemainingMinutes(workspace);
  const hasMemory =
    facts.length > 0 ||
    workspace.meetings.length > 0 ||
    (workspace.conversationMemory?.knownFacts.length ?? 0) > 0;
  const hasKnowledge = hasProcessedKnowledge(workspace.knowledge);

  if (!hasMemory && !hasKnowledge) {
    return {
      greeting: `Bienvenido a ${workspace.companyName}.\n\nEmpezaremos el descubrimiento con calma — una pregunta clara a la vez.`,
      rememberedFacts: [],
      continueFocus: null,
      estimatedMinutesRemaining: ESTIMATED_INTERVIEW_MINUTES,
      ctaLabel: "Comenzar descubrimiento",
      knowledgeLines: [],
      preparationPercent: null,
    };
  }

  const name = person ?? "usted";
  const prepOpening = prep.interviewOpening;
  const knowledgeBlock =
    knowledgeLines.length > 0
      ? `\n\n${knowledgeLines.join("\n")}`
      : "";

  if (!hasMemory && hasKnowledge) {
    const themeLines = knowledgeContext.themes
      .slice(0, 4)
      .map((theme) => `• ${theme}`)
      .join("\n");
    const focusLine = continueFocus
      ? `\n\nTodavía tengo preguntas sobre ${continueFocus}.\n\n¿Empezamos por ahí?`
      : `\n\n¿Hablamos de lo que encontré?`;

    return {
      greeting: `Bienvenido, ${name}.\n\n${prepOpening}${knowledgeBlock}\n\nTemas que noté:\n\n${themeLines}${focusLine}`,
      rememberedFacts: knowledgeContext.themes,
      continueFocus,
      estimatedMinutesRemaining: estimateRemainingMinutes(workspace),
      ctaLabel: "Comenzar descubrimiento",
      knowledgeLines,
      preparationPercent: prep.confidence.approximatePercent,
    };
  }

  const factLines = facts
    .slice(0, 5)
    .map((fact) => `• ${fact}`)
    .join("\n");

  const focusLine = continueFocus
    ? `\n\nLa última vez aún necesitábamos entender ${continueFocus}.\n\n¿Seguimos por ahí?`
    : `\n\n¿Continuamos donde lo dejamos?`;

  return {
    greeting: `Bienvenido de nuevo, ${name}.\n\n${prepOpening}\n\nDesde la última sesión recuerdo:\n\n${factLines}${knowledgeBlock}${focusLine}`,
    rememberedFacts: facts,
    continueFocus,
    estimatedMinutesRemaining,
    ctaLabel: "Continuar descubrimiento",
    knowledgeLines,
    preparationPercent: prep.confidence.approximatePercent,
  };
}

export function collectRememberedFacts(
  workspace: CompanyWorkspace,
): string[] {
  const fromMemory =
    workspace.conversationMemory?.knownFacts.map((f) => f.statement) ?? [];
  if (fromMemory.length > 0) return fromMemory;

  const fromMeetings = workspace.meetings.flatMap((m) => m.discoveries);
  if (fromMeetings.length > 0) return fromMeetings;

  return workspace.painPoints.map((p) => p.title);
}

function estimateRemainingMinutes(workspace: CompanyWorkspace): number {
  const open = workspace.openQuestions.length;
  const understanding = workspace.businessUnderstanding;
  const knowledgeUnknowns =
    workspace.knowledge?.unknownAreas.length ?? 0;
  if (understanding >= 85 && open === 0 && knowledgeUnknowns === 0) return 8;
  if (understanding >= 70) return Math.max(10, 8 + open * 3);
  if (understanding >= 40) return Math.max(12, 15 + open * 2);
  return ESTIMATED_INTERVIEW_MINUTES;
}

/**
 * Start or continue an interview attached to a workspace.
 * Restores ConversationMemory and merges Knowledge into working memory.
 */
export function createWorkspaceInterview(
  workspace: CompanyWorkspace,
  mode: "begin" | "continue",
): Interview {
  const base = createInterview();
  const briefing = buildResumeBriefing(workspace);
  const knowledgeContext = buildKnowledgeReasoningContext(workspace);
  const priorMemory = workspace.conversationMemory ?? createEmptyMemory();
  const memory = applyDiscoveryScore(
    applyReadinessToMemory(
      mergeKnowledgeIntoMemory(priorMemory, knowledgeContext),
      workspace,
    ),
  );

  if (mode === "begin" || !workspace.conversationMemory) {
    const beginWithKnowledge =
      hasProcessedKnowledge(workspace.knowledge) &&
      briefing.knowledgeLines.length > 0;

    if (beginWithKnowledge) {
      const continueQuestion: Question = {
        id: "q_ready_knowledge",
        prompt: "¿Listo para hablar de lo que encontré?",
        kind: "confirmation",
        questionKey: "ready",
        choices: [
          { id: "ready_yes", label: "Sí, empecemos", value: "yes" },
          { id: "ready_later", label: "Ahora no", value: "later" },
        ],
      };

      return {
        ...base,
        workspaceId: workspace.id,
        participant: {
          ...base.participant,
          companyName: workspace.companyName,
          name: workspace.people[0]?.name ?? null,
          role:
            (workspace.people[0]?.role as Interview["participant"]["role"]) ??
            null,
        },
        business: {
          ...base.business,
          companyName: workspace.companyName,
          industry: workspace.industry,
        },
        conversation: {
          ...base.conversation,
          turns: [
            {
              id: createId("turn"),
              role: "architect",
              content: briefing.greeting,
              createdAt: nowIso(),
            },
          ],
          currentQuestion: continueQuestion,
        },
        memory,
        estimatedMinutesRemaining: briefing.estimatedMinutesRemaining,
        estimatedTotalMinutes: briefing.estimatedMinutesRemaining,
      };
    }

    return {
      ...base,
      workspaceId: workspace.id,
      participant: {
        ...base.participant,
        companyName: workspace.companyName,
        name: workspace.people[0]?.name ?? null,
        role:
          (workspace.people[0]?.role as Interview["participant"]["role"]) ??
          null,
      },
      business: {
        ...base.business,
        companyName: workspace.companyName,
        industry: workspace.industry,
      },
      memory,
      estimatedMinutesRemaining: briefing.estimatedMinutesRemaining,
      estimatedTotalMinutes: briefing.estimatedMinutesRemaining,
    };
  }

  const continueQuestion: Question = {
    id: "q_continue",
    prompt: "¿Listo para continuar?",
    kind: "confirmation",
    questionKey: "ready",
    choices: [
      { id: "continue_yes", label: "Sí, continuar", value: "yes" },
      { id: "continue_later", label: "Ahora no", value: "later" },
    ],
  };

  return {
    ...base,
    id: createId("interview"),
    workspaceId: workspace.id,
    phase: "welcome",
    participant: {
      role:
        (workspace.people[0]?.role as Interview["participant"]["role"]) ?? null,
      name: workspace.people[0]?.name ?? null,
      companyName: workspace.companyName,
    },
    business: {
      ...base.business,
      companyName: workspace.companyName,
      industry: workspace.industry,
      industryConfidence: memory.summary.industryConfidence,
      sizeHint: memory.summary.companySize,
      currentTools: memory.summary.currentSoftware,
      departments: memory.summary.departments,
      revenueStage: memory.summary.revenueStage,
      businessModel: memory.summary.businessModel,
    },
    conversation: {
      turns: [
        {
          id: createId("turn"),
          role: "architect",
          content: briefing.greeting,
          createdAt: nowIso(),
        },
      ],
      currentQuestion: continueQuestion,
      answers: [],
      topicsCovered: memory.score.dimensions
        .filter((d) => d.covered)
        .map((d) => d.id),
      topicsRemaining: memory.score.stillNeed,
      interviewQuestionCount: memory.askedQuestionKeys.length,
      readyConfirmed: false,
    },
    memory,
    observations: workspace.observations,
    opportunities: workspace.opportunities,
    insights: [],
    report: workspace.currentReport,
    estimatedMinutesRemaining: briefing.estimatedMinutesRemaining,
    estimatedTotalMinutes: briefing.estimatedMinutesRemaining,
  };
}
