import { explicitDataMode, withExplicitDataMode, type ExplicitDataMode } from '@/lib/demo/preserve-data-mode';

export function opportunityHref(partyId: string, opportunityId: string): string {
  return `/clientes/${encodeURIComponent(partyId)}/oportunidades/${encodeURIComponent(opportunityId)}`;
}

export function quoteHref(partyId: string, quoteId: string): string {
  return `/clientes/${encodeURIComponent(partyId)}/cotizaciones/${encodeURIComponent(quoteId)}`;
}

export function orderHref(partyId: string, orderId: string): string {
  return `/clientes/${encodeURIComponent(partyId)}/pedidos/${encodeURIComponent(orderId)}`;
}

export function newOpportunityHref(partyId: string): string {
  return `/clientes/${encodeURIComponent(partyId)}/oportunidades/nueva`;
}

export function newQuoteHref(partyId: string, opportunityId: string): string {
  return `/clientes/${encodeURIComponent(partyId)}/oportunidades/${encodeURIComponent(opportunityId)}/cotizaciones/nueva`;
}

/**
 * Cliente360 tab deep link. Uses `?tab=` so refresh preserves the panel.
 * Optional in-panel hash (e.g. finanzas under Operación) is appended after the query.
 */
export function clienteSectionHref(
  partyId: string,
  section: string,
  hash?: string,
  datos?: ExplicitDataMode | null,
): string {
  const base = `/clientes/${encodeURIComponent(partyId)}?tab=${encodeURIComponent(section)}`;
  const withHash = (() => {
    if (!hash) return base;
    const clean = hash.replace(/^#/, '').trim();
    return clean ? `${base}#${encodeURIComponent(clean)}` : base;
  })();
  return withExplicitDataMode(withHash, explicitDataMode(datos));
}
