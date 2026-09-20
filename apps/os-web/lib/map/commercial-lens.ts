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
  /** Clients visible under the current Datos reales / Demo lens. */
  clientCount?: number;
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
  /** Raw centavos for map bubble sizing only — never invent. */
  opportunityValueCentavos: number | null;
  quotedValueCentavos: number | null;
  orderValueCentavos: number | null;
  currency: string;
};

export type MapCommercialPortfolio = {
  /** Visible clients in the current Datos reales / Demo lens. */
  clientCount: number;
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

/** Safe finite number for display scaling; null when no recorded amount. */
export function centavosToNumber(centavos: string | null | undefined): number | null {
  if (centavos == null || centavos === '' || !/^-?\d+$/.test(centavos)) return null;
  try {
    const n = Number(BigInt(centavos));
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
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
    clientCount: Math.max(0, input.clientCount ?? 0),
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
    opportunityValueCentavos: centavosToNumber(opportunityValue),
    quotedValueCentavos: centavosToNumber(quotedValue),
    orderValueCentavos: centavosToNumber(orderValue),
    currency,
  };
}

export const MAP_COMMERCIAL_VALUE_DISCLAIMER =
  'Explore la actividad comercial por cliente y zona. Los valores mostrados provienen de oportunidades, cotizaciones y pedidos registrados en ISALWA; no representan ingresos contables.';
