import { INICIO_SUMMARY_LABELS, type InicioSummaryCard } from '@/lib/inicio/summary-cards';
import {
  buildInicioSummaryCounts,
  INICIO_SUMMARY_LINKS,
  type InicioSummaryCounts,
} from '@/lib/inicio/summary-counts';

/** Sources that failed to load. A failed source shows "—", never a zero. */
export type InicioSummaryUnavailable = {
  attention?: boolean;
  today?: boolean;
  approvals?: boolean;
  issues?: boolean;
};

export function summaryCardsFromCounts(
  counts: InicioSummaryCounts,
  unavailable: InicioSummaryUnavailable | boolean,
): InicioSummaryCard[] {
  const failed: InicioSummaryUnavailable =
    typeof unavailable === 'boolean' ? { issues: unavailable } : unavailable;
  return [
    {
      id: 'attention',
      label: INICIO_SUMMARY_LABELS.attention,
      count: failed.attention ? null : counts.needsAttention,
      href: INICIO_SUMMARY_LINKS.needsAttention,
    },
    {
      id: 'today',
      label: INICIO_SUMMARY_LABELS.today,
      count: failed.today ? null : counts.forToday,
      href: INICIO_SUMMARY_LINKS.forToday,
    },
    {
      id: 'approvals',
      label: INICIO_SUMMARY_LABELS.approvals,
      count: failed.approvals ? null : counts.approvals,
      href: INICIO_SUMMARY_LINKS.approvals,
    },
    {
      id: 'issues',
      label: INICIO_SUMMARY_LABELS.issues,
      count: failed.issues ? null : counts.openIssues,
      href: INICIO_SUMMARY_LINKS.openIssues,
    },
  ];
}

export { buildInicioSummaryCounts };
