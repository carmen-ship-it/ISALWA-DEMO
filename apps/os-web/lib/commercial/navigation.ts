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

export function clienteSectionHref(partyId: string, section: string): string {
  return `/clientes/${encodeURIComponent(partyId)}#${section}`;
}
