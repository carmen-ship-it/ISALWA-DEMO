import type {
  OpportunitySummaryReadModel,
  OrderSummaryReadModel,
  QuoteSummaryReadModel,
} from '@isalwa/os-contracts';
import { formatCentavos, formatOptionalCentavos } from '@/lib/commercial/money';

/**
 * Map commercial lens — presentation over existing SoR summaries only.
 * Never labels quote/order/opportunity amounts as revenue / ingresos / facturación.
 */

export type MapCommercialLensInput = {
  opportunities: readonly OpportunitySummaryReadModel[];
  quotes: readonly QuoteSummaryReadModel[];
  orders: readonly OrderSummaryReadModel[];
  /** True when any commercial list reported hasMore / truncated. */
  partial: boolean;
};

export type MapPartyCommercialSnapshot = {
  opportunityCount: number;
  quoteCount: number;
  orderCount: number;
  /** Sum of non-null expectedValueCentavos — safe label Valor de oportunidades */
  opportunityValueLabel: string | null;
  /** Sum of quote totalCentavos — safe label Valor cotizado */
  quotedValueLabel: string | null;
  /** Sum of order totalCentavos — safe label Valor de pedidos */
  orderValueLabel: string | null;
  currency: string;
};

export type MapCommercialPortfolio = {
  opportunityCount: number;
  quoteCount: number;
  orderCount: number;
  opportunityValueLabel: string | null;
  quotedValueLabel: string | null;
  orderValueLabel: string | null;
  partyIdsWithOpportunities: ReadonlySet<string>;
  partyIdsWithQuotes: ReadonlySet<string>;
  partyIdsWithOrders: ReadonlySet<string>;
  partial: boolean;
};

function activeOpportunities(items: readonly OpportunitySummaryReadModel[]) {
  return items.filter((item) => item.status !== 'cancelled' && item.closedAt == null);
}

function activeQuotes(items: readonly QuoteSummaryReadModel[]) {
  return items.filter((item) => item.status !== 'cancelled');
}

function activeOrders(items: readonly OrderSummaryReadModel[]) {
  return items.filter((item) => item.status !== 'cancelled');
}

function sumCentavos(values: readonly (string | null | undefined)[]): string | null {
  let total = BigInt(0);
  let any = false;
  for (const value of values) {
    if (value == null || value === '' || !/^-?\d+$/.test(value)) continue;
    total += BigInt(value);
    any = true;
  }
  return any ? total.toString() : null;
}

function dominantCurrency(items: readonly { currency?: string }[]): string {
  for (const item of items) {
    if (item.currency?.trim()) return item.currency.trim();
  }
  return 'BOB';
}

export function buildMapCommercialPortfolio(input: MapCommercialLensInput): MapCommercialPortfolio {
  const opportunities = activeOpportunities(input.opportunities);
  const quotes = activeQuotes(input.quotes);
  const orders = activeOrders(input.orders);
  const currency = dominantCurrency([...quotes, ...orders]);

  const opportunityValue = sumCentavos(opportunities.map((item) => item.expectedValueCentavos));
  const quotedValue = sumCentavos(quotes.map((item) => item.totalCentavos));
  const orderValue = sumCentavos(orders.map((item) => item.totalCentavos));

  return {
    opportunityCount: opportunities.length,
    quoteCount: quotes.length,
    orderCount: orders.length,
    opportunityValueLabel: opportunityValue
      ? formatCentavos(opportunityValue, currency)
      : null,
    quotedValueLabel: quotedValue ? formatCentavos(quotedValue, currency) : null,
    orderValueLabel: orderValue ? formatCentavos(orderValue, currency) : null,
    partyIdsWithOpportunities: new Set(opportunities.map((item) => item.partyId)),
    partyIdsWithQuotes: new Set(quotes.map((item) => item.partyId)),
    partyIdsWithOrders: new Set(orders.map((item) => item.partyId)),
    partial: input.partial,
  };
}

export function buildMapPartyCommercialSnapshot(
  partyId: string,
  input: MapCommercialLensInput,
): MapPartyCommercialSnapshot {
  const id = partyId.trim();
  const opportunities = activeOpportunities(input.opportunities).filter((item) => item.partyId === id);
  const quotes = activeQuotes(input.quotes).filter((item) => item.partyId === id);
  const orders = activeOrders(input.orders).filter((item) => item.partyId === id);
  const currency = dominantCurrency([...quotes, ...orders]);

  const opportunityValue = sumCentavos(opportunities.map((item) => item.expectedValueCentavos));
  const quotedValue = sumCentavos(quotes.map((item) => item.totalCentavos));
  const orderValue = sumCentavos(orders.map((item) => item.totalCentavos));

  return {
    opportunityCount: opportunities.length,
    quoteCount: quotes.length,
    orderCount: orders.length,
    opportunityValueLabel: opportunityValue
      ? formatOptionalCentavos(opportunityValue, currency)
      : null,
    quotedValueLabel: quotedValue ? formatCentavos(quotedValue, currency) : null,
    orderValueLabel: orderValue ? formatCentavos(orderValue, currency) : null,
    currency,
  };
}

export const MAP_COMMERCIAL_VALUE_DISCLAIMER =
  'Montos comerciales de registros canónicos. No es ingreso, facturación ni cobranza confirmada.';
