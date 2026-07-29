/**
 * Consulting Intelligence Agent — Company Brain (Mission 21, Company Brain
 * pass).
 *
 * One client-facing place that answers "what does Architect currently know
 * about my company?" by composing reports every other screen already
 * publishes — the Capability Digital Twin, the Missing Information Engine,
 * the Discovery Complete/Incomplete ceremony and the Consultant Readiness
 * Engine's own evidence snapshot. This module invents nothing: it never
 * recomputes a confidence figure, never adds a discovery dimension, and
 * never fabricates an activity or a timeline event.
 *
 * System names stay internal. A client reading this file's output sees one
 * mental model — "known / still learning / recent learning / trust" — never
 * "Capability Digital Twin" or "Missing Information Engine".
 *
 * Every Spanish sentence here is generated in this file, same rule as the
 * rest of `lib/readiness` / `lib/consulting-intelligence` (see
 * `next-step-voice.ts`, `docs/ENGINEERING_GUIDELINES.md` §9) — never routed
 * through `lib/i18n`. Chrome (kickers, button labels, empty-state titles)
 * belongs to the presentation layer and `lib/i18n` instead.
 */

import {
  capabilityDimensions,
  type CapabilityDigitalTwinReport,
  type CapabilityId,
} from "@/lib/discovery-agent/capabilities";
import {
  snapshotFromWorkspace,
  type EvidenceSnapshot,
  type MissingInformationReport,
} from "@/lib/readiness";
import type { CompanyWorkspace } from "@/types";
import type { DiscoveryCompletionStatus } from "./discovery-status";
import { buildPilotTruthMetrics } from "./pilot-truth-metrics";
import type { CapabilityDiscoveryState } from "./types";

/** One business area the client already recognizes (Ventas, Operaciones…). */
export interface CompanyBrainArea {
  id: CapabilityId;
  label: string;
  /** 0–100, verbatim from the Capability Digital Twin — never recomputed. */
  confidence: number;
  /** Real evidence signals backing this area — counted, never estimated. */
  evidenceCount: number;
  /** Most recent evidence timestamp for this area, `null` when unknown. */
  lastUpdatedAt: string | null;
  /** Real evidence statements, capped by the twin itself — the "expand" detail. */
  evidence: string[];
}

/** One concrete gap, ranked by the same estimated business impact the Missing Information Engine already publishes. */
export interface CompanyBrainLearningItem {
  id: CapabilityId;
  label: string;
  /** Why this is still open — the twin's own sentence, never invented here. */
  why: string;
  /** Minutes of conversation to close it, `null` once there is nothing to time. */
  etaMinutes: number | null;
  /** "+9% de comprensión" when a ranked opportunity backs this area, else `null`. */
  impactLabel: string | null;
  /** False for areas no engine measures yet (Legal, Cumplimiento) — shown honestly, never hidden. */
  measured: boolean;
}

/** Aggregate, honest counts from the same evidence stores every other screen already reads. */
export interface CompanyBrainTrustCenter {
  businessUnderstandingPercent: number;
  /** Short Spanish chips, e.g. "12 hechos capturados" — same style `ConfidenceMeter` already renders. */
  evidenceChips: string[];
  facts: number;
  documents: number;
  meetings: number;
  businessRules: number;
  importedRecords: number;
  workflows: number;
  /** Business-area labels still open or not tracked — the same ones section 2 lists in full. */
  missingAreas: string[];
  headline: string;
}

export interface CompanyBrainReport {
  generatedAt: string;
  /** "WHAT ARCHITECT KNOWS" headline — the twin's own summary. */
  knowsHeadline: string;
  areas: CompanyBrainArea[];
  /** "WHAT ARCHITECT IS STILL LEARNING" headline. */
  learningHeadline: string;
  stillLearning: CompanyBrainLearningItem[];
  trust: CompanyBrainTrustCenter;
}

export interface CompanyBrainInput {
  workspace: CompanyWorkspace;
  capabilityTwin: CapabilityDigitalTwinReport;
  missingInformation: MissingInformationReport;
  discoveryCompletion: DiscoveryCompletionStatus;
}

function pluralEs(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

function evidenceStatsFor(
  capabilityId: CapabilityId,
  snapshot: EvidenceSnapshot,
): { count: number; lastUpdatedAt: string | null } {
  const dimensions = capabilityDimensions(capabilityId);
  if (dimensions.length === 0) return { count: 0, lastUpdatedAt: null };

  const matching = snapshot.signals.filter(
    (signal) => signal.topic && dimensions.includes(signal.topic),
  );
  const timestamps = matching
    .map((signal) => signal.capturedAt)
    .filter((value): value is string => Boolean(value))
    .sort();

  return {
    count: matching.length,
    lastUpdatedAt: timestamps.length > 0 ? timestamps[timestamps.length - 1]! : null,
  };
}

/**
 * Priority order for "still learning": reuse the Missing Information
 * Engine's own ranking (already sorted by estimated business impact) — an
 * area whose dimension appears earliest there is the highest-priority
 * teach-me-this gap. Areas with no matching opportunity (an already-thin
 * dimension with nothing left to estimate, or an unmeasured capability) sort
 * after every ranked one, by lowest confidence first, so the least-known
 * area still surfaces before a nearly-complete one. Not-tracked capabilities
 * always come last — no engine has ranked them at all.
 */
function rankStillLearning(
  missingCapabilities: CapabilityDiscoveryState[],
  notTrackedCapabilities: CapabilityDiscoveryState[],
  missingInformation: MissingInformationReport,
): CapabilityDiscoveryState[] {
  const opportunityRank = new Map<string, number>();
  missingInformation.opportunities.forEach((opportunity, index) => {
    if (!opportunityRank.has(opportunity.topic)) {
      opportunityRank.set(opportunity.topic, index);
    }
  });

  const rankOf = (capability: CapabilityDiscoveryState): number => {
    const ranks = capabilityDimensions(capability.id)
      .map((dimension) => opportunityRank.get(dimension))
      .filter((rank): rank is number => rank !== undefined);
    return ranks.length > 0 ? Math.min(...ranks) : Number.POSITIVE_INFINITY;
  };

  const ranked = [...missingCapabilities].sort((a, b) => {
    const rankDiff = rankOf(a) - rankOf(b);
    if (rankDiff !== 0) return rankDiff;
    return a.confidence - b.confidence;
  });

  return [...ranked, ...notTrackedCapabilities];
}

function impactLabelFor(
  capability: CapabilityDiscoveryState,
  missingInformation: MissingInformationReport,
): string | null {
  const dimensions = capabilityDimensions(capability.id);
  const opportunity = missingInformation.opportunities.find((item) =>
    dimensions.includes(item.topic),
  );
  return opportunity ? `+${opportunity.estimatedLiftPercent}% de comprensión` : null;
}

function buildTrustEvidenceChips(trust: {
  facts: number;
  documents: number;
  meetings: number;
  discoveryConversations: number;
  businessRules: number;
  workflows: number;
}): string[] {
  const chips: string[] = [];
  if (trust.discoveryConversations > 0) {
    chips.push(
      trust.discoveryConversations === 1
        ? "1 conversación de descubrimiento"
        : `${trust.discoveryConversations} conversaciones de descubrimiento`,
    );
  }
  if (trust.facts > 0) {
    chips.push(
      `${trust.facts} ${pluralEs(trust.facts, "hecho aprendido", "hechos aprendidos")}`,
    );
  }
  if (trust.documents > 0) {
    chips.push(
      `${trust.documents} ${pluralEs(trust.documents, "documento cargado", "documentos cargados")}`,
    );
  }
  if (trust.meetings > 0) {
    chips.push(
      `${trust.meetings} ${pluralEs(trust.meetings, "reunión registrada", "reuniones registradas")}`,
    );
  }
  if (trust.businessRules > 0) {
    chips.push(
      `${trust.businessRules} ${pluralEs(trust.businessRules, "regla de negocio identificada", "reglas de negocio identificadas")}`,
    );
  }
  if (trust.workflows > 0) {
    chips.push(
      `${trust.workflows} ${pluralEs(trust.workflows, "proceso mapeado", "procesos mapeados")}`,
    );
  }
  return chips;
}

function buildTrustHeadline(percent: number, chips: string[]): string {
  if (chips.length === 0) {
    return "Todavía no hay evidencia registrada — esta sección se irá completando con cada documento, respuesta o reunión.";
  }
  return `El ${percent}% de comprensión del negocio se apoya en ${chips.join(", ")}.`;
}

/**
 * Build the Company Brain report from the same reports `WorkspaceView`
 * already computes once per render — pure composition, no recomputation, no
 * new scoring, no fabricated activity.
 */
export function buildCompanyBrain(input: CompanyBrainInput): CompanyBrainReport {
  const { workspace, capabilityTwin, missingInformation, discoveryCompletion } = input;
  const snapshot = snapshotFromWorkspace(workspace);

  const areas: CompanyBrainArea[] = capabilityTwin.capabilities
    .filter((capability) => capability.hasEvidence)
    .map((capability) => {
      const stats = evidenceStatsFor(capability.id, snapshot);
      return {
        id: capability.id,
        label: capability.label,
        confidence: capability.confidence,
        evidenceCount: stats.count,
        lastUpdatedAt: stats.lastUpdatedAt,
        evidence: capability.known,
      };
    })
    .sort((a, b) => b.confidence - a.confidence);

  const rankedGaps = rankStillLearning(
    discoveryCompletion.missingCapabilities,
    discoveryCompletion.notTrackedCapabilities,
    missingInformation,
  );

  const stillLearning: CompanyBrainLearningItem[] = rankedGaps.map((capability) => ({
    id: capability.id,
    label: capability.label,
    why:
      capability.risks[0] ??
      `Todavía no hay evidencia suficiente sobre ${capability.label.toLowerCase()}.`,
    etaMinutes: capability.estimatedRemainingMinutes > 0 ? capability.estimatedRemainingMinutes : null,
    impactLabel: impactLabelFor(capability, missingInformation),
    measured: capability.measured,
  }));

  const workflows = workspace.businessProcesses?.workflows.length ?? 0;
  const truth = buildPilotTruthMetrics(workspace);
  const trustCounts = {
    facts: truth.learnedFacts,
    documents: truth.uploadedDocuments,
    meetings: truth.meetings,
    discoveryConversations: truth.discoveryConversations,
    businessRules: snapshot.inventory.businessRules,
    importedRecords: 0, // never surface evidence-log length as "meetings" or activity
    workflows,
  };
  const evidenceChips = buildTrustEvidenceChips(trustCounts);
  const businessUnderstandingPercent = truth.understandingPercent;

  const trust: CompanyBrainTrustCenter = {
    businessUnderstandingPercent,
    evidenceChips,
    ...trustCounts,
    missingAreas: [
      ...discoveryCompletion.missingCapabilities.map((c) => c.label),
      ...discoveryCompletion.notTrackedCapabilities.map((c) => c.label),
    ],
    headline: buildTrustHeadline(businessUnderstandingPercent, evidenceChips),
  };

  return {
    generatedAt: discoveryCompletion.generatedAt,
    knowsHeadline: capabilityTwin.headline,
    areas,
    learningHeadline:
      stillLearning.length === 0 ? discoveryCompletion.continuityNote : missingInformation.headline,
    stillLearning,
    trust,
  };
}
