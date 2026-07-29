/**
 * Mission 31 — Orientation uses PilotTruthMetrics (single source of truth).
 */

import type { CompanyWorkspace } from "@/types";
import type { MissingInformationReport } from "@/lib/readiness";
import { buildPilotTruthMetrics } from "./pilot-truth-metrics";
import type { NextStepVoice } from "./next-step-voice";

export interface OrientationPanelReport {
  factsLearned: number;
  /** Real human discovery sessions only — never internal transcript ingestion. */
  discoverySessions: number;
  documentsUploaded: number;
  discoveryConversations: number;
  understandingPercent: number;
  /** Conversational label for the % — not "Business Understanding". */
  understandingLabel: string;
  learningGaps: string[];
  nextActionLabel: string;
  nextActionKind: NextStepVoice["actionKind"];
  nextActionMinutesHint: string | null;
}

/**
 * Prefer concrete missing-info headlines; fall back to discovery stillNeed labels.
 */
export function buildOrientationPanel(input: {
  workspace: CompanyWorkspace;
  missingInformation: MissingInformationReport;
  nextStepVoice: NextStepVoice;
}): OrientationPanelReport {
  const { workspace, missingInformation, nextStepVoice } = input;
  const truth = buildPilotTruthMetrics(workspace);

  const learningGaps = missingInformation.opportunities
    .slice(0, 4)
    .map((opportunity) => opportunity.headline || opportunity.topicLabel)
    .filter(Boolean);

  const stillNeed = workspace.conversationMemory?.score?.stillNeed ?? [];
  if (learningGaps.length === 0 && stillNeed.length > 0) {
    for (const label of stillNeed.slice(0, 4)) {
      learningGaps.push(label);
    }
  }

  const prefersTeach =
    nextStepVoice.actionKind === "upload_document" ||
    truth.discoverySessions > 0 ||
    truth.uploadedDocuments > 0;

  return {
    factsLearned: truth.learnedFacts,
    discoverySessions: truth.discoverySessions,
    documentsUploaded: truth.uploadedDocuments,
    discoveryConversations: truth.discoveryConversations,
    understandingPercent: truth.understandingPercent,
    understandingLabel: "Qué tanto entiende Architect tu empresa",
    learningGaps,
    nextActionLabel: prefersTeach
      ? "Enseñar a Architect"
      : nextStepVoice.actionLabel,
    nextActionKind: prefersTeach ? "upload_document" : nextStepVoice.actionKind,
    nextActionMinutesHint: prefersTeach ? "Aproximadamente 2 minutos" : null,
  };
}
