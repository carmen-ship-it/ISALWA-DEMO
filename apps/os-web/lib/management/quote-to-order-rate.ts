/**
 * Factual operational conversion: quotes converted to Order / issued quotes in period.
 * Not revenue, win rate, or forecast language.
 */

export const QUOTE_TO_ORDER_LABEL = 'Tasa cotización → pedido' as const;

export const QUOTE_TO_ORDER_TOOLTIP =
  'Porcentaje de cotizaciones del período que terminaron convertidas en pedido.';

export function quoteToOrderRateDisplay(converted: number, issued: number): string {
  if (!Number.isFinite(converted) || !Number.isFinite(issued) || issued <= 0) {
    return '—';
  }
  return `${Math.round((converted / issued) * 100)}%`;
}

export function quoteToOrderRateDetail(converted: number, issued: number): string | null {
  if (issued <= 0) return null;
  return `${converted} de ${issued} cotizaciones emitidas en el período fueron convertidas a pedido.`;
}

export function countIssuedQuotesInPeriod<
  T extends { submittedAt: string | null; cancelledAt: string | null },
>(quotes: readonly T[], from: Date, to: Date): number {
  return quotes.filter((quote) => {
    if (quote.cancelledAt) return false;
    if (!quote.submittedAt) return false;
    const at = new Date(quote.submittedAt).getTime();
    return at >= from.getTime() && at <= to.getTime();
  }).length;
}

export function countConvertedQuotesInPeriod<
  T extends { quoteId: string; submittedAt: string | null; cancelledAt: string | null },
>(
  quotes: readonly T[],
  orderQuoteIds: ReadonlySet<string>,
  from: Date,
  to: Date,
): number {
  return quotes.filter((quote) => {
    if (quote.cancelledAt) return false;
    if (!quote.submittedAt) return false;
    const at = new Date(quote.submittedAt).getTime();
    if (at < from.getTime() || at > to.getTime()) return false;
    return orderQuoteIds.has(quote.quoteId);
  }).length;
}
