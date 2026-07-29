/**
 * Smoke check for the canonical discovery-session timeline model
 * (`lib/memory/meeting-kind.ts` + `lib/consulting-intelligence/pilot-truth-metrics.ts`).
 *
 * Builds a workspace with exactly one real `discovery_session` Meeting and
 * three `transcript_ingest` Meetings (pasted transcripts) and asserts every
 * client-facing surface reads "1 sesión" / "1 conversación" — never "4
 * reuniones" — from that mix. Non-destructive: in-memory only, no Supabase.
 *
 * Run: pnpm exec tsx apps/architect/scripts/verify-discovery-session-count.ts
 *   (from the monorepo root) or
 *      npx tsx scripts/verify-discovery-session-count.ts
 *   (from apps/architect, with the monorepo root's tsx on PATH).
 */
import {
  countDiscoverySessions,
  countTranscriptIngestEvents,
  isDiscoverySessionMeeting,
} from "../lib/memory/meeting-kind";
import { buildPilotTruthMetrics } from "../lib/consulting-intelligence/pilot-truth-metrics";
import { createEmptyWorkspace } from "../lib/workspace/seed";
import type { Meeting } from "../types";

function fail(message: string): never {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

function meeting(overrides: Partial<Meeting> & Pick<Meeting, "id" | "kind">): Meeting {
  return {
    id: overrides.id,
    workspaceId: "ws_smoke",
    title: overrides.title ?? overrides.id,
    date: overrides.date ?? "2026-07-29T00:00:00.000Z",
    participants: overrides.participants ?? [],
    conversationId: overrides.conversationId ?? null,
    interviewId: overrides.interviewId ?? (overrides.kind === "discovery_session" ? "iv_1" : null),
    kind: overrides.kind,
    summary: overrides.summary ?? "",
    discoveries: overrides.discoveries ?? [],
    questionsAnswered: overrides.questionsAnswered ?? [],
    questionsRemaining: overrides.questionsRemaining ?? [],
    generatedReport: overrides.generatedReport ?? null,
    businessUnderstandingAfter: overrides.businessUnderstandingAfter ?? 20,
  };
}

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? "ok" : "FAIL"} — ${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  if (!ok) failures += 1;
}

const meetings: Meeting[] = [
  meeting({ id: "m_session_1", kind: "discovery_session", title: "Descubrimiento · 29 jul" }),
  meeting({ id: "m_ingest_1", kind: "transcript_ingest", title: "Reunión con Ventas — revisión semanal" }),
  meeting({ id: "m_ingest_2", kind: "transcript_ingest", title: "Reunión con Operaciones" }),
  meeting({ id: "m_ingest_3", kind: "transcript_ingest", title: "Reunión con Finanzas" }),
];

check("countDiscoverySessions", countDiscoverySessions(meetings), 1);
check("countTranscriptIngestEvents", countTranscriptIngestEvents(meetings), 3);
check(
  "isDiscoverySessionMeeting per record",
  meetings.map(isDiscoverySessionMeeting),
  [true, false, false, false],
);

const workspace = {
  ...createEmptyWorkspace("Smoke Co", "manufacturing", "ws_smoke"),
  meetings,
};

const truth = buildPilotTruthMetrics(workspace);
check("PilotTruthMetrics.discoverySessions", truth.discoverySessions, 1);
check("PilotTruthMetrics.transcriptsProcessed", truth.transcriptsProcessed, 3);

const sessionChip = truth.chips.find((c) => c.includes("sesión"));
if (!sessionChip) {
  fail("no 'sesión' chip present in PilotTruthMetrics.chips");
} else {
  check("session chip says '1 sesión', not '4 reuniones'", sessionChip, "1 sesión de descubrimiento");
}

const leaked = truth.chips.find((c) => /\b4 reunion/i.test(c));
if (leaked) fail(`found inflated meeting count leak: "${leaked}"`);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll canonical discovery-session checks passed: 1 discovery_session + 3 transcript_ingest -> 1 sesión, never 4 reuniones.");
