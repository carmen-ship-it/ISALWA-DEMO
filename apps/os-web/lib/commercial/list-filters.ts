/** Canonical quote statuses supported on the cotizaciones list. */
export const QUOTE_LIST_STATUSES = ['draft', 'submitted', 'accepted', 'cancelled'] as const;

export type QuoteListStatus = (typeof QUOTE_LIST_STATUSES)[number];

export type QuoteStatusFilterOption = {
  status: QuoteListStatus;
  label: string;
  href: string;
};

export function parseQuoteListStatus(raw: string | undefined | null): QuoteListStatus {
  if (raw === 'submitted' || raw === 'accepted' || raw === 'cancelled') return raw;
  return 'draft';
}

export function quoteStatusFilterOptions(
  _active: QuoteListStatus,
): QuoteStatusFilterOption[] {
  return [
    { status: 'draft', label: 'Borrador', href: '/cotizaciones?status=draft' },
    { status: 'submitted', label: 'Enviadas', href: '/cotizaciones?status=submitted' },
    { status: 'accepted', label: 'Aceptadas', href: '/cotizaciones?status=accepted' },
    { status: 'cancelled', label: 'Canceladas', href: '/cotizaciones?status=cancelled' },
  ];
}

export function isQuoteStatusFilterActive(
  option: QuoteListStatus,
  active: QuoteListStatus,
): boolean {
  return option === active;
}

export function cotizacionesHref(status: QuoteListStatus = 'draft'): string {
  return `/cotizaciones?status=${status}`;
}
