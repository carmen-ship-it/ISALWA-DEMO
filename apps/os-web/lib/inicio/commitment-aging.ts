import type { CommitmentSummary } from '@/lib/api/os-api-client';
import type { CommitmentAgingAdapter, CommitmentAgingRecord } from '@/lib/work/aging/types';
import { partyHref } from '@/lib/party/navigation';

function toAgingRecord(item: CommitmentSummary): CommitmentAgingRecord {
  const resolvedAt =
    item.lifecycle === 'fulfilled'
      ? item.fulfilledAt
      : item.lifecycle === 'cancelled'
        ? item.cancelledAt
        : null;
  return {
    commitmentId: item.id,
    label: item.text.trim() || 'Compromiso',
    dueAt: item.dueAt,
    resolvedAt,
    href: item.partyId ? partyHref(item.partyId) : null,
  };
}

export function commitmentAgingAdapter(
  items: readonly CommitmentSummary[],
): CommitmentAgingAdapter {
  const records = items.map(toAgingRecord);
  return {
    list: () => records,
  };
}
