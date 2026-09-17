/**
 * Deterministic "Oportunidades de mejora" — factual counts only.
 * No employee ranking, health scores, or speculative judgments.
 */

export const PATTERN_INSIGHT_COPY = {
  sectionKicker: 'Oportunidades de mejora',
  quotesWithoutFollowUp: (count: number) =>
    count === 1
      ? 'Hay 1 cotización enviada sin seguimiento programado.'
      : `Hay ${count} cotizaciones enviadas sin seguimiento programado.`,
  overdueWork: (count: number) =>
    count === 1 ? 'Hay 1 seguimiento vencido.' : `Hay ${count} seguimientos vencidos.`,
  customersWithoutLocation: (count: number) =>
    count === 1
      ? '1 cliente no aparece en el mapa porque falta confirmar su ubicación.'
      : `${count} clientes no aparecen en el mapa porque falta confirmar su ubicación.`,
  relatedIssues: (count: number) =>
    count === 1
      ? 'Se registró 1 incidencia reciente relacionada con este cliente o producto.'
      : `Se registraron ${count} incidencias recientes relacionadas con este cliente o producto.`,
  ctaQuotes: 'Ver cotizaciones',
  ctaWork: 'Ver trabajo',
  ctaLocations: 'Completar ubicaciones',
  ctaIssues: 'Ver incidencias',
} as const;

export type PatternInsightKind =
  | 'quotes_without_follow_up'
  | 'overdue_work'
  | 'customers_without_location'
  | 'related_recent_issues';

export type PatternInsightCard = {
  kind: PatternInsightKind;
  count: number;
  message: string;
  href: string;
  ctaLabel: string;
};

const MIN_COUNTS: Record<PatternInsightKind, number> = {
  quotes_without_follow_up: 3,
  overdue_work: 3,
  customers_without_location: 5,
  related_recent_issues: 2,
};

export function patternInsightEligible(kind: PatternInsightKind, count: number): boolean {
  return count >= MIN_COUNTS[kind];
}

export function buildPatternInsight(input: {
  kind: PatternInsightKind;
  count: number;
  href: string;
}): PatternInsightCard | null {
  if (!patternInsightEligible(input.kind, input.count)) return null;
  const message = patternMessage(input.kind, input.count);
  const ctaLabel = patternCta(input.kind);
  return { kind: input.kind, count: input.count, message, href: input.href, ctaLabel };
}

function patternMessage(kind: PatternInsightKind, count: number): string {
  switch (kind) {
    case 'quotes_without_follow_up':
      return PATTERN_INSIGHT_COPY.quotesWithoutFollowUp(count);
    case 'overdue_work':
      return PATTERN_INSIGHT_COPY.overdueWork(count);
    case 'customers_without_location':
      return PATTERN_INSIGHT_COPY.customersWithoutLocation(count);
    case 'related_recent_issues':
      return PATTERN_INSIGHT_COPY.relatedIssues(count);
    default:
      return '';
  }
}

function patternCta(kind: PatternInsightKind): string {
  switch (kind) {
    case 'quotes_without_follow_up':
      return PATTERN_INSIGHT_COPY.ctaQuotes;
    case 'overdue_work':
      return PATTERN_INSIGHT_COPY.ctaWork;
    case 'customers_without_location':
      return PATTERN_INSIGHT_COPY.ctaLocations;
    case 'related_recent_issues':
      return PATTERN_INSIGHT_COPY.ctaIssues;
    default:
      return 'Ver';
  }
}

/** Anticipation: quote sent without an open linked follow-up Work. */
export function quoteSentWithoutFollowUpInsight(input: {
  sentQuotesWithoutFollowUp: number;
  quotesHref: string;
}): PatternInsightCard | null {
  return buildPatternInsight({
    kind: 'quotes_without_follow_up',
    count: input.sentQuotesWithoutFollowUp,
    href: input.quotesHref,
  });
}
