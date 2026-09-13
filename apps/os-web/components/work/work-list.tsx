import Link from 'next/link';
import { ListRow, StatusPill } from '@isalwa/ui';
import type { WorkSummaryReadModel } from '@isalwa/os-contracts';
import { formatWorkDueLine } from '@/lib/work/due-order';
import {
  formatPriority,
  formatSubjectType,
  formatWorkApprovalStatus,
  formatWorkStatus,
  priorityTone,
  statusToneForWork,
} from '@/lib/work/labels';
import { partyHref } from '@/lib/party/navigation';
import { memberLabel, type MemberLabelMap } from '@/lib/work/member-resolver';
import { followUpStatusLabel, FOLLOW_UP_COPY } from '@/lib/work/follow-up';
import { workItemHref } from '@/lib/work/navigation';

type WorkListProps = {
  items: WorkSummaryReadModel[];
  memberLabels: MemberLabelMap;
  presentation?: 'work' | 'follow-up';
};

export function WorkList({ items, memberLabels, presentation = 'work' }: WorkListProps) {
  const followUp = presentation === 'follow-up';
  return (
    <ul className="divide-y divide-[var(--isalwa-mist)]" aria-label={followUp ? 'Lista de seguimientos' : 'Lista de trabajo'}>
      {items.map((work) => {
        const due = formatWorkDueLine(work, {
          caption: followUp ? FOLLOW_UP_COPY.due : 'Vence',
        });
        const subject = formatSubjectType(work.subjectType);
        const statusLabel = followUp ? followUpStatusLabel(work.status) : formatWorkStatus(work.status);
        return (
          <ListRow key={work.workItemId} as="li" className="px-1 py-1">
            <div className="rounded-[var(--isalwa-radius-control)] px-3 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <Link
                    href={workItemHref(work.workItemId)}
                    className="isalwa-t-fast font-medium text-[var(--isalwa-kiln)] outline-none hover:text-[var(--isalwa-glaze-deep)] focus-visible:shadow-[var(--isalwa-shadow-focus)]"
                  >
                    {work.title}
                  </Link>
                  {work.description ? (
                    <p className="mt-1 line-clamp-2 text-sm text-[var(--isalwa-slate)]">
                      {work.description}
                    </p>
                  ) : null}
                  <dl className="mt-3 grid gap-1 text-sm text-[var(--isalwa-slate)] sm:grid-cols-2">
                    <div>
                      <dt className="sr-only">Asignado a</dt>
                      <dd>Asignado a {memberLabel(memberLabels, work.ownerMemberId)}</dd>
                    </div>
                    <div>
                      <dt className="sr-only">{followUp ? FOLLOW_UP_COPY.due : 'Vence'}</dt>
                      <dd className={due.overdue ? 'text-[var(--isalwa-danger)]' : undefined}>
                        {due.text}
                      </dd>
                    </div>
                    {subject ? (
                      <div>
                        <dt className="sr-only">Asunto</dt>
                        <dd>
                          Sobre: {subject}
                          {work.subjectType === 'party' && work.subjectId ? (
                            <>
                              {' · '}
                              <Link
                                href={partyHref(work.subjectId)}
                                className="text-[var(--isalwa-glaze)] hover:underline"
                              >
                                Ver cliente
                              </Link>
                            </>
                          ) : null}
                        </dd>
                      </div>
                    ) : null}
                    {work.approvalStatus !== 'none' ? (
                      <div>
                        <dt className="sr-only">Estado de aprobación</dt>
                        <dd>{formatWorkApprovalStatus(work.approvalStatus)}</dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill tone={statusToneForWork(work.status)}>
                    {statusLabel}
                  </StatusPill>
                  <StatusPill tone={priorityTone(work.priority)}>
                    {formatPriority(work.priority)}
                  </StatusPill>
                  {due.overdue ? <StatusPill tone="danger">Vencido</StatusPill> : null}
                </div>
              </div>
            </div>
          </ListRow>
        );
      })}
    </ul>
  );
}
