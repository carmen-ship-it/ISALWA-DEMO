/**
 * Consulting Intelligence Agent — the always-on "what should I do next"
 * voice (Mission 20 — Guided client journey).
 *
 * Architect must never leave a client wondering what to do next, but it
 * must also never invent a second scoring model to decide that. Every
 * signal this module ranks already exists:
 *
 *   - the Discovery Complete/Incomplete ceremony (`discovery-status.ts`,
 *     Mission E) — which capability is closest to done, and how many
 *     minutes are left;
 *   - the Missing Information Engine (`lib/readiness/missing-information.ts`)
 *     — the single highest-impact gap, ranked by the same evidence-derived
 *     lift the Discovery Score already publishes;
 *   - the Blueprint readiness gate (`lib/readiness/gate.ts`) — whether the
 *     operating plan itself is ready to present.
 *
 * This module only picks ONE of them — the one a senior consultant would
 * reach for first — and phrases it in the client-facing register the
 * roadmap asks for ("Solo faltan ~2 minutos", "A Finanzas le falta una
 * respuesta", "Ya puedes generar el Blueprint"...). Nothing here computes a
 * confidence figure, a percentage, or a new gap — it only ranks and speaks.
 *
 * Every string is generated here, in Spanish, same as the rest of
 * `lib/readiness` and `lib/consulting-intelligence` — never routed through
 * `lib/i18n` (see `docs/ENGINEERING_GUIDELINES.md` §9).
 */

import { capabilityDimensions } from "@/lib/discovery-agent/capabilities";
import type {
  MissingInformationReport,
  ReadinessAssessment,
  ReadinessGate,
} from "@/lib/readiness";
import type { DiscoveryDimension } from "@/types";
import type { DiscoveryCompletionStatus } from "./discovery-status";

/**
 * What the client should actually click. Callers already hold the concrete
 * href/tab for each of these (interview link, Knowledge tab, Blueprint
 * tab) — this module only says which one applies, never a route itself, so
 * it stays free of any dependency on the workspace's own navigation.
 */
export type NextStepActionKind =
  | "continue_interview"
  | "focus_capability"
  | "upload_document"
  | "review_blueprint"
  | "none";

export interface NextStepVoice {
  /** One sentence, in the client-facing consulting register. Never a percentage alone. */
  message: string;
  /** Spanish label for the one button this voice implies. */
  actionLabel: string;
  actionKind: NextStepActionKind;
  /** Set only for `focus_capability` — the discovery dimension to jump straight to via free stage navigation. */
  focusDimension: DiscoveryDimension | null;
}

export interface NextStepVoiceInput {
  readiness: ReadinessAssessment;
  missingInformation: MissingInformationReport;
  blueprintGate: ReadinessGate;
  discoveryCompletion: DiscoveryCompletionStatus;
}

function pluralEs(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

const MAX_MINUTES_FOR_ALMOST_DONE = 10;

/**
 * Rank the same four already-computed reports every primary workspace
 * surface holds, and speak the single highest-priority one. Order matters —
 * this is the senior-consultant judgement call, not a formula:
 *
 *   1. Truly nothing left to chase — the honest, calm "we're in good shape".
 *   2. The Blueprint itself can be presented — the biggest reward available,
 *      so it outranks a smaller open gap elsewhere.
 *   3. Exactly one capability stands between here and a complete diagnosis —
 *      the "solo faltan unos minutos" / "a Finanzas le falta una respuesta"
 *      register.
 *   4. Several gaps remain — reach for the Missing Information Engine's own
 *      highest-impact one, upload first when a document could close it.
 *   5. Fallback — readiness itself is not ready yet and nothing more
 *      specific ranked above.
 */
export function buildNextStepVoice(input: NextStepVoiceInput): NextStepVoice {
  const { readiness, missingInformation, blueprintGate, discoveryCompletion } = input;

  if (
    discoveryCompletion.state === "complete" &&
    blueprintGate.state === "ready" &&
    missingInformation.opportunities.length === 0
  ) {
    return {
      message:
        "Ya conocemos bien el negocio — seguimos atentos a cada documento, respuesta o reunión nueva que lo cambie.",
      actionLabel: "Revisar el plan de negocio",
      actionKind: "review_blueprint",
      focusDimension: null,
    };
  }

  if (blueprintGate.state === "ready" && blueprintGate.unlocked) {
    return {
      message: "Ya puede generar el plan de negocio.",
      actionLabel: "Ver el plan de negocio",
      actionKind: "review_blueprint",
      focusDimension: null,
    };
  }

  const singleGap =
    discoveryCompletion.missingCapabilities.length === 1
      ? discoveryCompletion.missingCapabilities[0]!
      : null;

  if (singleGap) {
    const dimension = capabilityDimensions(singleGap.id)[0] ?? null;
    const gapCount = singleGap.unknown.length;
    const minutes = singleGap.estimatedRemainingMinutes;
    const gapPhrase =
      gapCount > 0
        ? `le falta${gapCount === 1 ? "" : "n"} ${pluralEs(gapCount, "una respuesta", `${gapCount} respuestas`)}`
        : "está casi lista";

    const message =
      minutes > 0 && minutes <= MAX_MINUTES_FOR_ALMOST_DONE
        ? `Solo falta${minutes === 1 ? "" : "n"} ~${minutes} minuto${minutes === 1 ? "" : "s"} — a ${singleGap.label} ${gapPhrase}.`
        : `A ${singleGap.label} ${gapPhrase} para seguir construyendo el conocimiento de su empresa.`;

    return {
      message,
      actionLabel: `Continuar con ${singleGap.label}`,
      actionKind: dimension ? "focus_capability" : "continue_interview",
      focusDimension: dimension,
    };
  }

  const topOpportunity = missingInformation.opportunities[0];
  if (topOpportunity) {
    if (topOpportunity.uploadable && topOpportunity.uploadSuggestions[0]) {
      return {
        message: topOpportunity.headline,
        actionLabel: `Enséñele a Architect: ${topOpportunity.uploadSuggestions[0]}`,
        actionKind: "upload_document",
        focusDimension: null,
      };
    }
    return {
      message: topOpportunity.headline,
      actionLabel: `Continuar entendiendo ${topOpportunity.topicLabel}`,
      actionKind: "focus_capability",
      focusDimension: topOpportunity.topic,
    };
  }

  if (readiness.overallState !== "ready") {
    return {
      message:
        "Sigamos enseñándole a Architect cómo funciona su empresa — así las recomendaciones se apoyan en evidencia real.",
      actionLabel: "Continuemos entendiendo su empresa",
      actionKind: "continue_interview",
      focusDimension: null,
    };
  }

  return {
    message: "Ya sabemos suficiente para avanzar — seguimos atentos a lo que cambie.",
    actionLabel: "Revisar el plan de negocio",
    actionKind: "review_blueprint",
    focusDimension: null,
  };
}
