/**
 * Mission 31 — Pilot truth metrics (presentation compose only).
 *
 * ONE source of truth for dashboard / orientation / OS hero counts.
 * Never invent or inflate activity. Reuses Readiness inventory + workspace
 * fields already published — no second scorer.
 *
 * Preferred metrics:
 * - Discovery conversations (honest: 1 if interview memory exists, else 0)
 * - Learned facts
 * - Uploaded documents (processed knowledge assets)
 * - Discovery sessions (real human conversations — never transcript ingestion)
 * - Transcripts processed (internal ingestion events — never shown as "reuniones")
 * - Business understanding %
 */

import { countDiscoverySessions, countTranscriptIngestEvents } from "@/lib/memory/meeting-kind";
import { snapshotFromWorkspace } from "@/lib/readiness";
import type { CompanyWorkspace } from "@/types";

export interface PilotTruthMetrics {
  discoveryConversations: number;
  learnedFacts: number;
  uploadedDocuments: number;
  /** Real human discovery sessions only — never internal transcript/document ingestion. Falls back to `discoveryConversations` when a conversation is underway but no session `Meeting` has been recorded yet. */
  discoverySessions: number;
  /** Internal ingestion events (pasted/uploaded meeting transcripts) that created a `Meeting` record — never presented as a "reunión". */
  transcriptsProcessed: number;
  understandingPercent: number;
  /** Short Spanish chips for hero strips — only non-zero preferred metrics. */
  chips: string[];
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Single compose path for client-visible activity counts.
 */
export function buildPilotTruthMetrics(
  workspace: CompanyWorkspace,
): PilotTruthMetrics {
  const inventory = snapshotFromWorkspace(workspace).inventory;
  const learnedFacts =
    workspace.conversationMemory?.knownFacts?.length ??
    inventory.interviewFacts;
  const uploadedDocuments =
    workspace.knowledge?.assets?.filter((a) => a.status === "processed")
      .length ?? inventory.documents;
  const discoveryConversations =
    workspace.conversationMemory || workspace.activeInterviewId ? 1 : 0;
  const meetings = workspace.meetings ?? [];
  const discoverySessionMeetings = workspace.meetings
    ? countDiscoverySessions(meetings)
    : inventory.discoverySessions;
  // Prefer the real Meeting count; fall back to the 0/1 "conversation under
  // way" signal only when no session Meeting has been recorded yet, so the
  // chip never reads "0" while a live interview is in progress.
  const discoverySessions =
    discoverySessionMeetings > 0 ? discoverySessionMeetings : discoveryConversations;
  const transcriptsProcessed = workspace.meetings
    ? countTranscriptIngestEvents(meetings)
    : Math.max(0, inventory.meetings - inventory.discoverySessions);
  const understandingPercent = clampPercent(workspace.businessUnderstanding);

  const chips: string[] = [];
  if (discoveryConversations > 0) {
    chips.push(
      discoveryConversations === 1
        ? "1 conversación de descubrimiento"
        : `${discoveryConversations} conversaciones de descubrimiento`,
    );
  }
  if (learnedFacts > 0) {
    chips.push(
      learnedFacts === 1
        ? "1 hecho aprendido"
        : `${learnedFacts} hechos aprendidos`,
    );
  }
  if (uploadedDocuments > 0) {
    chips.push(
      uploadedDocuments === 1
        ? "1 documento cargado"
        : `${uploadedDocuments} documentos cargados`,
    );
  }
  if (discoverySessions > 0) {
    chips.push(
      discoverySessions === 1
        ? "1 sesión de descubrimiento"
        : `${discoverySessions} sesiones de descubrimiento`,
    );
  }
  if (transcriptsProcessed > 0) {
    chips.push(
      transcriptsProcessed === 1
        ? "1 transcripción procesada"
        : `${transcriptsProcessed} transcripciones procesadas`,
    );
  }
  chips.push(
    `Comprensión del negocio: ${understandingPercent}%`,
  );

  return {
    discoveryConversations,
    learnedFacts,
    uploadedDocuments,
    discoverySessions,
    transcriptsProcessed,
    understandingPercent,
    chips,
  };
}
