/** data-tour values. Place on an existing element, or leave absent so the runner skips. */
export const TOUR_TARGET = {
  homeAttention: 'home-attention',
  globalSearch: 'global-search',
  navPrimary: 'nav-primary',
  customerRow: 'customer-row',
  customerQuickView: 'customer-quick-view',
  locationState: 'location-state',
  customer360: 'customer-360',
  opportunityList: 'opportunity-list',
  quoteList: 'quote-list',
  quoteStatus: 'quote-status',
  quotePdf: 'quote-pdf',
  orderList: 'order-list',
  approvalConsequence: 'approval-consequence',
  workList: 'work-list',
  team: 'team',
  inviteEmployee: 'invite-employee',
  help: 'help',
  learningMode: 'learning-mode',
  mapCoverage: 'map-coverage',
  manualDraft: 'manual-draft',
  messagesFuture: 'messages-future',
} as const;

export type TourTargetId = (typeof TOUR_TARGET)[keyof typeof TOUR_TARGET];

export const TOUR_TARGET_IDS: readonly TourTargetId[] = Object.values(TOUR_TARGET);

const TARGET_ID = /^[a-z0-9-]+$/;

export function isTourTargetId(value: string): boolean {
  return TARGET_ID.test(value);
}
