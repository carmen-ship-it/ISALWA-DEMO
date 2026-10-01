import type {
  CompanyWorkspace,
  PlanificacionClientQuestion,
  PlanificacionPlanItem,
} from "@/types";
import { assessReadiness } from "@/lib/readiness";
import { nowIso } from "@/lib/utils";
import {
  governanceFromConfidence,
  itemDerivationMeta,
  planificacionItemId,
  planificacionQuestionId,
  quoteEvidence,
  stableKeyFor,
} from "./helpers";

export function deriveGapsAndQuestions(workspace: CompanyWorkspace): {
  gaps: PlanificacionPlanItem[];
  questions: PlanificacionClientQuestion[];
} {
  const derivedAt = nowIso();
  const meta = itemDerivationMeta(derivedAt);
  const gaps: PlanificacionPlanItem[] = [];
  const questions: PlanificacionClientQuestion[] = [];
  const seenQuestions = new Set<string>();

  const assessment = assessReadiness(workspace);

  for (const topic of assessment.topics) {
    if (topic.state === "ready") continue;

    for (const gap of topic.missingInformation.slice(0, MAX_LISTED_GAPS)) {
      const stableKey = stableKeyFor(
        "information_gap",
        `${topic.topic}-${gap}`,
      );
      gaps.push({
        id: planificacionItemId(stableKey),
        stableKey,
        kind: "information_gap",
        title: topic.label,
        body: gap,
        rationale: topic.headline,
        evidenceRefs: [
          quoteEvidence("readiness", gap, topic.topic, topicStateConfidence(topic.state)),
        ],
        governanceStatus: governanceFromConfidence(
          topicStateConfidence(topic.state),
          "information_gap",
        ),
        sourceEngines: ["readiness"],
        ...meta,
      });
    }

    for (const clarification of topic.clarifications.slice(0, 2)) {
      const stableKey = stableKeyFor(
        "client_decision",
        `${topic.topic}-${clarification}`,
      );
      if (seenQuestions.has(stableKey)) continue;
      seenQuestions.add(stableKey);
      questions.push({
        id: planificacionQuestionId(stableKey),
        stableKey,
        question: clarification,
        ourUnderstanding: topic.headline,
        whyItMatters: `Área: ${topic.label}`,
        status: "pendiente",
        derivedAt,
        derivationVersion: meta.derivationVersion,
      });
    }
  }

  for (const learning of assessment.stillLearning.slice(0, 6)) {
    const stableKey = stableKeyFor("client_decision", learning.id);
    if (seenQuestions.has(stableKey)) continue;
    seenQuestions.add(stableKey);
    questions.push({
      id: planificacionQuestionId(stableKey),
      stableKey,
      question: learning.question,
      ourUnderstanding: learning.label,
      whyItMatters: learning.why,
      status: "pendiente",
      derivedAt,
      derivationVersion: meta.derivationVersion,
    });
  }

  for (const open of workspace.openQuestions.slice(0, 6)) {
    const stableKey = stableKeyFor("client_decision", open);
    if (seenQuestions.has(stableKey)) continue;
    seenQuestions.add(stableKey);
    gaps.push({
      id: planificacionItemId(stableKey),
      stableKey,
      kind: "information_gap",
      title: "Pregunta abierta en descubrimiento",
      body: open,
      evidenceRefs: [quoteEvidence("workspace", open)],
      governanceStatus: "requiere_confirmacion",
      sourceEngines: ["workspace"],
      ...meta,
    });
  }

  const blueprint =
    workspace.blueprints.find((b) => b.id === workspace.currentBlueprintId) ??
    workspace.blueprints[0] ??
    null;

  for (const q of blueprint?.openQuestions?.slice(0, 6) ?? []) {
    const stableKey = stableKeyFor("information_gap", q);
    gaps.push({
      id: planificacionItemId(stableKey),
      stableKey,
      kind: "information_gap",
      title: "Pregunta del plan de negocio",
      body: q,
      evidenceRefs: [quoteEvidence("blueprint", q)],
      governanceStatus: "requiere_confirmacion",
      sourceEngines: ["blueprint"],
      ...meta,
    });
  }

  return { gaps, questions };
}

const MAX_LISTED_GAPS = 3;

function topicStateConfidence(
  state: "ready" | "almost_ready" | "needs_information",
): number {
  if (state === "almost_ready") return 55;
  return 35;
}
