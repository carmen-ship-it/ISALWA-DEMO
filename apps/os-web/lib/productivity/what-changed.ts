import type { PartyTimelineEntryReadModel, PartyTimelineFacts } from '@isalwa/os-contracts';
import { formatTimestamp } from '@/lib/commercial/labels';
import { opportunityHref, orderHref, quoteHref } from '@/lib/commercial/navigation';
import { timelineEntrySummary, timelineEventLabel } from '@/lib/commercial/timeline-labels';
import { partyHref } from '@/lib/party/navigation';
import { approvalHref, workItemHref } from '@/lib/work/navigation';

const CHANGE_EVENTS = new Set([
  'quote.submitted',
  'quote.send_recorded',
  'quote.cancelled',
  'quote.updated',
  'opportunity.stage_changed',
  'opportunity.closed',
  'opportunity.owner_assigned',
  'order.created',
  'order.cancelled',
  'work.completed',
  'work.cancelled',
  'task.reassigned',
  'approval.approved',
  'approval.rejected',
  'commercial_account.owner_reassigned',
]);

export type WhatChangedItem = {
  id: string;
  eventType: string;
  label: string;
  detail: string;
  occurredAt: string;
  when: string | null;
  href: string;
};

function safeId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const id = value.trim();
  if (!id || id === '.' || id === '..' || /[/?#\\]/.test(id)) return null;
  return id;
}

function hrefForEntry(entry: PartyTimelineEntryReadModel): string {
  const partyId = safeId(entry.partyId);
  const facts: PartyTimelineFacts = entry.facts;
  const quoteId = safeId(facts.quoteId);
  const orderId = safeId(facts.orderId);
  const opportunityId = safeId(facts.opportunityId);
  const workItemId = safeId(facts.workItemId);
  const approvalRequestId = safeId(facts.approvalRequestId);
  if (partyId && quoteId && entry.eventType.startsWith('quote.')) return quoteHref(partyId, quoteId);
  if (partyId && orderId && entry.eventType.startsWith('order.')) return orderHref(partyId, orderId);
  if (partyId && opportunityId && entry.eventType.startsWith('opportunity.')) {
    return opportunityHref(partyId, opportunityId);
  }
  if (workItemId && (entry.eventType.startsWith('work.') || entry.eventType === 'task.reassigned')) {
    return workItemHref(workItemId);
  }
  if (approvalRequestId && entry.eventType.startsWith('approval.')) return approvalHref(approvalRequestId);
  return partyId ? partyHref(partyId) : '/clientes';
}

export function whatChangedFromTimeline(
  entries: readonly PartyTimelineEntryReadModel[],
  limit = 8,
): WhatChangedItem[] {
  return [...entries]
    .filter((entry) => CHANGE_EVENTS.has(entry.eventType))
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, limit)
    .map((entry) => ({
      id: entry.entryId,
      eventType: entry.eventType,
      label: timelineEventLabel(entry.eventType, entry.facts),
      detail: timelineEntrySummary(entry),
      occurredAt: entry.occurredAt,
      when: formatTimestamp(entry.occurredAt),
      href: hrefForEntry(entry),
    }));
}
