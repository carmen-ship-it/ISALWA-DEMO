/**
 * Consulting Intelligence Agent.
 *
 * A permanent background consultant, not a chatbot and not an assistant. It
 * has no conversational surface at all: it wakes on evidence, re-reads what
 * the existing engines say, writes down what changed in a private notebook,
 * and decides whether another question is even warranted.
 *
 *   cycle.ts             `runConsultingIntelligenceCycle` — the nine-step loop
 *   capability-state.ts  Mission A twin + remaining time + discovery complete
 *   discovery-status.ts  Mission E — the Discovery Complete/Incomplete ceremony
 *   working-memory.ts    private notes, each traced to the engine that made it
 *   self-check.ts        believe / why / evidence / contradicts / is this needed
 *   visibility.ts        the Client Mode gate — Álvaro never sees the notebook
 *   next-step-voice.ts   Mission 20 — the always-on "what should I do next" voice
 *   daily-brief.ts       Mission 20 — Executive Daily Brief: composes the voice +
 *                        missing-information + ceremony + real timeline/meeting/
 *                        document timestamps into the Executive tab's hero
 *   company-brain.ts     Mission 21 (Company Brain pass) — composes the twin +
 *                        missing-information + ceremony + evidence snapshot into
 *                        one client-facing "what does Architect know" report
 *   overnight-review.ts  Mission 24 — is a scheduled review due, and running it
 *   overnight-digest.ts  Mission 24 — the client-safe "what changed overnight" sentence
 *   company-operating-system.ts  Mission 25 + 27 — OS composed from living
 *                        deliverable outputs + fingerprint (no second catalog).
 *                        Deliverables are outputs; the OS is the product.
 *   orientation.ts       pre-pilot orientation panel (know / learning / next)
 *
 * Full write-up: `CONSULTING_INTELLIGENCE_AGENT.md`, `DISCOVERY_CEREMONY.md`,
 * `MISSION20.md`, `MISSION21.md`, `MISSION24.md`, `MISSION25.md`.
 */

export { runConsultingIntelligenceCycle } from "./cycle";

export {
  buildCompanyBrain,
  type CompanyBrainArea,
  type CompanyBrainInput,
  type CompanyBrainLearningItem,
  type CompanyBrainReport,
  type CompanyBrainTrustCenter,
} from "./company-brain";

export {
  buildExecutiveDailyBrief,
  buildMilestones,
  buildRecommendedActions,
  buildSinceLastVisit,
  groupRecentLearning,
  type DailyBriefAction,
  type DailyBriefChange,
  type DailyBriefMilestone,
  type DailyBriefMilestoneState,
  type DailyBriefSinceLastVisit,
  type DailyBriefTimelineGroup,
  type ExecutiveDailyBrief,
  type ExecutiveDailyBriefInput,
  type LastVisitSnapshot,
} from "./daily-brief";

export {
  OVERNIGHT_REVIEW_INTERVAL_MS,
  isOvernightReviewDue,
  runOvernightReview,
  type OvernightReviewOutcome,
} from "./overnight-review";

export {
  OVERNIGHT_DIGEST_FRESHNESS_MS,
  buildOvernightDigest,
  isOvernightDigestFresh,
  type OvernightDigest,
} from "./overnight-digest";

export {
  buildOrientationPanel,
  type OrientationPanelReport,
} from "./orientation";

export {
  buildCompanyOperatingSystem,
  type OperatingSystemModule,
  type OperatingSystemReport,
  type OperatingSystemModuleId,
  type OperatingSystemReadiness,
  type OperatingSystemArtifact,
  type OsArtifactStatus,
  type OsCapabilityCategory,
  type OsCapabilityCategoryId,
  type OsBuiltFrom,
  type OsProgressBar,
  type OsPipelineStep,
} from "./company-operating-system";

export {
  buildImproveDeliverableBrief,
  type ImproveDeliverableBrief,
} from "./improve-deliverable";

export {
  buildOsUpdateNotices,
  type OsUpdateNoticeItem,
  type OsUpdateNotices,
} from "./os-update-notices";

export {
  completedCapabilities,
  deriveCapabilityIntelligence,
  shouldAskAboutCapability,
  totalRemainingDiscoveryMinutes,
} from "./capability-state";

export {
  assessDiscoveryCompletion,
  buildDiscoveryCompletionStatus,
  type DiscoveryCompletionState,
  type DiscoveryCompletionStatus,
} from "./discovery-status";

export { decideNextQuestion, runSelfCheck } from "./self-check";

export {
  buildNextStepVoice,
  type NextStepActionKind,
  type NextStepVoice,
  type NextStepVoiceInput,
} from "./next-step-voice";

export {
  canSeeConsultingWorkingMemory,
  consultingWorkingMemoryFor,
  withoutConsultingWorkingMemory,
  workspaceForRole,
} from "./visibility";

export type {
  CapabilityDiscoveryState,
  ConsultingIntelligenceCycleResult,
  ConsultingSelfCheck,
  ConsultingWorkingMemory,
  EvidenceEvent,
  EvidenceEventKind,
  HighestValueUnknown,
  MissingEvidenceItem,
  QuestionDecision,
  RelatedEvidenceItem,
  UnderstandingDelta,
  WorkingContradiction,
  WorkingNote,
} from "./types";
