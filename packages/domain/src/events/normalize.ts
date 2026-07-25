import { isCommercialEventType } from './catalog';
import type { CommercialEventType } from './types';

/**
 * Legacy emitters used underscore or aggregate names.
 * Normalize at the boundary — never leave dual vocabularies in new writes.
 */
const LEGACY_TYPE_MAP: Record<string, CommercialEventType> = {
  quote_created: 'quote.created',
  quote_sent: 'quote.sent',
  quote_accepted: 'quote.accepted',
  quote_revised: 'quote.revised',
  payment_recorded: 'payment.allocated',
  payment_allocated: 'payment.allocated',
  visit_completed: 'visit.completed',
  visit_scheduled: 'visit.scheduled',
  invoice_issued: 'invoice.issued',
  order_confirmed: 'order.confirmed',
  promise_made: 'promise.made',
  promise_broken: 'promise.broken',
  whatsapp_received: 'whatsapp.received',
  whatsapp_sent: 'whatsapp.sent',
  whatsapp_thread: 'whatsapp.received', // aggregate → treat as inbound signal for reads
  'whatsapp.thread': 'whatsapp.received',
  note_created: 'note.created',
  task_completed: 'task.completed',
  credit_approved: 'credit.approved',
  territory_reassigned: 'territory.reassigned',
  account_created: 'account.created',
};

/**
 * Returns canonical dotted type, or null if unknown.
 */
export function normalizeEventType(raw: string): CommercialEventType | null {
  if (isCommercialEventType(raw)) return raw;
  const mapped = LEGACY_TYPE_MAP[raw];
  if (mapped) return mapped;
  // Soft: dotted but not in catalog yet
  if (raw.includes('.')) return null;
  const dotted = raw.replace(/_/g, '.');
  if (isCommercialEventType(dotted)) return dotted;
  return null;
}

/** Prefix used by dossier icon coloring — stable across legacy + canonical. */
export function eventFamily(type: string): string {
  const canonical = normalizeEventType(type) ?? type;
  return canonical.split('.')[0] ?? canonical;
}
