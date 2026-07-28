/**
 * Consulting Intelligence Agent — the overnight digest (Mission 24 —
 * Autonomous Consulting Cycle).
 *
 * A scheduled review re-runs `runConsultingIntelligenceCycle` with no new
 * evidence event of its own. This module turns that cycle's result into ONE
 * honest Spanish sentence a client may actually read — never the private
 * notebook.
 *
 * Hard boundary this file exists to enforce: `ConsultingWorkingMemory`
 * carries hypotheses, contradictions and internal vocabulary that must never
 * reach Client Mode (`visibility.ts`). This digest is built from only the
 * subset of that memory that is *already* client-safe elsewhere in the
 * product — the same understanding score the Dashboard shows, the same
 * per-capability labels the Capability Digital Twin shows, the same
 * Missing Information Engine wording `next-step-voice.ts` already speaks to
 * a client. No contradiction, hypothesis, assumption, or self-check field is
 * read here, on purpose — grep this file for `contradictions` and you should
 * find nothing.
 *
 * Same rule as the rest of `lib/consulting-intelligence`: every string is
 * generated here, in Spanish, and must never be routed through `lib/i18n`
 * (`docs/ENGINEERING_GUIDELINES.md` §9).
 */

import type { ConsultingIntelligenceCycleResult } from "./types";

/** Persisted on `workspace.lastOvernightReview` — see `types/workspace.ts`. */
export interface OvernightDigest {
  at: string;
  /** True only when something a client would recognize actually moved. */
  changed: boolean;
  /** One sentence. Never empty, never fabricated — honest either way. */
  headline: string;
  /** Zero or more supporting sentences, only present when `changed`. */
  detail: string[];
}

function joinEs(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0]!;
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

/**
 * Compose the digest from one cycle's already-computed result. Never a
 * second scoring model — every number/label here is copied verbatim off
 * `cycle.memory`, the same object `CONSULTING_INTELLIGENCE_AGENT.md`
 * documents.
 */
export function buildOvernightDigest(
  cycle: ConsultingIntelligenceCycleResult,
  companyName: string,
  at: string,
): OvernightDigest {
  const { memory, newlyCompletedCapabilityIds } = cycle;

  const completedLabels = newlyCompletedCapabilityIds
    .map((id) => memory.capabilities.find((capability) => capability.id === id)?.label)
    .filter((label): label is string => Boolean(label));

  const understandingRose = memory.understanding.changed && memory.understanding.delta > 0;

  const clauses: string[] = [];

  if (understandingRose) {
    clauses.push(
      `la comprensión del negocio subió de ${memory.understanding.previous}% a ${memory.understanding.current}%`,
    );
  }

  if (completedLabels.length > 0) {
    clauses.push(
      `completamos el entendimiento de ${joinEs(completedLabels)}`,
    );
  }

  const changed = clauses.length > 0;
  const detail: string[] = [];

  if (changed) {
    const topFromMissing = memory.missingEvidence[0];
    const gap = topFromMissing?.gaps[0] ?? memory.highestValueUnknown?.gap ?? null;
    const topicLabel = topFromMissing?.topicLabel ?? memory.highestValueUnknown?.topicLabel ?? null;
    if (gap && topicLabel) {
      detail.push(`Lo que más ayudaría a seguir avanzando: ${gap} (${topicLabel}).`);
    }
    return {
      at,
      changed: true,
      headline: `En la revisión automática de esta madrugada sobre ${companyName}, ${clauses.join("; ")}.`,
      detail,
    };
  }

  return {
    at,
    changed: false,
    headline: `En la revisión automática de esta madrugada, volvimos a mirar todo lo que sabemos de ${companyName} y no encontramos cambios que reportar todavía — seguimos atentos a la próxima reunión, documento o respuesta.`,
    detail: [],
  };
}

/** How many milliseconds a digest stays "fresh" enough to show as a banner. */
export const OVERNIGHT_DIGEST_FRESHNESS_MS = 36 * 60 * 60 * 1000;

export function isOvernightDigestFresh(
  digest: OvernightDigest | null | undefined,
  now: Date = new Date(),
): digest is OvernightDigest {
  if (!digest) return false;
  const at = new Date(digest.at).getTime();
  if (Number.isNaN(at)) return false;
  return now.getTime() - at <= OVERNIGHT_DIGEST_FRESHNESS_MS;
}
