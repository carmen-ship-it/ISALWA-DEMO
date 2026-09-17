/**
 * Ask ISALWA answer format helpers.
 * Sections are fixed; empty sections omit, never invent facts.
 */

import type { CertaintyState } from './model';
import { CERTAINTY_LABEL } from './model';
import { WHO_TO_ASK_COPY, type WhoToAskView } from './who-to-ask';

export const ASK_ISALWA_SECTION = {
  confirmed: 'LO CONFIRMADO',
  pending: 'PENDIENTE DE CONFIRMAR',
  notRecorded: 'NO REGISTRADO',
  recommendation: 'RECOMENDACIÓN',
  whoToAsk: 'A QUIÉN PREGUNTAR',
  sources: 'FUENTES',
} as const;

export type AskIsalwaSourceLink = {
  label: string;
  href: string;
};

export type AskIsalwaAnswerInput = {
  confirmed: readonly string[];
  pending: readonly string[];
  notRecorded: readonly string[];
  recommendation: string | null;
  whoToAsk: WhoToAskView | null;
  sources: readonly AskIsalwaSourceLink[];
};

export type AskIsalwaSectionView = {
  id: keyof typeof ASK_ISALWA_SECTION;
  title: string;
  certainty?: CertaintyState;
  bullets: readonly string[];
  links?: readonly AskIsalwaSourceLink[];
  whoToAsk?: WhoToAskView;
};

function nonEmpty(lines: readonly string[]): string[] {
  return lines.map((line) => line.trim()).filter(Boolean);
}

export function buildAskIsalwaAnswer(input: AskIsalwaAnswerInput): AskIsalwaSectionView[] {
  const sections: AskIsalwaSectionView[] = [];

  const confirmed = nonEmpty(input.confirmed);
  if (confirmed.length > 0) {
    sections.push({
      id: 'confirmed',
      title: ASK_ISALWA_SECTION.confirmed,
      certainty: 'confirmed',
      bullets: confirmed,
    });
  }

  const pending = nonEmpty(input.pending);
  if (pending.length > 0) {
    sections.push({
      id: 'pending',
      title: ASK_ISALWA_SECTION.pending,
      certainty: 'pending',
      bullets: pending,
    });
  }

  const notRecorded = nonEmpty(input.notRecorded);
  if (notRecorded.length > 0) {
    sections.push({
      id: 'notRecorded',
      title: ASK_ISALWA_SECTION.notRecorded,
      certainty: 'not_recorded',
      bullets: notRecorded,
    });
  }

  const recommendation = input.recommendation?.trim() || null;
  if (recommendation) {
    sections.push({
      id: 'recommendation',
      title: ASK_ISALWA_SECTION.recommendation,
      bullets: [recommendation],
    });
  }

  if (input.whoToAsk) {
    const bullets =
      input.whoToAsk.kind === 'assigned'
        ? [
            `${WHO_TO_ASK_COPY.kicker}: ${input.whoToAsk.name}`,
            ...(input.whoToAsk.teamLabel ? [input.whoToAsk.teamLabel] : []),
          ]
        : [input.whoToAsk.message];
    sections.push({
      id: 'whoToAsk',
      title: ASK_ISALWA_SECTION.whoToAsk,
      bullets,
      whoToAsk: input.whoToAsk,
    });
  }

  const sources = input.sources.filter((s) => s.label.trim() && s.href.trim());
  if (sources.length > 0) {
    sections.push({
      id: 'sources',
      title: ASK_ISALWA_SECTION.sources,
      bullets: sources.map((s) => s.label.trim()),
      links: sources,
    });
  }

  return sections;
}

export function askSectionTitleForCertainty(state: CertaintyState): string {
  if (state === 'confirmed') return ASK_ISALWA_SECTION.confirmed;
  if (state === 'pending') return ASK_ISALWA_SECTION.pending;
  return ASK_ISALWA_SECTION.notRecorded;
}

export function askCertaintyLabel(state: CertaintyState): string {
  return CERTAINTY_LABEL[state];
}
