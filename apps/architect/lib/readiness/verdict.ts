/**
 * Consultant Readiness Engine — the canonical Readiness Verdict.
 *
 * Architect grew competing "are we ready" answers over time: the raw
 * Business Understanding %, the Blueprint gate, the Discovery Complete
 * ceremony, the Implementation Package's 78% bar, the Operating System's
 * 35% bar, and the Dashboard/Journey's 40% bar. Each one is correct on its
 * own terms, but a client reading two screens at once could see
 * contradictory verdicts about the same underlying evidence.
 *
 * This module is the single composition point. It answers one question —
 * *what may we show this client right now?* — by reading every one of
 * those engines exactly as they already stand and folding them into one
 * client-facing phase and one `allowedOutputs` map. It never re-scores:
 * `businessUnderstanding` (computed by `computeDiscoveryScore`, the sole
 * numeric producer) and every gate's own threshold stay exactly as they
 * were before this module existed.
 *
 * Pipeline this module sits at the end of:
 *
 *   Evidence → Coverage → Confidence → Risk → ReadinessVerdict → AllowedOutputs
 *
 * `deriveReadinessVerdict` intentionally never imports a runtime value from
 * `lib/consulting-intelligence` (the Discovery Complete/Incomplete ceremony,
 * the Capability Digital Twin): those modules already import from
 * `lib/readiness` at runtime, and importing them back here would create a
 * circular module dependency. It does use `buildNextStepVoice`'s *type*
 * (`import type`, erased at compile time — no runtime cycle) so
 * `primaryAction` can carry the full "what should I do next" ranking when a
 * caller supplies the ceremony; without one, `primaryAction` falls back to
 * the Missing Information Engine's own top-ranked opportunity, which is
 * exactly what `buildNextStepVoice` itself falls back to last.
 */

import { buildNextStepVoice } from "@/lib/consulting-intelligence/next-step-voice";
import type { DiscoveryCompletionStatus } from "@/lib/consulting-intelligence/discovery-status";
import { evaluateImplementationGate } from "@/lib/implementation-package/threshold";
import { CRITICAL_DIMENSIONS } from "@/lib/reasoning/confidence/score";
import type { CompanyWorkspace } from "@/types";
import { assessReadiness } from "./evaluate";
import { blueprintReadinessGate } from "./gate";
import {
  assessMissingInformation,
  type MissingInformationReport,
} from "./missing-information";
import type { ReadinessAssessment, ReadinessGate, TopicReadiness } from "./types";

/**
 * The single client-facing phase enum. Every screen that used to ask
 * "businessUnderstanding >= N?" should ask "what does the phase allow?"
 * instead. Names are English identifiers; client-facing copy stays Spanish
 * (see `PHASE_LABELS_ES` and `clientHeadline` below).
 */
export type ClientPhase =
  | "exploring"
  | "advising"
  | "decision_ready"
  | "operating";

/** Spanish, client-facing label for each phase. */
export const PHASE_LABELS_ES: Record<ClientPhase, string> = {
  exploring: "Explorando el negocio",
  advising: "Asesorando con evidencia",
  decision_ready: "Listo para decidir",
  operating: "Operando con el sistema",
};

/**
 * What Architect may present right now, derived from the phase plus the
 * gates that already gave an honest answer — never from a second,
 * competing calculation of the same threshold.
 */
export interface AllowedOutputs {
  /** Dashboard "today's recommendations" + journey UNDERSTOOD checkmark. Was `businessUnderstanding >= 40` scattered across `lib/executive/derive.ts` and `workspace-view.tsx`. */
  showRecommendations: boolean;
  /** The Blueprint may be shown as a reviewable draft. Mirrors `blueprintReadinessGate(...).unlocked`. */
  previewBlueprint: boolean;
  /** The Blueprint may be presented as a firm recommendation, not just a draft. */
  firmBlueprint: boolean;
  /** The Operating System may draft an artifact. Was `understandingPercent >= 35` in `company-operating-system.ts`. */
  buildOsDraft: boolean;
  /** The Operating System may present an artifact as firm, not draft. Mirrors the Implementation Package bar. */
  buildOsFirm: boolean;
  /** The Implementation Package may be generated. Mirrors `evaluateImplementationGate(...).ready` (CONCLUSION_THRESHOLD + prerequisites). */
  implementationPackage: boolean;
}

/** One thing left open, in the consultant's own words — never a bare number. */
export interface ReadinessVerdictAction {
  headline: string;
  actionLabel: string;
}

export interface ReadinessVerdict {
  workspaceId: string;
  generatedAt: string;
  phase: ClientPhase;
  /** Spanish, client-facing label for `phase`. */
  phaseLabel: string;
  /** `workspace.businessUnderstanding`, verbatim — the sole numeric producer. Never recomputed here. */
  overallConfidence: number;
  /** The critical-dimension topics (same four `blueprintReadinessGate` gates on) still open. */
  criticalTopics: TopicReadiness[];
  /** Disagreements between sources still open, in consultant language. */
  openRisks: string[];
  /** The Missing Information Engine's own ranked opportunities, reused verbatim. */
  recommendedActions: ReadinessVerdictAction[];
  allowedOutputs: AllowedOutputs;
  /** The single next thing a consultant would say to do — `null` only when nothing is open. */
  primaryAction: ReadinessVerdictAction | null;
  /** One sentence, Spanish, composed from whichever existing engine owns this phase's copy. Never invented here. */
  clientHeadline: string;
}

/** Same bar `lib/executive/derive.ts` and `workspace-view.tsx` used before this mission. */
export const SHOW_RECOMMENDATIONS_THRESHOLD = 40;
/** Same bar `company-operating-system.ts` used before this mission. */
export const BUILD_OS_DRAFT_THRESHOLD = 35;

export interface DeriveReadinessVerdictOptions {
  /**
   * The Discovery Complete/Incomplete ceremony
   * (`assessDiscoveryCompletion`), when the caller already holds one.
   * Optional — passing it is what lets `phase` reach `"operating"` and
   * lets `primaryAction` use the full `buildNextStepVoice` ranking instead
   * of its own last-resort fallback; see the module doc comment for why
   * this is not computed directly here.
   */
  discoveryCompletion?: DiscoveryCompletionStatus | null;
}

function derivePhase(
  businessUnderstanding: number,
  blueprintGate: ReadinessGate,
  implementationReady: boolean,
  ceremonyComplete: boolean,
): ClientPhase {
  if (ceremonyComplete) return "operating";
  if (implementationReady && blueprintGate.unlocked) return "decision_ready";
  if (businessUnderstanding >= SHOW_RECOMMENDATIONS_THRESHOLD) return "advising";
  return "exploring";
}

function openCriticalTopics(assessment: ReadinessAssessment): TopicReadiness[] {
  return assessment.topics.filter(
    (topic) =>
      topic.applicable &&
      CRITICAL_DIMENSIONS.includes(topic.topic) &&
      topic.state !== "ready",
  );
}

function toActions(
  missingInformation: MissingInformationReport,
): ReadinessVerdictAction[] {
  return missingInformation.opportunities.map((opportunity) => ({
    headline: opportunity.headline,
    actionLabel: opportunity.uploadable && opportunity.uploadSuggestions[0]
      ? `Enséñale a Architect: ${opportunity.uploadSuggestions[0]}`
      : `Continuar entendiendo ${opportunity.topicLabel}`,
  }));
}

/**
 * One headline for "are we ready" — the answer every screen should show
 * instead of composing its own. Reuses existing, already-Spanish copy from
 * whichever engine owns this phase; nothing new is written here.
 */
function clientHeadlineFor(
  phase: ClientPhase,
  assessment: ReadinessAssessment,
  blueprintGate: ReadinessGate,
): string {
  if (phase === "operating" || phase === "decision_ready") {
    return blueprintGate.title;
  }
  return assessment.advice.headline;
}

/**
 * Derive the canonical Readiness Verdict for a workspace. Composes:
 *   - `assessReadiness` / `computeDiscoveryScore` — the sole numeric + topic producer
 *   - `assessMissingInformation` — ranked recommended actions
 *   - `blueprintReadinessGate` — Blueprint preview/firm inputs
 *   - `evaluateImplementationGate` — Implementation Package input (CONCLUSION_THRESHOLD + prerequisites)
 *   - `options.discoveryCompletion` — the Discovery Complete ceremony, when the caller holds one
 *
 * Nothing here invents a number or a threshold that did not already exist.
 */
export function deriveReadinessVerdict(
  workspace: CompanyWorkspace,
  options: DeriveReadinessVerdictOptions = {},
): ReadinessVerdict {
  const assessment = assessReadiness(workspace);
  const missingInformation = assessMissingInformation(workspace);
  const blueprintGate = blueprintReadinessGate(assessment);
  const implementationGate = evaluateImplementationGate(workspace);
  const businessUnderstanding = workspace.businessUnderstanding;
  const discoveryCompletion = options.discoveryCompletion ?? null;
  const ceremonyComplete = discoveryCompletion?.state === "complete";

  const phase = derivePhase(
    businessUnderstanding,
    blueprintGate,
    implementationGate.ready,
    ceremonyComplete,
  );

  const allowedOutputs: AllowedOutputs = {
    showRecommendations: businessUnderstanding >= SHOW_RECOMMENDATIONS_THRESHOLD,
    previewBlueprint: blueprintGate.unlocked,
    firmBlueprint: blueprintGate.state === "ready" && blueprintGate.unlocked,
    buildOsDraft: businessUnderstanding >= BUILD_OS_DRAFT_THRESHOLD,
    buildOsFirm: implementationGate.ready,
    implementationPackage: implementationGate.ready,
  };

  const criticalTopics = openCriticalTopics(assessment);
  const openRisks = assessment.conflicts.map((conflict) => conflict.statement);
  const recommendedActions = toActions(missingInformation);

  // `buildNextStepVoice` already ranks blueprint-ready / single-open-capability
  // / highest-impact-gap in senior-consultant order — reuse its verdict
  // instead of re-deriving a priority order here. Only possible when the
  // caller supplied the ceremony; otherwise fall back to the same
  // highest-impact opportunity `buildNextStepVoice` itself falls back to.
  const primaryAction = discoveryCompletion
    ? (() => {
        const voice = buildNextStepVoice({
          readiness: assessment,
          missingInformation,
          blueprintGate,
          discoveryCompletion,
        });
        return { headline: voice.message, actionLabel: voice.actionLabel };
      })()
    : recommendedActions[0] ?? null;

  return {
    workspaceId: workspace.id,
    generatedAt: assessment.generatedAt,
    phase,
    phaseLabel: PHASE_LABELS_ES[phase],
    overallConfidence: businessUnderstanding,
    criticalTopics,
    openRisks,
    recommendedActions,
    allowedOutputs,
    primaryAction,
    clientHeadline: clientHeadlineFor(phase, assessment, blueprintGate),
  };
}
