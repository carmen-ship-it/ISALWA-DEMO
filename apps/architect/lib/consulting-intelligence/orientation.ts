/**
 * Five-second consultant Orientation Panel — pure composition for Client Mode.
 *
 * Motivation before payoff: if Álvaro immediately sees what Architect
 * understands, what it still wants to learn, and one next action, he
 * naturally chooses to teach with a document. No new scoring.
 */

import type { CompanyWorkspace } from "@/types";
import type { MissingInformationReport } from "@/lib/readiness";
import type { NextStepVoice } from "./next-step-voice";

export interface OrientationPanelReport {
  factsLearned: number;
  meetingsAnalyzed: number;
  understandingPercent: number;
  /** Conversational label for the % — not "Business Understanding". */
  understandingLabel: string;
  learningGaps: string[];
  nextActionLabel: string;
  nextActionKind: NextStepVoice["actionKind"];
  nextActionMinutesHint: string | null;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
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
  const factsLearned = workspace.conversationMemory?.knownFacts?.length ?? 0;
  const meetingsAnalyzed = workspace.meetings?.length ?? 0;
  const understandingPercent = clampPercent(workspace.businessUnderstanding);

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
    nextStepVoice.actionKind === "upload_document" || meetingsAnalyzed > 0;

  return {
    factsLearned,
    meetingsAnalyzed,
    understandingPercent,
    understandingLabel: "Qué tanto entiende Architect tu empresa",
    learningGaps,
    nextActionLabel: prefersTeach
      ? "Enséñale a Architect un documento de tu empresa"
      : nextStepVoice.actionLabel,
    nextActionKind: prefersTeach ? "upload_document" : nextStepVoice.actionKind,
    nextActionMinutesHint: prefersTeach ? "Aproximadamente 2 minutos" : null,
  };
}
