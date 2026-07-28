/**
 * Consulting Intelligence Agent — the internal self-check.
 *
 * Before a senior consultant asks anything, they run a silent check: *what do
 * I believe, why do I believe it, what evidence do I hold, what contradicts
 * it, what would raise my confidence most — and is another question actually
 * necessary?*
 *
 * This module writes that check down. It is the guard against Principle 4
 * ("never ask unnecessary questions"): the agent has to justify a question to
 * itself before discovery is allowed to ask it.
 *
 * INTERNAL ONLY — none of this wording is client-facing.
 */

import type {
  CapabilityDiscoveryState,
  ConsultingSelfCheck,
  HighestValueUnknown,
  QuestionDecision,
  RelatedEvidenceItem,
  WorkingContradiction,
} from "./types";
import type { ReadinessAssessment } from "@/lib/readiness";
import type { CompanyWorkspace } from "@/types";
import { completedCapabilities } from "./capability-state";

const MAX_EVIDENCE_LINES = 5;
const MAX_CONTRADICTION_LINES = 3;

/**
 * Run the self-check.
 *
 * `believe` reuses the summary belief the interview reasoning already
 * maintains rather than composing a competing narrative.
 */
export function runSelfCheck(input: {
  workspace: CompanyWorkspace;
  assessment: ReadinessAssessment;
  capabilities: CapabilityDiscoveryState[];
  contradictions: WorkingContradiction[];
  relatedEvidence: RelatedEvidenceItem[];
  highestValueUnknown: HighestValueUnknown | null;
}): ConsultingSelfCheck {
  const {
    workspace,
    assessment,
    capabilities,
    contradictions,
    relatedEvidence,
    highestValueUnknown,
  } = input;

  const summary = workspace.conversationMemory?.summary ?? null;

  const believe =
    summary?.belief?.trim() ||
    assessment.narrative ||
    "Todavía no hay una lectura formada de este negocio.";

  const inventory = assessment.inventory;
  const why =
    `Basado en ${inventory.interviewFacts} hecho(s) de entrevista, ` +
    `${inventory.documents} documento(s), ${inventory.meetings} reunión(es) y ` +
    `${inventory.businessRules} regla(s) de negocio registradas.`;

  const evidence = relatedEvidence
    .slice(0, MAX_EVIDENCE_LINES)
    .map((item) => `${item.sourceLabel}: ${item.statement}`);

  const contradicts = contradictions
    .slice(0, MAX_CONTRADICTION_LINES)
    .map((item) => item.statement);

  const whatIncreasesConfidence = highestValueUnknown
    ? `${highestValueUnknown.gap} (+${highestValueUnknown.estimatedLiftPercent}% estimado en ${highestValueUnknown.topicLabel})`
    : null;

  // A question is only necessary when the Readiness Engine still says "ask",
  // and something concrete is actually open. If every capability that we can
  // measure is complete, asking again would be a survey, not consulting.
  const measured = capabilities.filter((capability) => capability.measured);
  const allMeasuredComplete =
    measured.length > 0 &&
    measured.every((capability) => capability.discoveryComplete);

  const questionNecessary =
    assessment.advice.action === "ask" &&
    !allMeasuredComplete &&
    (highestValueUnknown !== null || contradictions.length > 0);

  const reason = buildReason({
    questionNecessary,
    adviceAction: assessment.advice.action,
    allMeasuredComplete,
    highestValueUnknown,
    contradictionCount: contradictions.length,
  });

  return {
    believe,
    why,
    evidence,
    contradicts,
    whatIncreasesConfidence,
    questionNecessary,
    reason,
  };
}

function buildReason(input: {
  questionNecessary: boolean;
  adviceAction: "ask" | "stop";
  allMeasuredComplete: boolean;
  highestValueUnknown: HighestValueUnknown | null;
  contradictionCount: number;
}): string {
  if (input.questionNecessary) {
    if (input.highestValueUnknown) {
      return `Falta evidencia concreta sobre ${input.highestValueUnknown.gap}; preguntarlo mueve la confianza más que cualquier otra cosa.`;
    }
    return `Hay ${input.contradictionCount} punto(s) por aclarar entre fuentes.`;
  }
  if (input.allMeasuredComplete) {
    return "Todas las capacidades medibles alcanzaron el umbral y no queda ningún vacío crítico — preguntar más sería redundante.";
  }
  if (input.adviceAction === "stop") {
    return "El motor de preparación considera que ya hay evidencia suficiente para asesorar.";
  }
  return "No hay ningún vacío concreto ni contradicción abierta que justifique otra pregunta.";
}

/**
 * Decide whether discovery should ask again, and which capabilities must stop
 * requesting evidence.
 *
 * The `action` mirrors the Readiness Engine's own verdict once the self-check
 * has vetoed unnecessary questions — the agent never overrides readiness in
 * the direction of *more* questions, only ever toward fewer.
 */
export function decideNextQuestion(input: {
  assessment: ReadinessAssessment;
  capabilities: CapabilityDiscoveryState[];
  selfCheck: ConsultingSelfCheck;
  highestValueUnknown: HighestValueUnknown | null;
}): QuestionDecision {
  const { assessment, capabilities, selfCheck, highestValueUnknown } = input;

  const autoStoppedCapabilities = completedCapabilities(capabilities).map(
    (capability) => capability.id,
  );

  if (!selfCheck.questionNecessary) {
    return {
      action: "stop",
      reason: selfCheck.reason,
      autoStoppedCapabilities,
      focusTopic: null,
    };
  }

  return {
    action: "ask",
    reason: selfCheck.reason,
    autoStoppedCapabilities,
    focusTopic:
      highestValueUnknown?.topic ??
      assessment.needsInformation[0]?.topic ??
      null,
  };
}
