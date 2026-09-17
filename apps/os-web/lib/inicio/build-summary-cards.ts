import { INICIO_SUMMARY_LABELS, type InicioSummaryCard } from '@/lib/inicio/summary-cards';
import {
  buildInicioSummaryCounts,
  INICIO_SUMMARY_LINKS,
  type InicioSummaryCounts,
} from '@/lib/inicio/summary-counts';

export function summaryCardsFromCounts(
  counts: InicioSummaryCounts,
  issuesUnavailable: boolean,
): InicioSummaryCard[] {
  return [
    {
      id: 'attention',
      label: INICIO_SUMMARY_LABELS.attention,
      count: counts.needsAttention,
      href: INICIO_SUMMARY_LINKS.needsAttention,
    },
    {
      id: 'today',
      label: INICIO_SUMMARY_LABELS.today,
      count: counts.forToday,
      href: INICIO_SUMMARY_LINKS.forToday,
    },
    {
      id: 'approvals',
      label: INICIO_SUMMARY_LABELS.approvals,
      count: counts.approvals,
      href: INICIO_SUMMARY_LINKS.approvals,
    },
    {
      id: 'issues',
      label: INICIO_SUMMARY_LABELS.issues,
      count: issuesUnavailable ? null : counts.openIssues,
      href: INICIO_SUMMARY_LINKS.openIssues,
    },
  ];
}

export { buildInicioSummaryCounts };
