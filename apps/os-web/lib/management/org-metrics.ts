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

export type OrgMetricTrend = {
  /** Signed delta vs prior equal-length window; null when unsafe */
  delta: number | null;
  label: string | null;
};

export type OrgMetricCard = {
  id: string;
  label: string;
  /** Primary large number (count or formatted rate/money) */
  value: string;
  count: number | null;
  secondary: string | null;
  href: string | null;
  tooltip?: string;
  periodLabel: string;
  trend: OrgMetricTrend | null;
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

export function formatManagementPeriodLabel(period: ManagementPeriod): string {
  if (period.preset === '7') return 'Últimos 7 días';
  if (period.preset === '90') return 'Últimos 90 días';
  if (period.preset === 'custom') return 'Período personalizado';
  return 'Últimos 30 días';
}

function inPeriod(iso: string | null, period: ManagementPeriod): boolean {
  if (!iso) return false;
  const at = new Date(iso).getTime();
  return at >= period.from.getTime() && at <= period.to.getTime();
}

function priorEqualWindow(period: ManagementPeriod): ManagementPeriod | null {
  if (period.preset === 'custom') return null;
  const ms = period.to.getTime() - period.from.getTime();
  if (ms <= 0) return null;
  const to = new Date(period.from.getTime() - 1);
  const from = new Date(to.getTime() - ms);
  return { preset: period.preset, from, to };
}

function formatCentavosLabel(centavos: number): string {
  if (!Number.isFinite(centavos)) return '—';
  return new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(centavos / 100);
}

function safeCountTrend(current: number, prior: number | null): OrgMetricTrend | null {
  if (prior == null) return null;
  const delta = current - prior;
  if (delta === 0) return { delta: 0, label: 'Sin cambio vs período anterior' };
  const sign = delta > 0 ? '+' : '';
  return { delta, label: `${sign}${delta} vs período anterior` };
}

/**
 * Allowed management metrics (CT3):
 * Open opportunities, Opportunity value, Quotes issued, Quoted value,
 * Quote→Pedido conversion, Orders, Order value, Delivered orders,
 * Overdue follow-ups, Open issues, Pending approvals.
 * Never call order value revenue.
 */
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
  const periodLabel = formatManagementPeriodLabel(period);
  const prior = priorEqualWindow(period);

  const openOpportunities = input.opportunities.filter((row) => row.status === 'open');
  const issuedQuotes = input.quotes.filter(
    (row) => row.submittedAt && inPeriod(row.submittedAt, period) && !row.cancelledAt,
  );
  const priorIssuedQuotes =
    prior == null
      ? null
      : input.quotes.filter(
          (row) => row.submittedAt && inPeriod(row.submittedAt, prior) && !row.cancelledAt,
        ).length;

  const orderQuoteIds = new Set(input.orders.map((row) => row.quoteId));
  const convertedCount = countConvertedQuotesInPeriod(input.quotes, orderQuoteIds, period.from, period.to);
  const issuedCount = countIssuedQuotesInPeriod(input.quotes, period.from, period.to);
  const priorConverted =
    prior == null
      ? null
      : countConvertedQuotesInPeriod(input.quotes, orderQuoteIds, prior.from, prior.to);
  const priorIssued =
    prior == null ? null : countIssuedQuotesInPeriod(input.quotes, prior.from, prior.to);

  const ordersInPeriod = input.orders.filter((row) => inPeriod(row.createdAt, period));
  const priorOrders =
    prior == null ? null : input.orders.filter((row) => inPeriod(row.createdAt, prior)).length;
  const deliveredOrders = ordersInPeriod.filter((row) => row.status === 'delivered');
  const priorDelivered =
    prior == null
      ? null
      : input.orders.filter((row) => inPeriod(row.createdAt, prior) && row.status === 'delivered')
          .length;

  const opportunityValue = openOpportunities.reduce(
    (sum, row) => sum + (row.expectedValueCentavos ? Number(row.expectedValueCentavos) : 0),
    0,
  );
  const hasOpportunityValue = openOpportunities.some((row) => row.expectedValueCentavos != null);
  const quotedValue = issuedQuotes.reduce((sum, row) => sum + Number(row.totalCentavos), 0);
  const orderValue = ordersInPeriod.reduce((sum, row) => sum + Number(row.totalCentavos), 0);

  const rate = quoteToOrderRateDisplay(convertedCount, issuedCount);
  const rateDetail = quoteToOrderRateDetail(convertedCount, issuedCount);
  const priorRateSafe =
    priorIssued != null && priorIssued > 0 && priorConverted != null && issuedCount > 0;

  return [
    {
      id: 'open-opportunities',
      label: 'Oportunidades abiertas',
      value: String(openOpportunities.length),
      count: openOpportunities.length,
      secondary: null,
      href: '/oportunidades',
      periodLabel,
      trend: null,
    },
    {
      id: 'opportunity-value',
      label: 'Valor de oportunidades',
      value: hasOpportunityValue ? formatCentavosLabel(opportunityValue) : '—',
      count: null,
      secondary: null,
      href: '/oportunidades',
      tooltip: 'Suma de valores esperados en oportunidades abiertas. No es ingreso.',
      periodLabel,
      trend: null,
    },
    {
      id: 'issued-quotes',
      label: 'Cotizaciones emitidas',
      value: String(issuedCount),
      count: issuedCount,
      secondary: null,
      href: '/cotizaciones?status=submitted',
      periodLabel,
      trend: safeCountTrend(issuedCount, priorIssuedQuotes),
    },
    {
      id: 'quoted-value',
      label: 'Valor cotizado',
      value: issuedCount > 0 ? formatCentavosLabel(quotedValue) : '—',
      count: null,
      secondary: null,
      href: '/cotizaciones?status=submitted',
      tooltip: 'Suma de totales de cotizaciones emitidas en el período. No es ingreso.',
      periodLabel,
      trend: null,
    },
    {
      id: 'quote-to-order-rate',
      label: 'Cotización → Pedido',
      value: rate,
      count: null,
      secondary: `${convertedCount} de ${issuedCount}`,
      href: '/cotizaciones?status=submitted',
      tooltip: rateDetail ?? 'Porcentaje de cotizaciones del período que terminaron convertidas en pedido.',
      periodLabel,
      trend: priorRateSafe
        ? {
            delta: convertedCount - (priorConverted ?? 0),
            label: `Antes: ${quoteToOrderRateDisplay(priorConverted ?? 0, priorIssued ?? 0)}`,
          }
        : null,
    },
    {
      id: 'orders',
      label: 'Pedidos',
      value: String(ordersInPeriod.length),
      count: ordersInPeriod.length,
      secondary: null,
      href: '/pedidos',
      periodLabel,
      trend: safeCountTrend(ordersInPeriod.length, priorOrders),
    },
    {
      id: 'order-value',
      label: 'Valor de pedidos',
      value: ordersInPeriod.length > 0 ? formatCentavosLabel(orderValue) : '—',
      count: null,
      secondary: null,
      href: '/pedidos',
      tooltip: 'Suma de totales de pedidos del período. No es ingreso ni cobranza.',
      periodLabel,
      trend: null,
    },
    {
      id: 'delivered-orders',
      label: 'Pedidos entregados',
      value: String(deliveredOrders.length),
      count: deliveredOrders.length,
      secondary: null,
      href: '/pedidos',
      periodLabel,
      trend: safeCountTrend(deliveredOrders.length, priorDelivered),
    },
    {
      id: 'overdue-follow-ups',
      label: 'Seguimientos vencidos',
      value: String(input.overdueFollowUps.length),
      count: input.overdueFollowUps.length,
      secondary: null,
      href: '/trabajo?view=overdue',
      periodLabel,
      trend: null,
    },
    {
      id: 'open-issues',
      label: 'Incidencias abiertas',
      value: String(
        input.openIssues.filter((row) => row.status !== 'resolved' && row.status !== 'closed')
          .length,
      ),
      count: input.openIssues.filter((row) => row.status !== 'resolved' && row.status !== 'closed')
        .length,
      secondary: null,
      href: '/incidencias',
      periodLabel,
      trend: null,
    },
    {
      id: 'pending-approvals',
      label: 'Aprobaciones pendientes',
      value: String(input.pendingApprovals.filter((row) => row.status === 'pending').length),
      count: input.pendingApprovals.filter((row) => row.status === 'pending').length,
      secondary: null,
      href: '/aprobaciones',
      periodLabel,
      trend: null,
    },
  ];
}

export function composeCommercialFunnelCounts(input: {
  period: ManagementPeriod;
  opportunities: readonly OpportunitySummaryReadModel[];
  quotes: readonly QuoteSummaryReadModel[];
  orders: readonly OrderSummaryReadModel[];
}): { opportunities: number; quotes: number; orders: number } {
  const openOpportunities = input.opportunities.filter((row) => row.status === 'open').length;
  const quotes = countIssuedQuotesInPeriod(input.quotes, input.period.from, input.period.to);
  const orders = input.orders.filter((row) => inPeriod(row.createdAt, input.period)).length;
  return { opportunities: openOpportunities, quotes, orders };
}
