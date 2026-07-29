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
 * - Meetings
 * - Business understanding %
 */

import { snapshotFromWorkspace } from "@/lib/readiness";
import type { CompanyWorkspace } from "@/types";

export interface PilotTruthMetrics {
  discoveryConversations: number;
  learnedFacts: number;
  uploadedDocuments: number;
  meetings: number;
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
  const meetings = workspace.meetings?.length ?? inventory.meetings;
  const uploadedDocuments =
    workspace.knowledge?.assets?.filter((a) => a.status === "processed")
      .length ?? inventory.documents;
  const discoveryConversations =
    workspace.conversationMemory || workspace.activeInterviewId ? 1 : 0;
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
  if (meetings > 0) {
    chips.push(
      meetings === 1 ? "1 reunión" : `${meetings} reuniones`,
    );
  }
  chips.push(
    `Comprensión del negocio: ${understandingPercent}%`,
  );

  return {
    discoveryConversations,
    learnedFacts,
    uploadedDocuments,
    meetings,
    understandingPercent,
    chips,
  };
}
