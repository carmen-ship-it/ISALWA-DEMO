import type { AttentionItemReadModel } from '@isalwa/os-contracts';
import { t } from '@/lib/i18n/es';
import { sortAgingFacts } from '@/lib/work/aging/derive';
import type { AgingFact, AgingFactKind } from '@/lib/work/aging/types';

export type AgingFactGroup = {
  id: AgingFactKind;
  title: string;
  facts: AgingFact[];
};

const GROUP_ORDER: readonly AgingFactKind[] = [
  'due_today',
  'elapsed_due',
  'approval_pending',
  'quote_submitted',
];

function titleFor(kind: AgingFactKind): string {
  switch (kind) {
    case 'due_today':
      return 'Vence hoy';
    case 'elapsed_due':
      return 'Tiempo transcurrido';
    case 'approval_pending':
      return 'Aprobación pendiente';
    case 'quote_submitted':
      return t('pages.inicio.quotesSubmitted');
    default:
      return 'Pendiente';
  }
}

function resourceAfter(issueId: string | null, prefix: string): string | null {
  if (!issueId?.startsWith(prefix)) return null;
  const resourceId = issueId.slice(prefix.length);
  return resourceId.trim() === '' ? null : resourceId;
}

/**
 * Facts that are not already shown on an existing attention row.
 * Open work that is past due stays off this list so it is not shown as a new overdue group.
 */
export function supplementalAgingGroups(
  facts: readonly AgingFact[],
  items: readonly AttentionItemReadModel[],
): AgingFactGroup[] {
  const shownWork = new Set(
    items.flatMap((item) => (item.workItemId ? [item.workItemId] : [])),
  );
  const shownApprovals = new Set(
    items.flatMap((item) => (item.approvalRequestId ? [item.approvalRequestId] : [])),
  );

  const visible = sortAgingFacts(facts).filter((fact) => {
    const workId = resourceAfter(fact.issueId, 'work:');
    if (workId) {
      if (fact.kind === 'elapsed_due') return false;
      if (fact.kind === 'due_today' && shownWork.has(workId)) return false;
    }
    const approvalId = resourceAfter(fact.issueId, 'approval:');
    if (approvalId && shownApprovals.has(approvalId)) return false;
    return true;
  });

  const groups: AgingFactGroup[] = [];
  for (const id of GROUP_ORDER) {
    const grouped = visible.filter((fact) => fact.kind === id);
    if (grouped.length === 0) continue;
    groups.push({ id, title: titleFor(id), facts: grouped });
  }
  return groups;
}
