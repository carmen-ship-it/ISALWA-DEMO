import { EmptyState, ListRow, SectionHeader, StatusPill } from '@isalwa/ui';
import type { CommitmentRecord } from '@isalwa/os-contracts';
import { COMMITMENT_COPY } from '@/lib/commitments/copy';
import { sortCommitmentRows } from '@/lib/commitments/view';

type CommitmentListProps = {
  records: readonly CommitmentRecord[];
  asOf: Date;
};

export function CommitmentList({ records, asOf }: CommitmentListProps) {
  const rows = sortCommitmentRows(records, asOf);
  return (
    <section data-tour="commitment" data-persistence="not_persisted" aria-labelledby="commitment-heading">
      <SectionHeader
        kicker={COMMITMENT_COPY.kicker}
        title={
          <h2 id="commitment-heading" className="font-[var(--isalwa-font-display)] text-lg text-[var(--isalwa-kiln)] italic">
            {COMMITMENT_COPY.title}
          </h2>
        }
      />
      <p className="mb-4 text-sm leading-relaxed text-[var(--isalwa-slate)]">{COMMITMENT_COPY.notStored}</p>
      {rows.length === 0 ? (
        <EmptyState title={COMMITMENT_COPY.empty} example={COMMITMENT_COPY.placeholder} />
      ) : (
        <ul className="min-w-0" aria-label="Compromisos">
          {rows.map((row) => (
            <ListRow key={row.id} as="li" railColor={row.state === 'overdue' ? 'var(--isalwa-danger)' : undefined}>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--isalwa-kiln)]">{row.text}</p>
                <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{row.dueLabel}</p>
              </div>
              <StatusPill tone={row.tone}>{row.stateLabel}</StatusPill>
            </ListRow>
          ))}
        </ul>
      )}
    </section>
  );
}
