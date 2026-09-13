export function partyHref(partyId: string): string {
  return `/clientes/${encodeURIComponent(partyId)}`;
}

export function clientesSearchHref(params: {
  q?: string;
  status?: string;
  roleKey?: string;
  cursor?: string;
}): string {
  const search = new URLSearchParams();
  if (params.q) search.set('q', params.q);
  if (params.status) search.set('status', params.status);
  if (params.roleKey) search.set('roleKey', params.roleKey);
  if (params.cursor) search.set('cursor', params.cursor);
  const query = search.toString();
  return query ? `/clientes?${query}` : '/clientes';
}

export function trabajoForPartyHref(partyId: string): string {
  return `/trabajo?subjectType=party&subjectId=${encodeURIComponent(partyId)}`;
}
