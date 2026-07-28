/**
 * Consulting Intelligence Agent — per-capability discovery state.
 *
 * Mission A's Capability Digital Twin already answers what we know, what we
 * don't, and how confident that honestly is. This module adds the only two
 * things it does not: *how much longer would this take* and *is this
 * capability finished*.
 *
 * Both reuse existing platform constants rather than inventing a bar:
 *   - remaining time = open gaps × `MINUTES_PER_CLARIFICATION`, the same
 *     coarse estimate `lib/readiness` already shows the client.
 *   - the completion bar = `READY_CONFIDENCE`, the same 70 the Readiness
 *     Engine already calls "ready to advise on".
 *
 * Completion requires *both* the bar and zero open gaps, so a capability can
 * never auto-stop while a known question is still outstanding.
 */

import { assessCapabilityDigitalTwin } from "@/lib/discovery-agent/capabilities";
import { MINUTES_PER_CLARIFICATION, READY_CONFIDENCE } from "@/lib/readiness";
import type { CompanyWorkspace } from "@/types";
import type { CapabilityDiscoveryState } from "./types";

/**
 * Per-capability discovery state for a workspace.
 *
 * Reads the Mission A twin verbatim — every `confidence`, `known`, `unknown`,
 * risk and recommendation below is Mission A's, unchanged.
 */
export function deriveCapabilityIntelligence(
  workspace: CompanyWorkspace,
): CapabilityDiscoveryState[] {
  const report = assessCapabilityDigitalTwin(workspace);

  return report.capabilities.map((twin) => {
    const openGaps = twin.unknown.length;
    const estimatedRemainingMinutes = openGaps * MINUTES_PER_CLARIFICATION;

    // An unmeasured capability (Legal, Cumplimiento today) reports zero open
    // gaps simply because no engine tracks it. Calling that "complete" would
    // silently promote ignorance to knowledge, so it never completes.
    const discoveryComplete =
      twin.measured &&
      twin.hasEvidence &&
      openGaps === 0 &&
      twin.confidence >= READY_CONFIDENCE;

    return {
      id: twin.id,
      label: twin.label,
      known: twin.known,
      unknown: twin.unknown,
      confidence: twin.confidence,
      risks: twin.whyLow ? [twin.whyLow] : [],
      recommendations: twin.howToRaise,
      estimatedRemainingMinutes,
      discoveryComplete,
      measured: twin.measured,
    };
  });
}

/** Capabilities that must no longer generate discovery requests. */
export function completedCapabilities(
  states: CapabilityDiscoveryState[],
): CapabilityDiscoveryState[] {
  return states.filter((state) => state.discoveryComplete);
}

/**
 * Whether discovery should still ask about a capability.
 *
 * The auto-stop the mission asks for: once a capability is complete, the
 * interview stops requesting evidence for it.
 */
export function shouldAskAboutCapability(
  states: CapabilityDiscoveryState[],
  id: CapabilityDiscoveryState["id"],
): boolean {
  const state = states.find((candidate) => candidate.id === id);
  if (!state) return true;
  return !state.discoveryComplete;
}

/** Total minutes of discovery still outstanding across every capability. */
export function totalRemainingDiscoveryMinutes(
  states: CapabilityDiscoveryState[],
): number {
  return states.reduce((sum, state) => sum + state.estimatedRemainingMinutes, 0);
}
