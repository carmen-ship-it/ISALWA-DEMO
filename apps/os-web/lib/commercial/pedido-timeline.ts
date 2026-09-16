import type { PartyTimelineEntryReadModel, PartyTimelineFacts } from '@isalwa/os-contracts';
import { opportunityHref, orderHref, quoteHref } from '@/lib/commercial/navigation';
import {
  sortTimelineChronologicalDesc,
  timelineEntrySummary,
  timelineEventLabel,
} from '@/lib/commercial/timeline-labels';
import { issueHref } from '@/lib/issue/navigation';
import { partyHref } from '@/lib/party/navigation';
import { approvalHref, workItemHref } from '@/lib/work/navigation';

/** Durable post-sale / pedido-linked event types projected on Pedido Historial. */
export const PEDIDO_TIMELINE_EVENT_TYPES = new Set([
  'order.created',
  'order.cancelled',
  'finished_goods.received',
  'finished_goods.corrected',
  'delivery_note.created',
  'delivery_note.corrected',
  'warehouse_exit.recorded',
  'customer_delivery.recorded',
  'work.created',
  'task.reassigned',
  'work.completed',
  'work.cancelled',
  'approval.requested',
  'approval.approved',
  'approval.rejected',
]);

export type PedidoTimelineSourceEvent = {
  id: string;
  eventType: string;
  occurredAt: string;
  payload?: Record<string, unknown>;
  actorMemberId?: string | null;
};

export type PedidoLinkedIssue = {
  issueId: string;
  title: string | null;
  description: string;
  createdAt: string;
  references: Array<{ referenceType: string; referenceId: string }>;
};

export type PedidoTimelineItem = {
  id: string;
  eventType: string;
  occurredAt: string;
  label: string;
  detail: string;
  href: string | null;
};

function safeId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const id = value.trim();
  if (!id || id === '.' || id === '..' || /[/?#\\]/.test(id)) return null;
  return id;
}

function factsOrderId(facts: PartyTimelineFacts | Record<string, unknown>): string | null {
  return safeId(facts.orderId);
}

/** True when the durable entry is explicitly linked to this pedido. */
export function timelineEntryLinksToOrder(
  entry: PartyTimelineEntryReadModel,
  orderId: string,
): boolean {
  if (factsOrderId(entry.facts) === orderId) return true;
  if (entry.primaryEntityType === 'order' && entry.primaryEntityId === orderId) return true;
  const subjectType = typeof entry.facts.subjectType === 'string' ? entry.facts.subjectType : null;
  const subjectId = safeId(entry.facts.subjectId);
  if (subjectType === 'order' && subjectId === orderId) return true;
  return false;
}

export function timelineEntryHref(
  entry: Pick<
    PartyTimelineEntryReadModel,
    'partyId' | 'eventType' | 'facts' | 'primaryEntityType' | 'primaryEntityId'
  >,
): string | null {
  const partyId = safeId(entry.partyId);
  const facts = entry.facts;
  const quoteId = safeId(facts.quoteId);
  const orderId = factsOrderId(facts);
  const opportunityId = safeId(facts.opportunityId);
  const workItemId = safeId(facts.workItemId) ?? (
    entry.primaryEntityType === 'work_item' ? safeId(entry.primaryEntityId) : null
  );
  const approvalRequestId = safeId(facts.approvalRequestId);
  const deliveryNoteId = safeId(facts.deliveryNoteId);

  if (partyId && quoteId && entry.eventType.startsWith('quote.')) {
    return quoteHref(partyId, quoteId);
  }
  if (partyId && orderId && (
    entry.eventType.startsWith('order.') ||
    entry.eventType.startsWith('finished_goods.') ||
    entry.eventType.startsWith('delivery_note.') ||
    entry.eventType === 'warehouse_exit.recorded' ||
    entry.eventType === 'customer_delivery.recorded'
  )) {
    return orderHref(partyId, orderId);
  }
  if (partyId && deliveryNoteId && entry.eventType.startsWith('delivery_note.')) {
    return orderId ? orderHref(partyId, orderId) : partyHref(partyId);
  }
  if (partyId && opportunityId && entry.eventType.startsWith('opportunity.')) {
    return opportunityHref(partyId, opportunityId);
  }
  if (workItemId && (entry.eventType.startsWith('work.') || entry.eventType === 'task.reassigned')) {
    return workItemHref(workItemId);
  }
  if (approvalRequestId && entry.eventType.startsWith('approval.')) {
    return approvalHref(approvalRequestId);
  }
  return partyId ? partyHref(partyId) : null;
}

function payloadToFacts(
  eventType: string,
  payload: Record<string, unknown> | undefined,
): PartyTimelineFacts {
  if (!payload) return {};
  const facts: PartyTimelineFacts = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      facts[key] = value;
    }
  }
  // Ensure event-specific ids remain available for deep links even if allowlist omitted them.
  if (eventType.startsWith('delivery_note.') && typeof payload.deliveryNoteId === 'string') {
    facts.deliveryNoteId = payload.deliveryNoteId;
  }
  return facts;
}

function mapEntry(
  entry: PartyTimelineEntryReadModel,
): PedidoTimelineItem | null {
  if (!PEDIDO_TIMELINE_EVENT_TYPES.has(entry.eventType)) return null;
  const label = timelineEventLabel(entry.eventType, entry.facts);
  // Never surface raw event type strings to employees.
  if (label === entry.eventType) return null;
  return {
    id: entry.entryId,
    eventType: entry.eventType,
    occurredAt: entry.occurredAt,
    label,
    detail: timelineEntrySummary(entry),
    href: timelineEntryHref(entry),
  };
}

function mapDeliveryEvent(
  partyId: string,
  orderId: string,
  event: PedidoTimelineSourceEvent,
): PedidoTimelineItem | null {
  if (!PEDIDO_TIMELINE_EVENT_TYPES.has(event.eventType)) return null;
  const facts = payloadToFacts(event.eventType, {
    partyId,
    orderId,
    ...(event.payload ?? {}),
  });
  const synthetic: PartyTimelineEntryReadModel = {
    entryId: event.id,
    organizationId: '',
    partyId,
    eventType: event.eventType,
    occurredAt: event.occurredAt,
    actorMemberId: event.actorMemberId ?? null,
    correlationId: event.id,
    primaryEntityType: event.eventType.split('.')[0] ?? 'delivery',
    primaryEntityId: typeof event.payload?.deliveryNoteId === 'string'
      ? event.payload.deliveryNoteId
      : typeof event.payload?.warehouseExitId === 'string'
        ? event.payload.warehouseExitId
        : typeof event.payload?.deliveryId === 'string'
          ? event.payload.deliveryId
          : event.id,
    facts,
  };
  return mapEntry(synthetic);
}

function mapLinkedIssue(
  partyId: string,
  orderId: string,
  issue: PedidoLinkedIssue,
): PedidoTimelineItem | null {
  const linked = issue.references.some(
    (ref) => ref.referenceType === 'order' && ref.referenceId === orderId,
  );
  if (!linked) return null;
  const title = (issue.title ?? '').trim() || issue.description.trim() || 'Incidencia';
  return {
    id: `issue:${issue.issueId}`,
    eventType: 'issue.linked',
    occurredAt: issue.createdAt,
    label: 'Incidencia vinculada',
    detail: title,
    href: issueHref(issue.issueId) || orderHref(partyId, orderId),
  };
}

/**
 * Projects Pedido Historial from durable sources only.
 * Does not invent order.created from row timestamps; does not emit unknown raw event names.
 */
export function projectPedidoTimeline(input: {
  partyId: string;
  orderId: string;
  partyTimelineEntries?: readonly PartyTimelineEntryReadModel[];
  deliveryEvents?: readonly PedidoTimelineSourceEvent[];
  linkedIssues?: readonly PedidoLinkedIssue[];
}): PedidoTimelineItem[] {
  const { partyId, orderId } = input;
  const byId = new Map<string, PedidoTimelineItem>();

  for (const entry of input.partyTimelineEntries ?? []) {
    if (!timelineEntryLinksToOrder(entry, orderId)) continue;
    const mapped = mapEntry(entry);
    if (mapped) byId.set(mapped.id, mapped);
  }

  for (const event of input.deliveryEvents ?? []) {
    const payloadOrderId = safeId(event.payload?.orderId) ?? orderId;
    if (payloadOrderId !== orderId) continue;
    const mapped = mapDeliveryEvent(partyId, orderId, event);
    if (mapped) byId.set(mapped.id, mapped);
  }

  for (const issue of input.linkedIssues ?? []) {
    const mapped = mapLinkedIssue(partyId, orderId, issue);
    if (mapped) byId.set(mapped.id, mapped);
  }

  return sortTimelineChronologicalDesc([...byId.values()]);
}
