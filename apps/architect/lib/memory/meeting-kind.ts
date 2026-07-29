/**
 * Discovery Sessions vs Internal Ingestion Events.
 *
 * `workspace.meetings` holds two very different things that both happen to
 * be `Meeting` records: real human discovery sessions
 * (`lib/memory/apply-interview.ts`) and internal transcript/document
 * ingestion events (`lib/documents/pipeline.ts`). Client-facing copy must
 * never use one to represent the other — "6 reuniones" is a lie when only
 * one human conversation ever happened.
 *
 * `Meeting.kind` is the discriminator going forward. This module is the one
 * place that resolves it — including for records persisted before the field
 * existed — so every surface counts the same way.
 */

import type { Meeting, MeetingKind } from "@/types";

/**
 * Resolve a meeting's kind, healing records persisted before `kind` existed:
 * an interview-linked meeting is a real discovery session; anything else
 * only ever reached `workspace.meetings` through the document/transcript
 * ingestion pipeline.
 */
export function resolveMeetingKind(meeting: Meeting): MeetingKind {
  if (meeting.kind === "discovery_session" || meeting.kind === "transcript_ingest") {
    return meeting.kind;
  }
  return meeting.interviewId ? "discovery_session" : "transcript_ingest";
}

export function isDiscoverySessionMeeting(meeting: Meeting): boolean {
  return resolveMeetingKind(meeting) === "discovery_session";
}

export function isTranscriptIngestMeeting(meeting: Meeting): boolean {
  return resolveMeetingKind(meeting) === "transcript_ingest";
}

/** Real human discovery sessions only — never internal ingestion events. */
export function countDiscoverySessions(meetings: Meeting[]): number {
  return meetings.filter(isDiscoverySessionMeeting).length;
}

/** Internal transcript/document ingestion events that created a `Meeting` record. */
export function countTranscriptIngestEvents(meetings: Meeting[]): number {
  return meetings.filter(isTranscriptIngestMeeting).length;
}
