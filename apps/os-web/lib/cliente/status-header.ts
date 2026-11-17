/**
 * Cliente 360 status header above the tabs (V2 §17.1 / CONTINUATION §13).
 * Four fields: next step, owner, last attention, open issues.
 * Absent ≠ failed read. Never invent a zero or empty success from an error.
 */

import type { FetchOutcome } from '@/lib/commercial/fetch-outcome';
import { formatTimestamp } from '@/lib/commercial/labels';
import { clienteSectionHref } from '@/lib/commercial/navigation';
import { CLIENTE360_UX_COPY } from '@/lib/cliente/copy';
import { displayCliente360NextAction } from '@/lib/cliente/next-action-display';
import type { Cliente360Composition } from '@/lib/party/next-action';
import { OWNER_ABSENT_LABEL } from '@/lib/party/customer-self-service';

const CLOSED_ISSUE_STATUSES = new Set(['resolved', 'closed']);

/**
 * Stable attention read for Cliente 360. Only fields this header needs —
 * avoids coupling to mid-change conversation contract shapes (Batch 5B).
 */
export type AttentionSummary = {
  id: string;
  occurredAt: string;
  reason: string | null;
  summary: string;
};

export type Cliente360StatusFieldState = 'present' | 'absent' | 'unavailable';

export type Cliente360StatusField = {
  state: Cliente360StatusFieldState;
  label: string;
  text: string;
  href: string | null;
  /** Present only for next-step when a due line exists. */
  dueText?: string | null;
  overdue?: boolean;
  /** Present only for open issues when the count is known. */
  count?: number | null;
};

export type Cliente360StatusHeaderModel = {
  nextStep: Cliente360StatusField;
  owner: Cliente360StatusField;
  lastAttention: Cliente360StatusField;
  openIssues: Cliente360StatusField;
};

export type IssueCountSource = {
  status: string;
};

export function conversationDeepLink(conversationId: string): string {
  return `/conversaciones?c=${encodeURIComponent(conversationId)}`;
}

/** Newest attention first; stable ID tie-break. */
export function pickLatestAttention(
  items: readonly AttentionSummary[],
): AttentionSummary | null {
  if (items.length === 0) return null;
  return (
    [...items].sort((left, right) => {
      const byTime = Date.parse(right.occurredAt) - Date.parse(left.occurredAt);
      if (byTime !== 0) return byTime;
      return right.id.localeCompare(left.id);
    })[0] ?? null
  );
}

export function countOpenIssues(items: readonly IssueCountSource[]): number {
  return items.filter((item) => !CLOSED_ISSUE_STATUSES.has(item.status)).length;
}

/** Map a conversation list row to the stable attention summary. */
export function toAttentionSummary(row: {
  id: string;
  occurredAt: string;
  reason?: string | null;
  summary?: string | null;
}): AttentionSummary {
  return {
    id: row.id,
    occurredAt: row.occurredAt,
    reason: row.reason?.trim() || null,
    summary: row.summary?.trim() || '',
  };
}

function attentionStatement(row: AttentionSummary): string {
  const reason = row.reason?.trim();
  const summary = row.summary?.trim();
  const when = formatTimestamp(row.occurredAt);
  const body = reason || summary || 'Atención registrada';
  return when ? `${body} · ${when}` : body;
}

function composeNextStepField(
  composition: Cliente360Composition,
): Cliente360StatusField {
  const displayed = displayCliente360NextAction(composition.nextAction);
  if (displayed.isUnavailable) {
    return {
      state: 'unavailable',
      label: CLIENTE360_UX_COPY.nextActionHeading,
      text: displayed.text,
      href: null,
      dueText: null,
      overdue: false,
    };
  }
  if (!displayed.isRegisteredAction) {
    return {
      state: 'absent',
      label: CLIENTE360_UX_COPY.nextActionHeading,
      text: CLIENTE360_UX_COPY.noNextAction,
      href: null,
      dueText: null,
      overdue: false,
    };
  }
  return {
    state: 'present',
    label: CLIENTE360_UX_COPY.nextActionHeading,
    text: displayed.text,
    href: displayed.href,
    dueText: displayed.dueText,
    overdue: displayed.overdue,
  };
}

function composeOwnerField(composition: Cliente360Composition): Cliente360StatusField {
  if (!composition.owner.assigned) {
    const text =
      composition.owner.label?.trim() ||
      OWNER_ABSENT_LABEL ||
      CLIENTE360_UX_COPY.ownerAbsent;
    return {
      state: 'absent',
      label: CLIENTE360_UX_COPY.ownerHeading,
      text,
      href: null,
    };
  }
  return {
    state: 'present',
    label: CLIENTE360_UX_COPY.ownerHeading,
    text: composition.owner.label,
    href: null,
  };
}

function composeLastAttentionField(
  outcome: FetchOutcome<{ items: readonly AttentionSummary[] }>,
): Cliente360StatusField {
  const label = CLIENTE360_UX_COPY.lastAttentionHeading;
  if (outcome.status !== 'ok') {
    return {
      state: 'unavailable',
      label,
      text: CLIENTE360_UX_COPY.lastAttentionUnavailable,
      href: null,
    };
  }
  const latest = pickLatestAttention(outcome.data.items);
  if (!latest) {
    return {
      state: 'absent',
      label,
      text: CLIENTE360_UX_COPY.noLastAttention,
      href: null,
    };
  }
  return {
    state: 'present',
    label,
    text: attentionStatement(latest),
    href: conversationDeepLink(latest.id),
  };
}

function composeOpenIssuesField(
  partyId: string,
  outcome: FetchOutcome<{ items: readonly IssueCountSource[] }>,
): Cliente360StatusField {
  const label = CLIENTE360_UX_COPY.openIssuesHeading;
  const trabajoHref = clienteSectionHref(partyId, 'trabajo');
  if (outcome.status !== 'ok') {
    return {
      state: 'unavailable',
      label,
      text: CLIENTE360_UX_COPY.openIssuesUnavailable,
      href: null,
      count: null,
    };
  }
  const count = countOpenIssues(outcome.data.items);
  if (count === 0) {
    return {
      state: 'absent',
      label,
      text: CLIENTE360_UX_COPY.noOpenIssues,
      href: trabajoHref,
      count: 0,
    };
  }
  return {
    state: 'present',
    label,
    text: count === 1 ? '1 problema abierto' : `${count} problemas abiertos`,
    href: trabajoHref,
    count,
  };
}

export function buildCliente360StatusHeader(input: {
  partyId: string;
  composition: Cliente360Composition;
  attention: FetchOutcome<{ items: readonly AttentionSummary[] }>;
  issues: FetchOutcome<{ items: readonly IssueCountSource[] }>;
}): Cliente360StatusHeaderModel {
  return {
    nextStep: composeNextStepField(input.composition),
    owner: composeOwnerField(input.composition),
    lastAttention: composeLastAttentionField(input.attention),
    openIssues: composeOpenIssuesField(input.partyId, input.issues),
  };
}
