export type InicioSectionCounts = {
  opportunities: number;
  quotesDraft: number;
  quotesSubmitted: number;
  work: number;
  approvals: number;
};

export type InicioEmptyCta = {
  href: string;
  label: string;
};

/** True when commercial + work + approvals projections all returned zero items. */
export function isInicioCommerciallyEmpty(counts: InicioSectionCounts): boolean {
  return (
    counts.opportunities === 0 &&
    counts.quotesDraft === 0 &&
    counts.quotesSubmitted === 0 &&
    counts.work === 0 &&
    counts.approvals === 0
  );
}

/** Approvals stay visible but must not dominate an otherwise empty commercial day. */
export function shouldShowInicioApprovalsSection(
  counts: InicioSectionCounts,
): boolean {
  return counts.approvals > 0;
}

export function inicioEmptyCtas(): InicioEmptyCta[] {
  return [
    { href: '/clientes', label: 'Ir a Clientes' },
    { href: '/oportunidades', label: 'Ver oportunidades' },
    { href: '/cotizaciones', label: 'Ver cotizaciones' },
  ];
}

export const INICIO_SECTION_LIMIT = 5;
