import type { CompanyWorkspace, ConversationMemory, KnownFact } from "@/types";
import { applyDiscoveryScore } from "@/lib/reasoning";
import { resolveMeetingKind } from "./meeting-kind";

/**
 * A single fact that the old `lib/workspace/seed.ts` pilot seed invented.
 *
 * Two fingerprints, both unique to that seed: the `seed_fact_` key prefix,
 * and the literal placeholder evidence string (a real fact always cites the
 * client's own words or the knowledge asset it came from). Shared by the
 * workspace-row heal (`lib/repositories/migrate.ts`) and the in-flight
 * interview heal below — see PILOT_FAKE_PCT_AND_ENGLISH_FIX.md.
 */
export function isFabricatedSeedFact(fact: KnownFact): boolean {
  return (
    fact.key.startsWith("seed_fact_") ||
    fact.evidence.includes("Sesión de descubrimiento anterior")
  );
}

/**
 * Strip fabricated seed facts out of a conversation memory and recompute an
 * honest score from whatever real evidence survives. A no-op (same
 * reference) when nothing fabricated is present, so callers can use this
 * unconditionally on every load without perturbing a clean memory.
 *
 * Unlike the workspace-row heal in `migrate.ts`, this never resets the rest
 * of the interview (turns, conversation, participant, etc.) — an in-flight
 * session with zero real facts left after pruning simply reports an honest
 * 0%, which is the correct "en formación" state.
 */
export function healConversationMemory(
  memory: ConversationMemory,
): ConversationMemory {
  const knownFacts = memory.knownFacts.filter(
    (fact) => !isFabricatedSeedFact(fact),
  );
  if (knownFacts.length === memory.knownFacts.length) return memory;
  return applyDiscoveryScore({ ...memory, knownFacts });
}

/**
 * Backfill `Meeting.kind` on records persisted before the discriminator
 * existed (see `lib/memory/meeting-kind.ts`): an interview-linked meeting
 * heals to `discovery_session`, everything else — every pre-existing
 * meeting only ever came from `apply-interview.ts` or the document
 * pipeline's transcript path — heals to `transcript_ingest`. A no-op (same
 * reference) once every meeting already carries its kind, so this can run
 * unconditionally on every load.
 */
export function healMeetingKinds(workspace: CompanyWorkspace): CompanyWorkspace {
  let changed = false;
  const meetings = workspace.meetings.map((meeting) => {
    const kind = resolveMeetingKind(meeting);
    if (meeting.kind === kind) return meeting;
    changed = true;
    return { ...meeting, kind };
  });
  return changed ? { ...workspace, meetings } : workspace;
}
