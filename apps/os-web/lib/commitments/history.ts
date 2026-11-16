import type { CommitmentChange } from '@isalwa/os-contracts';
import { COMMITMENT_COPY } from '@/lib/commitments/copy';
import { formatCommitmentDue } from '@/lib/commitments/view';
import { memberLabel, type MemberLabelMap } from '@/lib/work/member-resolver';

export type CommitmentChangeLine = {
  id: string;
  title: string;
  /** The values it replaced and the reason, in reading order. */
  detail: string;
  when: string;
};

export function formatChangeTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/La_Paz',
  }).format(date);
}

/** One readable line per history entry. Newest first is the caller's choice; nothing is dropped. */
export function commitmentChangeLine(change: CommitmentChange, labels: MemberLabelMap): CommitmentChangeLine {
  const actor = memberLabel(labels, change.actorMemberId);
  const reason = change.reason ? `${COMMITMENT_COPY.reason}: ${change.reason}` : null;
  let title: string;
  let facts: Array<string | null>;
  switch (change.kind) {
    case 'rescheduled':
      title = `${actor} · ${COMMITMENT_COPY.historyRescheduled}`;
      facts = [
        change.newDueAt ? `${COMMITMENT_COPY.newDate}: ${formatCommitmentDue(change.newDueAt)}` : null,
        `${COMMITMENT_COPY.previousDue}: ${formatCommitmentDue(change.previousDueAt)}`,
        reason,
      ];
      break;
    case 'reassigned':
      title = `${actor} · ${COMMITMENT_COPY.historyReassigned}`;
      facts = [
        change.previousOwnerMemberId ? `${COMMITMENT_COPY.previousResponsible}: ${memberLabel(labels, change.previousOwnerMemberId)}` : null,
        change.newOwnerMemberId ? `${COMMITMENT_COPY.newResponsible}: ${memberLabel(labels, change.newOwnerMemberId)}` : null,
        reason,
      ];
      break;
    case 'cancelled':
      title = `${actor} · ${COMMITMENT_COPY.historyCancelled}`;
      facts = [reason];
      break;
    case 'fulfilled':
      title = `${actor} · ${COMMITMENT_COPY.historyFulfilled}`;
      facts = [change.reason];
      break;
  }
  return {
    id: change.id,
    title,
    detail: facts.filter((part): part is string => Boolean(part)).join(' · '),
    when: formatChangeTime(change.changedAt),
  };
}

/** Member ids a history needs resolved to names. */
export function commitmentChangeMemberIds(changes: readonly CommitmentChange[]): string[] {
  return changes.flatMap((change) =>
    [change.actorMemberId, change.previousOwnerMemberId, change.newOwnerMemberId].filter((id): id is string => Boolean(id)),
  );
}
