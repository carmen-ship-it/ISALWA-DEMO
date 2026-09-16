import type { TerminationImpactReadModel } from '@isalwa/os-contracts';
import type { OsWorkforceStore } from './os-workforce-store';

export type TerminationImpactLookup = Pick<
  OsWorkforceStore,
  | 'listOpenWorkItemsForMember'
  | 'listActiveCommercialAccountsForOwner'
  | 'listOpenOpportunitiesForOwner'
  | 'listBlockingQuotesForOwner'
  | 'listActiveOrdersForOwner'
  | 'listPendingApprovalsForApprover'
  | 'listActiveDirectReportAssignments'
  | 'listActiveDelegationsInvolvingMember'
>;

/**
 * Stable category codes for termination preflight (not business-event keys).
 * Spanish labels are returned separately for UI.
 */
export const TERMINATION_IMPACT_CATEGORY_KEYS = [
  'open_work',
  'commercial_accounts',
  'open_opportunities',
  'active_quotes',
  'active_orders',
  'pending_approvals',
  'direct_reports',
  'active_delegations',
] as const;

export type TerminationImpactCategoryKey = (typeof TERMINATION_IMPACT_CATEGORY_KEYS)[number];

export type TerminationImpactItem = {
  id: string;
  summary: string;
};

export type TerminationImpactCategory = {
  key: TerminationImpactCategoryKey;
  /** Spanish operator-facing label (safe for UI; not an event type). */
  label: string;
  count: number;
  items: TerminationImpactItem[];
  /** Documented product gaps that block safe continuity without inventing commands. */
  foundationGaps?: string[];
};

export type TerminationImpact = TerminationImpactReadModel;

const CATEGORY_LABELS: Record<TerminationImpactCategoryKey, string> = {
  open_work: 'Trabajos abiertos',
  commercial_accounts: 'Cuentas comerciales',
  open_opportunities: 'Oportunidades abiertas',
  active_quotes: 'Cotizaciones activas',
  active_orders: 'Pedidos activos',
  pending_approvals: 'Aprobaciones pendientes',
  direct_reports: 'Reportes directos',
  active_delegations: 'Delegaciones activas',
};

/** Quote statuses that release ownership for terminate (product has no "closed" quote status). */
export function isQuoteOwnershipReleased(status: string): boolean {
  return status === 'cancelled';
}

function category(
  key: TerminationImpactCategoryKey,
  items: TerminationImpactItem[],
  foundationGaps?: string[],
): TerminationImpactCategory {
  return {
    key,
    label: CATEGORY_LABELS[key],
    count: items.length,
    items,
    ...(foundationGaps && foundationGaps.length > 0 ? { foundationGaps } : {}),
  };
}

/**
 * Collects all ownership / continuity blockers for TerminateMember.
 * Any category with count > 0 blocks terminate (fail-closed).
 */
export async function collectTerminationImpact(
  store: TerminationImpactLookup,
  organizationId: string,
  memberId: string,
  asOf: Date,
): Promise<TerminationImpact> {
  const [
    openWork,
    accounts,
    opportunities,
    quotes,
    orders,
    approvals,
    directReports,
    delegations,
  ] = await Promise.all([
    store.listOpenWorkItemsForMember(organizationId, memberId),
    store.listActiveCommercialAccountsForOwner(organizationId, memberId),
    store.listOpenOpportunitiesForOwner(organizationId, memberId),
    store.listBlockingQuotesForOwner(organizationId, memberId),
    store.listActiveOrdersForOwner(organizationId, memberId),
    store.listPendingApprovalsForApprover(organizationId, memberId),
    store.listActiveDirectReportAssignments(organizationId, memberId, asOf),
    store.listActiveDelegationsInvolvingMember(organizationId, memberId, asOf),
  ]);

  const categories: TerminationImpactCategory[] = [
    category(
      'open_work',
      openWork.map((w) => ({ id: w.id, summary: w.title })),
    ),
    category(
      'commercial_accounts',
      accounts.map((a) => ({ id: a.id, summary: `Cuenta ${a.partyId}` })),
    ),
    category(
      'open_opportunities',
      opportunities.map((o) => ({ id: o.id, summary: o.title })),
    ),
    category(
      'active_quotes',
      quotes.map((q) => ({ id: q.id, summary: q.quoteNumber })),
      quotes.length > 0
        ? [
            'FOUNDATION_GAP: No AssignQuoteOwner command — terminate blocks on owned non-cancelled quotes; reassignment UI/command not productized.',
          ]
        : undefined,
    ),
    category(
      'active_orders',
      orders.map((o) => ({ id: o.id, summary: o.orderNumber })),
    ),
    category(
      'pending_approvals',
      approvals.map((a) => ({
        id: a.id,
        summary: `${a.subjectType} ${a.subjectId}`,
      })),
    ),
    category(
      'direct_reports',
      directReports.map((m) => ({ id: m.id, summary: `Miembro ${m.memberId}` })),
    ),
    category(
      'active_delegations',
      delegations.map((d) => {
        const role =
          d.delegatorMemberId === memberId
            ? `otorgada a ${d.delegateMemberId}`
            : `recibida de ${d.delegatorMemberId}`;
        return { id: d.id, summary: `Delegación ${role}` };
      }),
    ),
  ];

  const totalBlockingCount = categories.reduce((sum, c) => sum + c.count, 0);

  return {
    memberId,
    organizationId,
    canTerminate: totalBlockingCount === 0,
    totalBlockingCount,
    categories,
  };
}
