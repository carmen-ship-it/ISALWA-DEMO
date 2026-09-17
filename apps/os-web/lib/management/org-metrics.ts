import type {
  OpportunitySummaryReadModel,
  OrderSummaryReadModel,
  QuoteSummaryReadModel,
  WorkSummaryReadModel,
} from '@isalwa/os-contracts';
import type { ApprovalSummaryReadModel } from '@isalwa/os-contracts';
import type { IssueListItem } from '@/lib/issue/types';
import {
  countConvertedQuotesInPeriod,
  countIssuedQuotesInPeriod,
  quoteToOrderRateDetail,
  quoteToOrderRateDisplay,
} from '@/lib/management/quote-to-order-rate';

export type ManagementPeriodPreset = '7' | '30' | '90' | 'custom';

export type ManagementPeriod = {
  preset: ManagementPeriodPreset;
  from: Date;
  to: Date;
};

export type OrgMetricCard = {
  id: string;
  label: string;
  count: number | null;
  secondary: string | null;
  href: string | null;
  tooltip?: string;
};

export function resolveManagementPeriod(
  preset: ManagementPeriodPreset,
  customFrom?: Date,
  customTo?: Date,
  asOf: Date = new Date(),
): ManagementPeriod {
  if (preset === 'custom' && customFrom && customTo) {
    return { preset, from: customFrom, to: customTo };
  }
  const days = preset === '7' ? 7 : preset === '90' ? 90 : 30;
  const from = new Date(asOf);
  from.setDate(from.getDate() - days);
  from.setHours(0, 0, 0, 0);
  const to = new Date(asOf);
  to.setHours(23, 59, 59, 999);
  return { preset: preset === 'custom' ? '30' : preset, from, to };
}

function inPeriod(iso: string | null, period: ManagementPeriod): boolean {
  if (!iso) return false;
  const at = new Date(iso).getTime();
  return at >= period.from.getTime() && at <= period.to.getTime();
}

function formatCentavosLabel(centavos: string): string {
  const value = Number(centavos);
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(value / 100);
}

export function composeOrgMetricCards(input: {
  period: ManagementPeriod;
  opportunities: readonly OpportunitySummaryReadModel[];
  quotes: readonly QuoteSummaryReadModel[];
  orders: readonly OrderSummaryReadModel[];
  overdueFollowUps: readonly WorkSummaryReadModel[];
  openIssues: readonly IssueListItem[];
  pendingApprovals: readonly ApprovalSummaryReadModel[];
}): OrgMetricCard[] {
  const { period } = input;
  const openOpportunities = input.opportunities.filter((row) => row.status === 'open');
  const issuedQuotes = input.quotes.filter(
    (row) => row.submittedAt && inPeriod(row.submittedAt, period) && !row.cancelledAt,
  );
  const orderQuoteIds = new Set(input.orders.map((row) => row.quoteId));
  const convertedCount = countConvertedQuotesInPeriod(input.quotes, orderQuoteIds, period.from, period.to);
  const issuedCount = countIssuedQuotesInPeriod(input.quotes, period.from, period.to);
  const ordersInPeriod = input.orders.filter((row) => inPeriod(row.createdAt, period));
  const deliveredOrders = ordersInPeriod.filter((row) => row.status === 'delivered');

  const quotedValue = issuedQuotes.reduce((sum, row) => sum + Number(row.totalCentavos), 0);
  const orderValue = ordersInPeriod.reduce((sum, row) => sum + Number(row.totalCentavos), 0);

  const rate = quoteToOrderRateDisplay(convertedCount, issuedCount);
  const rateDetail = quoteToOrderRateDetail(convertedCount, issuedCount);

  return [
    {
      id: 'open-opportunities',
      label: 'Oportunidades abiertas',
      count: openOpportunities.length,
      secondary: null,
      href: '/oportunidades',
    },
    {
      id: 'issued-quotes',
      label: 'Cotizaciones emitidas',
      count: issuedCount,
      secondary: issuedCount > 0 ? formatCentavosLabel(String(quotedValue)) : null,
      href: '/cotizaciones?status=submitted',
    },
    {
      id: 'converted-quotes',
      label: 'Cotizaciones convertidas a pedido',
      count: convertedCount,
      secondary: null,
      href: '/pedidos',
    },
    {
      id: 'quote-to-order-rate',
      label: 'Tasa cotización → pedido',
      count: null,
      secondary: rate,
      href: '/cotizaciones?status=submitted',
      tooltip: rateDetail ?? 'Porcentaje de cotizaciones del período que terminaron convertidas en pedido.',
    },
    {
      id: 'orders',
      label: 'Pedidos',
      count: ordersInPeriod.length,
      secondary: ordersInPeriod.length > 0 ? formatCentavosLabel(String(orderValue)) : null,
      href: '/pedidos',
    },
    {
      id: 'delivered-orders',
      label: 'Pedidos entregados',
      count: deliveredOrders.length,
      secondary: null,
      href: '/pedidos',
    },
    {
      id: 'overdue-follow-ups',
      label: 'Seguimientos vencidos',
      count: input.overdueFollowUps.length,
      secondary: null,
      href: '/trabajo?view=overdue',
    },
    {
      id: 'open-issues',
      label: 'Incidencias abiertas',
      count: input.openIssues.filter((row) => row.status !== 'resolved' && row.status !== 'closed')
        .length,
      secondary: null,
      href: '/incidencias',
    },
    {
      id: 'pending-approvals',
      label: 'Aprobaciones pendientes',
      count: input.pendingApprovals.filter((row) => row.status === 'pending').length,
      secondary: null,
      href: '/aprobaciones',
    },
  ];
}
