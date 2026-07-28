/**
 * Consulting Intelligence Agent — contracts.
 *
 * The agent is not a chatbot, a support desk or an assistant. It is a
 * permanent background consultant that wakes up whenever new evidence lands
 * and asks one question: *did our understanding of this company just change,
 * and if so what should we do about it?*
 *
 * Everything here is a **working note**, not a client deliverable. The
 * client (Álvaro) must never see this vocabulary — hypotheses, assumptions,
 * confidence notes, contradictions and risks are how a consultant thinks in
 * private, not what a consultant says out loud. See `visibility.ts` for the
 * gate that enforces it.
 *
 * Full write-up: `CONSULTING_INTELLIGENCE_AGENT.md`.
 */

import type { ReadinessTopicId } from "@/lib/readiness";
import type { CapabilityId } from "@/lib/discovery-agent/capabilities";
import type { RetrievalItemKind, RetrievalProvenance } from "@/lib/ai/retrieval";

/**
 * What kind of evidence woke the agent up.
 *
 * `scheduled_review` (Mission 24 — Autonomous Consulting Cycle) is the one
 * kind with no new evidence payload of its own: a cron job re-runs the same
 * cycle on a schedule instead of waiting for the next interview answer or
 * document, so a stale twin still gets re-read even on a quiet week. It is
 * still just another `EvidenceEvent` — the cycle needed zero changes to
 * accept it, exactly as this type already promised.
 */
export type EvidenceEventKind =
  | "interview_answer"
  | "document"
  | "meeting"
  | "note"
  | "workflow"
  | "scheduled_review";

/**
 * The trigger handed to `runConsultingIntelligenceCycle`. Deliberately thin:
 * the agent reads the *workspace* for state, never the event payload, so a
 * new evidence source can be wired in without touching the cycle.
 */
export interface EvidenceEvent {
  kind: EvidenceEventKind;
  /** Internal label for the working log, e.g. a file name or question key. */
  label: string;
  at?: string;
  /**
   * Raw text of the newest evidence when the source has one. Used only to
   * give the existing contradiction detector a fresh string to compare.
   */
  text?: string;
  /**
   * Mission C — the meeting this evidence was captured in, when there is
   * one. Threaded into `RetrievalPack` so an "answer" item can point back to
   * the session that produced it, not just the fact key.
   */
  meetingId?: string | null;
}

/** One internal note. `basis` records which engine produced it. */
export interface WorkingNote {
  id: string;
  statement: string;
  /** Which existing engine this came from — no note is ever agent-invented. */
  basis: string;
  /** 0–100 where the source engine published one, else `null`. */
  confidence: number | null;
}

/** A contradiction worth clarifying, in the soft register the platform uses. */
export interface WorkingContradiction {
  id: string;
  statement: string;
  claimA: string | null;
  claimB: string | null;
  confidence: number | null;
  basis: string;
}

/** A concrete gap, ranked by the Missing Information Engine's own estimate. */
export interface MissingEvidenceItem {
  id: string;
  topic: ReadinessTopicId;
  topicLabel: string;
  /** The gaps this would close, in consultant words. */
  gaps: string[];
  /** What to bring, when a document can plausibly close it. */
  uploadSuggestions: string[];
  /** Points of Business Understanding this would add — engine's own figure. */
  estimatedLiftPercent: number;
}

/**
 * One item from the agent's `RetrievalPack` (Mission C — `lib/ai/retrieval`):
 * recent answers, matching document chunks, related knowledge entities and
 * open readiness gaps, capped and ranked together. `kind` and `provenance`
 * trace it back to the exact record it came from.
 */
export interface RelatedEvidenceItem {
  id: string;
  topic: ReadinessTopicId | null;
  sourceLabel: string;
  statement: string;
  strength: number;
  kind: RetrievalItemKind;
  provenance: RetrievalProvenance;
}

/**
 * Per-capability discovery state — the Mission A Capability Digital Twin
 * plus the two judgements the agent adds on top of it: how much discovery
 * time is left, and whether this capability is finished.
 *
 * No confidence is recomputed here. `confidence` is copied verbatim from the
 * Mission A twin, which itself copies `computeDiscoveryScore`.
 */
export interface CapabilityDiscoveryState {
  id: CapabilityId;
  label: string;
  known: string[];
  unknown: string[];
  /** Verbatim from the Mission A twin. Never recomputed. */
  confidence: number;
  /** Why confidence sits where it does — Mission A's own sentence. */
  risks: string[];
  /** What would raise it — Mission A's own next step(s). */
  recommendations: string[];
  /**
   * Minutes left, at the platform's existing `MINUTES_PER_CLARIFICATION`
   * estimate per open gap. `0` once nothing is open.
   */
  estimatedRemainingMinutes: number;
  /**
   * True when the confidence bar is met **and** no tracked gap remains.
   * Capabilities no engine measures yet (Legal, Cumplimiento) are never
   * marked complete — an unmeasured area is not a finished one.
   */
  discoveryComplete: boolean;
  /** False for capabilities no current engine tracks. */
  measured: boolean;
}

/**
 * The internal self-check a senior consultant runs before opening their
 * mouth. Recorded so a human can audit *why* the agent asked (or didn't).
 */
export interface ConsultingSelfCheck {
  /** What do we believe about this company right now? */
  believe: string;
  /** Why do we believe it — which evidence? */
  why: string;
  /** What evidence do we actually hold? */
  evidence: string[];
  /** What contradicts it? */
  contradicts: string[];
  /** What would increase confidence the most? */
  whatIncreasesConfidence: string | null;
  /** Is another question necessary at all? */
  questionNecessary: boolean;
  /** Plain-language reason for that verdict. */
  reason: string;
}

/** Ask again, or stop and advise. Mirrors the Readiness Engine's own verdict. */
export interface QuestionDecision {
  action: "ask" | "stop";
  /** Internal reason. Never rendered to the client. */
  reason: string;
  /** Capabilities that must no longer generate discovery requests. */
  autoStoppedCapabilities: CapabilityId[];
  /** The one thing worth asking about next, when asking. */
  focusTopic: ReadinessTopicId | null;
}

/** Did understanding actually move? */
export interface UnderstandingDelta {
  previous: number;
  current: number;
  delta: number;
  changed: boolean;
}

/** The single highest-value unknown — one, never a list. */
export interface HighestValueUnknown {
  topic: ReadinessTopicId;
  topicLabel: string;
  /** The gap itself, in consultant words. */
  gap: string;
  estimatedLiftPercent: number;
  /** Concrete way to close it, when a document can. */
  howToClose: string | null;
}

/**
 * The agent's persistent internal working memory.
 *
 * INTERNAL ONLY. Persisted on the workspace JSON so reasoning survives
 * restarts, but never rendered in Client Mode. The `internal` flag is a
 * tripwire: any client-facing serializer that starts carrying an object
 * with `internal: true` has a bug.
 */
export interface ConsultingWorkingMemory {
  readonly internal: true;
  version: 1;
  updatedAt: string;
  /** How many cycles have run for this workspace. */
  cycles: number;
  lastEvent: {
    kind: EvidenceEventKind;
    label: string;
    at: string;
  };
  understanding: UnderstandingDelta;
  capabilities: CapabilityDiscoveryState[];
  hypotheses: WorkingNote[];
  assumptions: WorkingNote[];
  confidenceNotes: WorkingNote[];
  contradictions: WorkingContradiction[];
  missingEvidence: MissingEvidenceItem[];
  automations: WorkingNote[];
  implementationRisks: WorkingNote[];
  followUpAreas: WorkingNote[];
  relatedEvidence: RelatedEvidenceItem[];
  highestValueUnknown: HighestValueUnknown | null;
  selfCheck: ConsultingSelfCheck;
  questionDecision: QuestionDecision;
  /** Which engines this cycle actually re-ran — an audit trail, not a plan. */
  enginesRun: string[];
}

/** Result of one cycle: the updated workspace plus the memory just written. */
export interface ConsultingIntelligenceCycleResult {
  workspace: import("@/types").CompanyWorkspace;
  memory: ConsultingWorkingMemory;
  /**
   * True when this cycle changed something worth a consultant's attention
   * (understanding moved, a contradiction appeared, a capability completed).
   */
  understandingChanged: boolean;
  /**
   * Capabilities whose `discoveryComplete` flag flipped to `true` in this
   * cycle specifically (not merely already complete before it ran). Empty
   * on every cycle where nothing newly finished. Mission 24's overnight
   * digest reads this instead of re-diffing capability lists itself — one
   * diff, computed once, here.
   */
  newlyCompletedCapabilityIds: CapabilityId[];
}
