import {
  COMMITMENT_CALENDAR_ZONE,
  deriveCommitmentState,
  type CommitmentRecord,
  type CommitmentState,
} from '@isalwa/os-contracts';
import { commitmentStateLabel } from '@/lib/commitments/copy';

export type CommitmentTone = 'neutral' | 'warning' | 'danger' | 'success';

export type CommitmentRowView = {
  id: string;
  text: string;
  state: CommitmentState;
  stateLabel: string;
  tone: CommitmentTone;
  dueLabel: string;
};

const TONES: Record<CommitmentState, CommitmentTone> = {
  pending: 'neutral',
  due_today: 'warning',
  overdue: 'danger',
  fulfilled: 'success',
  cancelled: 'neutral',
};

const RANK: Record<CommitmentState, number> = {
  overdue: 0,
  due_today: 1,
  pending: 2,
  fulfilled: 3,
  cancelled: 4,
};

export function formatCommitmentDue(dueAt: string | null): string {
  if (!dueAt) return 'Sin fecha';
  const date = new Date(dueAt);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'medium',
    timeZone: COMMITMENT_CALENDAR_ZONE,
  }).format(date);
}

export function commitmentRowView(record: CommitmentRecord, asOf: Date): CommitmentRowView {
  const state = deriveCommitmentState(record, asOf);
  return {
    id: record.id,
    text: record.text,
    state,
    stateLabel: commitmentStateLabel(state),
    tone: TONES[state],
    dueLabel: formatCommitmentDue(record.dueAt),
  };
}

/** Presentation order only. Does not change the recorded state. */
export function sortCommitmentRows(records: readonly CommitmentRecord[], asOf: Date): CommitmentRowView[] {
  return records
    .map((record) => commitmentRowView(record, asOf))
    .sort((left, right) => {
      const rank = RANK[left.state] - RANK[right.state];
      if (rank !== 0) return rank;
      return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
    });
}
