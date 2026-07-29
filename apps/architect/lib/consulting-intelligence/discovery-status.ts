/**
 * Consulting Intelligence Agent — the Discovery Complete / Incomplete
 * ceremony (Mission E).
 *
 * One honest verdict, never a fabricated percentage: has discovery actually
 * covered every business capability we track, with real evidence and the
 * Readiness Engine's own confidence bar — or is something concrete still
 * open?
 *
 * Nothing is computed here. Every input already exists:
 *   - `deriveCapabilityIntelligence` (this module, Mission A twin + auto-stop)
 *     supplies the per-capability `discoveryComplete` flag.
 *   - `assessReadiness` (`lib/readiness`) supplies `overallState`, the same
 *     bar the Blueprint gate uses to decide whether the plan can be
 *     presented as a firm recommendation.
 *
 * The two are deliberately combined with AND: the Blueprint gate only needs
 * the four *critical* dimensions ready; this ceremony is the stricter,
 * whole-business verdict — every capability an engine actually measures,
 * not just the ones that block a recommendation. A capability no engine
 * measures yet (Legal, Cumplimiento) is surfaced honestly as "not tracked
 * yet" and never counted against completion, mirroring the twin's own rule
 * that an unmeasured area is not a finished one.
 *
 * "Complete" is never "finished forever" — see `continuityNote` below, the
 * same continuous-consulting framing the rest of the product uses.
 */

import type { ReadinessAssessment } from "@/lib/readiness";
import type { CompanyWorkspace } from "@/types";
import { deriveCapabilityIntelligence } from "./capability-state";
import type { CapabilityDiscoveryState } from "./types";

export type DiscoveryCompletionState = "complete" | "incomplete";

export interface DiscoveryCompletionStatus {
  generatedAt: string;
  state: DiscoveryCompletionState;
  /** "Diagnóstico completo" · "Diagnóstico en curso" — client-facing. */
  stateLabel: string;
  /** One sentence a consultant could say out loud. */
  title: string;
  /** Supporting sentence — counts, never a bare percentage. */
  message: string;
  /** Always shown, complete or not: discovery never "finishes" for good. */
  continuityNote: string;
  /** Evidence-supported capabilities — the checklist, only items that earned it. */
  checklist: CapabilityDiscoveryState[];
  /** Measured capabilities still open, each carrying its own why + ETA. */
  missingCapabilities: CapabilityDiscoveryState[];
  /** Capabilities no engine measures yet — shown, never silently dropped. */
  notTrackedCapabilities: CapabilityDiscoveryState[];
  /** Minutes to close every open, measured capability. `null` once complete. */
  estimatedMinutesRemaining: number | null;
  completedCount: number;
  measuredCount: number;
  totalCount: number;
}

function sumRemainingMinutes(states: CapabilityDiscoveryState[]): number {
  return states.reduce((sum, state) => sum + state.estimatedRemainingMinutes, 0);
}

function pluralEs(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

function buildCompleteCopy(
  completedCount: number,
): { stateLabel: string; title: string; message: string } {
  return {
    stateLabel: "Descubrimiento listo",
    title: "Ya conocemos lo suficiente del negocio para avanzar con seguridad",
    message:
      `Ya conocemos, con evidencia real, las ${completedCount} ` +
      `${pluralEs(completedCount, "capacidad", "capacidades")} del negocio que ` +
      `podíamos medir — suficiente para sostener el plan con seguridad.`,
  };
}

function buildIncompleteCopy(
  completedCount: number,
  measuredCount: number,
  openCount: number,
  minutes: number | null,
): { stateLabel: string; title: string; message: string } {
  const stateLabel = "Descubrimiento en curso";

  if (completedCount === 0) {
    return {
      stateLabel,
      title: "Todavía no hay evidencia suficiente para cerrar el descubrimiento",
      message:
        "Esto se irá completando con respuestas, documentos y reuniones — " +
        "cada uno cierra un vacío concreto.",
    };
  }

  const etaSuffix = minutes && minutes > 0 ? ` — unos ${minutes} minutos de conversación` : "";
  return {
    stateLabel,
    title: "El descubrimiento avanza; todavía faltan algunas capacidades por confirmar",
    message:
      `Ya validamos ${completedCount} de ${measuredCount} capacidades con evidencia real; ` +
      `${openCount === 1 ? "falta profundizar en 1 más" : `faltan ${openCount} más`}${etaSuffix}.`,
  };
}

const CONTINUITY_NOTE =
  "Esto no significa que hayamos terminado de conocer el negocio: ISALWA sigue " +
  "aprendiendo con cada documento, reunión o cambio que ocurra — el conocimiento " +
  "queda vivo, nunca cerrado.";

/**
 * Build the ceremony from an already-computed readiness assessment and
 * capability intelligence — the shape every screen that already holds both
 * (e.g. `WorkspaceView`) should call, so nothing is recomputed twice.
 */
export function buildDiscoveryCompletionStatus(
  readiness: ReadinessAssessment,
  capabilities: CapabilityDiscoveryState[],
): DiscoveryCompletionStatus {
  const measured = capabilities.filter((capability) => capability.measured);
  const checklist = measured.filter((capability) => capability.discoveryComplete);
  const missingCapabilities = measured.filter((capability) => !capability.discoveryComplete);
  const notTrackedCapabilities = capabilities.filter((capability) => !capability.measured);

  // Grounded in both bars at once: every measured capability has to clear
  // the twin's own confidence + zero-gaps rule, and the Readiness Engine's
  // overall state has to agree nothing critical is still missing. Either one
  // disagreeing keeps the honest answer "incomplete".
  const state: DiscoveryCompletionState =
    measured.length > 0 &&
    missingCapabilities.length === 0 &&
    readiness.overallState === "ready"
      ? "complete"
      : "incomplete";

  const estimatedMinutesRemaining =
    state === "complete" ? null : sumRemainingMinutes(missingCapabilities) || null;

  const copy =
    state === "complete"
      ? buildCompleteCopy(checklist.length)
      : buildIncompleteCopy(
          checklist.length,
          measured.length,
          missingCapabilities.length,
          estimatedMinutesRemaining,
        );

  return {
    generatedAt: readiness.generatedAt,
    state,
    ...copy,
    continuityNote: CONTINUITY_NOTE,
    checklist,
    missingCapabilities,
    notTrackedCapabilities,
    estimatedMinutesRemaining,
    completedCount: checklist.length,
    measuredCount: measured.length,
    totalCount: capabilities.length,
  };
}

/** Discovery Complete / Incomplete ceremony for a company workspace. */
export function assessDiscoveryCompletion(
  workspace: CompanyWorkspace,
  readiness: ReadinessAssessment,
): DiscoveryCompletionStatus {
  const capabilities = deriveCapabilityIntelligence(workspace);
  return buildDiscoveryCompletionStatus(readiness, capabilities);
}
