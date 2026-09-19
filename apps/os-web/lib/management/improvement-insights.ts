import type { QuoteSummaryReadModel, WorkSummaryReadModel } from '@isalwa/os-contracts';

export type ManagementInsight = {
  id: string;
  message: string;
  href: string;
  cta: string;
};

export type ImprovementInsightInput = {
  submittedQuotes: readonly QuoteSummaryReadModel[];
  openFollowUpWork: readonly WorkSummaryReadModel[];
  overdueFollowUps: readonly WorkSummaryReadModel[];
  pendingQuoteApprovals: number;
  clientsMissingLocation: number | null;
  /** Warehouse exits without a recorded delivery — only when factually counted */
  exitsWithoutDelivery: number | null;
  /** Records awaiting human confirmation — only when factually counted */
  pendingConfirmations: number | null;
};

function quoteIdsWithOpenFollowUp(work: readonly WorkSummaryReadModel[]): Set<string> {
  const ids = new Set<string>();
  for (const row of work) {
    if (row.status !== 'open') continue;
    if (row.subjectType === 'quote' && row.subjectId) ids.add(row.subjectId);
  }
  return ids;
}

/** Deterministic "Para revisar" cards — no speculative advice. */
export function buildParaRevisarInsights(input: ImprovementInsightInput): ManagementInsight[] {
  const insights: ManagementInsight[] = [];
  const withFollowUp = quoteIdsWithOpenFollowUp(input.openFollowUpWork);
  const sentWithoutFollowUp = input.submittedQuotes.filter(
    (quote) => quote.submittedAt && !withFollowUp.has(quote.quoteId),
  ).length;

  if (sentWithoutFollowUp > 0) {
    insights.push({
      id: 'quotes-no-follow-up',
      message: `${sentWithoutFollowUp} ${
        sentWithoutFollowUp === 1
          ? 'cotización enviada no tiene'
          : 'cotizaciones enviadas no tienen'
      } seguimiento programado.`,
      href: '/cotizaciones?status=submitted',
      cta: 'Ver cotizaciones',
    });
  }

  const overdue = input.overdueFollowUps.length;
  if (overdue > 0) {
    insights.push({
      id: 'overdue-follow-ups',
      message: `${overdue} seguimiento${overdue === 1 ? '' : 's'} ${overdue === 1 ? 'está' : 'están'} vencido${overdue === 1 ? '' : 's'}.`,
      href: '/trabajo?view=overdue',
      cta: 'Ver trabajo',
    });
  }

  if (input.clientsMissingLocation != null && input.clientsMissingLocation > 0) {
    insights.push({
      id: 'missing-locations',
      message: `${input.clientsMissingLocation} cliente${input.clientsMissingLocation === 1 ? '' : 's'} todavía no tiene${input.clientsMissingLocation === 1 ? '' : 'n'} ubicación confirmada.`,
      href: '/salud-datos',
      cta: 'Completar ubicaciones',
    });
  }

  if (input.pendingQuoteApprovals > 0) {
    insights.push({
      id: 'pending-quote-approvals',
      message: `${input.pendingQuoteApprovals} cotización${input.pendingQuoteApprovals === 1 ? '' : 'es'} espera${input.pendingQuoteApprovals === 1 ? '' : 'n'} aprobación.`,
      href: '/aprobaciones',
      cta: 'Ver aprobaciones',
    });
  }

  if (input.exitsWithoutDelivery != null && input.exitsWithoutDelivery > 0) {
    insights.push({
      id: 'exits-without-delivery',
      message: `${input.exitsWithoutDelivery} salida${input.exitsWithoutDelivery === 1 ? '' : 's'} de almacén sin entrega registrada.`,
      href: '/entregas',
      cta: 'Ver entregas',
    });
  }

  if (input.pendingConfirmations != null && input.pendingConfirmations > 0) {
    insights.push({
      id: 'pending-confirmations',
      message: `${input.pendingConfirmations} registro${input.pendingConfirmations === 1 ? '' : 's'} espera${input.pendingConfirmations === 1 ? '' : 'n'} confirmación humana.`,
      href: '/trabajo',
      cta: 'Revisar pendientes',
    });
  }

  return insights;
}

/** Threshold-based coaching cards — no ranking or personality judgments. */
export function buildOportunidadesDeMejora(input: ImprovementInsightInput): ManagementInsight[] {
  const insights: ManagementInsight[] = [];
  const withFollowUp = quoteIdsWithOpenFollowUp(input.openFollowUpWork);
  const sentWithoutFollowUp = input.submittedQuotes.filter(
    (quote) => quote.submittedAt && !withFollowUp.has(quote.quoteId),
  ).length;
  const overdue = input.overdueFollowUps.length;

  if (sentWithoutFollowUp >= 3) {
    insights.push({
      id: 'improve-quotes-follow-up',
      message: `Hay ${sentWithoutFollowUp} cotizaciones enviadas sin seguimiento programado.`,
      href: '/cotizaciones?status=submitted',
      cta: 'Ver cotizaciones',
    });
  }

  if (overdue >= 3) {
    insights.push({
      id: 'improve-overdue-work',
      message: `Hay ${overdue} seguimientos vencidos.`,
      href: '/trabajo?view=overdue',
      cta: 'Ver trabajo',
    });
  }

  if (input.clientsMissingLocation != null && input.clientsMissingLocation >= 5) {
    insights.push({
      id: 'improve-map-coverage',
      message: `${input.clientsMissingLocation} clientes no aparecen en el mapa porque falta confirmar su ubicación.`,
      href: '/mapa',
      cta: 'Completar ubicaciones',
    });
  }

  return insights;
}
