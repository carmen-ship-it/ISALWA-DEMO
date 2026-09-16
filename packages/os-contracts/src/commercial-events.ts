/** Commercial BusinessEvent types (Lane G). */
export const OS_COMMERCIAL_EVENT_TYPES = [
  'opportunity.created',
  'opportunity.updated',
  'opportunity.stage_changed',
  'opportunity.closed',
  'opportunity.owner_assigned',
  'quote.created',
  'quote.updated',
  'quote.line_added',
  'quote.line_updated',
  'quote.line_removed',
  'quote.submitted',
  'quote.send_recorded',
  'quote.cancelled',
  'order.created',
  'order.cancelled',
  'commercial_account.owner_reassigned',
] as const;

export type OsCommercialEventType = (typeof OS_COMMERCIAL_EVENT_TYPES)[number];

export function isOsCommercialEventType(value: string): value is OsCommercialEventType {
  return (OS_COMMERCIAL_EVENT_TYPES as readonly string[]).includes(value);
}

export const OPPORTUNITY_STATUSES = ['open', 'won', 'lost', 'cancelled'] as const;
export type OpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number];

export const QUOTE_STATUSES = ['draft', 'submitted', 'accepted', 'cancelled'] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const ORDER_STATUSES = ['open', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const COMMERCIAL_CURRENCIES = ['BOB'] as const;
export type CommercialCurrency = (typeof COMMERCIAL_CURRENCIES)[number];
