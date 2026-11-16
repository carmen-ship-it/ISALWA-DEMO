'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { Button, EmptyState, ListRow, SectionHeader, StatusPill } from '@isalwa/ui';
import { CommitmentActionForm, type CommitmentChangeMode } from '@/components/commitments/commitment-action-form';
import { ScaledListReveal } from '@/components/ui/scaled-list-reveal';
import type { CommitmentSummary } from '@/lib/api/os-api-client';
import { COMMITMENT_COPY, commitmentStateLabel } from '@/lib/commitments/copy';
import { presentHumanCopy } from '@/lib/demo/human-facing-copy';
import { fulfillCommitmentAction } from '@/lib/commitments/persistence';
import { formatCommitmentDue } from '@/lib/commitments/view';
import { sliceForListScale } from '@/lib/ui/list-scaling';
import { memberLabel, type MemberLabelMap } from '@/lib/work/member-resolver';
import type { CommitmentState } from '@isalwa/os-contracts';
import { isEngineeringFixtureCopy } from '@/lib/work/staff-subject';

type CommitmentTone = 'neutral' | 'warning' | 'danger' | 'success';

const TONES: Record<CommitmentState, CommitmentTone> = {
  pending: 'warning',
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

type CommitmentListProps = {
  items: CommitmentSummary[];
  memberLabels?: MemberLabelMap;
  partyLabel?: string | null;
  asOf?: Date;
  showOrigin?: boolean;
  /** Link each row to its own page. Off on that page. */
  showDetailLink?: boolean;
  onFulfilled?: () => void;
  /** Apply shared list-scaling (0 empty · 1–5 compact · 6+ Ver todos). */
  scale?: boolean;
  /** Hide the built-in section header (e.g. page already titled). */
  hideHeader?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
};

function formatFulfilledAt(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/La_Paz',
  }).format(date);
}

export function CommitmentList({
  items,
  memberLabels = new Map(),
  partyLabel = null,
  showOrigin = true,
  showDetailLink = true,
  onFulfilled,
  scale = false,
  hideHeader = false,
  emptyTitle = COMMITMENT_COPY.empty,
  emptyDescription = COMMITMENT_COPY.emptyDescription,
}: CommitmentListProps) {
  const router = useRouter();
  const [fulfillingId, setFulfillingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [changing, setChanging] = useState<{ id: string; mode: CommitmentChangeMode } | null>(null);

  const rows = [...items].filter((item) => !isEngineeringFixtureCopy(item.text)).sort((a, b) => {
    const rankA = RANK[a.state] ?? 99;
    const rankB = RANK[b.state] ?? 99;
    if (rankA !== rankB) return rankA - rankB;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  async function handleFulfill(commitmentId: string) {
    setFulfillingId(commitmentId);
    setError(null);

    const result = await fulfillCommitmentAction(commitmentId);

    setFulfillingId(null);

    if (!result.ok) {
      setError(result.message ?? COMMITMENT_COPY.fulfillFailed);
      return;
    }

    onFulfilled?.();
    router.refresh();
  }

  function renderRows(visible: CommitmentSummary[]) {
    return (
      <ul className="min-w-0" aria-label="Compromisos">
        {visible.map((row) => {
          const tone = TONES[row.state] ?? 'neutral';
          const stateLabel = commitmentStateLabel(row.state);
          const dueLabel = formatCommitmentDue(row.dueAt);
          const customerReported = row.origin === 'customer_reported';
          const promisor = customerReported
            ? COMMITMENT_COPY.customerPromisor
            : memberLabel(memberLabels, row.createdByMemberId);
          const followUp = memberLabel(memberLabels, row.ownerMemberId);
          const recordedBy = memberLabel(memberLabels, row.createdByMemberId);
          const fulfilledBy = row.fulfilledByMemberId
            ? memberLabel(memberLabels, row.fulfilledByMemberId)
            : null;
          const fulfilledWhen = formatFulfilledAt(row.fulfilledAt);
          // The server says what this member may do. Without flags (older payloads) keep the one action that always existed.
          const open = row.lifecycle === 'open';
          const canFulfill = row.actor ? row.actor.canFulfill : open;
          const canReschedule = row.actor?.canReschedule === true;
          const canReassign = row.actor?.canReassign === true;
          const canCancel = row.actor?.canCancel === true;
          const activeMode = changing?.id === row.id ? changing.mode : null;
          const ownerLost = row.ownerAccessActive === false && open;
          const meta = [
            `${COMMITMENT_COPY.promisedBy}: ${promisor}`,
            partyLabel ? `${COMMITMENT_COPY.promisedTo}: ${partyLabel}` : null,
            ownerLost
              ? `${COMMITMENT_COPY.followUpOwner}: ${COMMITMENT_COPY.noActiveOwner}`
              : `${COMMITMENT_COPY.followUpOwner}: ${followUp}`,
            dueLabel,
            customerReported ? COMMITMENT_COPY.paymentBoundary : null,
            row.lifecycle === 'fulfilled' && fulfilledBy
              ? `${COMMITMENT_COPY.fulfilledBy}: ${fulfilledBy}${fulfilledWhen ? ` · ${fulfilledWhen}` : ''}`
              : null,
            !customerReported && recordedBy !== followUp
              ? `${COMMITMENT_COPY.recordedBy}: ${recordedBy}`
              : null,
          ]
            .filter((part): part is string => Boolean(part))
            .join(' · ');

          return (
            <ListRow key={row.id} as="li" railColor={row.state === 'overdue' ? 'var(--isalwa-danger)' : undefined}>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-[0.9375rem] font-semibold leading-5 text-[var(--isalwa-kiln)]">
                  {presentHumanCopy(row.text) || 'Compromiso'}
                </p>
                <p className="mt-1 line-clamp-2 text-xs leading-4 text-[var(--isalwa-slate)]">{meta}</p>
                {activeMode ? (
                  <CommitmentActionForm
                    commitment={row}
                    mode={activeMode}
                    onClose={() => setChanging(null)}
                  />
                ) : null}
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {showOrigin ? (
                  <StatusPill tone={customerReported ? 'warning' : 'neutral'}>
                    {customerReported ? COMMITMENT_COPY.originCustomer : COMMITMENT_COPY.originEmployee}
                  </StatusPill>
                ) : null}
                <StatusPill tone={tone}>{stateLabel}</StatusPill>
                {ownerLost ? <StatusPill tone="warning">{COMMITMENT_COPY.noActiveOwner}</StatusPill> : null}
                {canFulfill ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleFulfill(row.id)}
                    disabled={fulfillingId === row.id}
                  >
                    {fulfillingId === row.id ? '…' : COMMITMENT_COPY.fulfill}
                  </Button>
                ) : null}
                {canReschedule ? (
                  <Button variant="ghost" size="sm" onClick={() => setChanging({ id: row.id, mode: 'reschedule' })}>
                    {COMMITMENT_COPY.reschedule}
                  </Button>
                ) : null}
                {canReassign ? (
                  <Button variant="ghost" size="sm" onClick={() => setChanging({ id: row.id, mode: 'reassign' })}>
                    {COMMITMENT_COPY.reassign}
                  </Button>
                ) : null}
                {canCancel ? (
                  <Button variant="ghost" size="sm" onClick={() => setChanging({ id: row.id, mode: 'cancel' })}>
                    {COMMITMENT_COPY.cancel}
                  </Button>
                ) : null}
                {showDetailLink ? (
                  <Link
                    href={`/compromisos/${encodeURIComponent(row.id)}`}
                    className="text-xs font-medium text-[var(--isalwa-glaze)] hover:underline"
                  >
                    {COMMITMENT_COPY.openDetail}
                  </Link>
                ) : null}
              </div>
            </ListRow>
          );
        })}
      </ul>
    );
  }

  const empty = (
    <EmptyState
      title={emptyTitle}
      description={emptyDescription}
      example={COMMITMENT_COPY.sectionHint}
    />
  );

  return (
    <section aria-labelledby={hideHeader ? undefined : 'commitment-heading'}>
      {hideHeader ? null : (
        <SectionHeader
          kicker={COMMITMENT_COPY.kicker}
          title={
            <h2
              id="commitment-heading"
              className="font-[var(--isalwa-font-display)] text-lg text-[var(--isalwa-kiln)] italic"
            >
              {COMMITMENT_COPY.title}
            </h2>
          }
        />
      )}
      {error ? (
        <p className="mb-4 text-sm text-[var(--isalwa-danger)]" role="alert">
          {error}
        </p>
      ) : null}
      {scale ? (
        <ScaledListReveal
          total={rows.length}
          empty={empty}
          preview={renderRows(sliceForListScale(rows, false))}
          full={renderRows(rows)}
        />
      ) : rows.length === 0 ? (
        empty
      ) : (
        renderRows(rows)
      )}
    </section>
  );
}
