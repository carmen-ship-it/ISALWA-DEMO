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
 *   working-memory.ts    private notes, each traced to the engine that made it
 *   self-check.ts        believe / why / evidence / contradicts / is this needed
 *   visibility.ts        the Client Mode gate — Álvaro never sees the notebook
 *
 * Full write-up: `CONSULTING_INTELLIGENCE_AGENT.md`.
 */

export { runConsultingIntelligenceCycle } from "./cycle";

export {
  completedCapabilities,
  deriveCapabilityIntelligence,
  shouldAskAboutCapability,
  totalRemainingDiscoveryMinutes,
} from "./capability-state";

export { decideNextQuestion, runSelfCheck } from "./self-check";

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
