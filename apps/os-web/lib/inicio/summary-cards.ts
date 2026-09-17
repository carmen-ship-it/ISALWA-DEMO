export type InicioSummaryCardId = 'attention' | 'today' | 'approvals' | 'issues';

export type InicioSummaryCard = {
  id: InicioSummaryCardId;
  label: string;
  count: number | null;
  href: string;
};

export const INICIO_SUMMARY_KICKER = 'Atención de hoy';

export const INICIO_SUMMARY_LABELS: Record<InicioSummaryCardId, string> = {
  attention: 'Necesita atención',
  today: 'Para hoy',
  approvals: 'Aprobaciones',
  issues: 'Incidencias abiertas',
};

export function buildInicioSummaryCards(input: {
  attentionCount: number;
  todayCount: number;
  approvalsCount: number;
  issuesCount: number | null;
}): InicioSummaryCard[] {
  return [
    {
      id: 'attention',
      label: INICIO_SUMMARY_LABELS.attention,
      count: input.attentionCount,
      href: '/trabajo',
    },
    {
      id: 'today',
      label: INICIO_SUMMARY_LABELS.today,
      count: input.todayCount,
      href: '/trabajo',
    },
    {
      id: 'approvals',
      label: INICIO_SUMMARY_LABELS.approvals,
      count: input.approvalsCount,
      href: '/aprobaciones',
    },
    {
      id: 'issues',
      label: INICIO_SUMMARY_LABELS.issues,
      count: input.issuesCount,
      href: '/incidencias',
    },
  ];
}
