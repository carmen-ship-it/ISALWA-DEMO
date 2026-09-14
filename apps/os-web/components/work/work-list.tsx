import Link from 'next/link';
import { ListRow, StatusPill } from '@isalwa/ui';
import type { WorkSummaryReadModel } from '@isalwa/os-contracts';
import { partyLabel, type PartyLabelMap } from '@/lib/commercial/party-resolver';
import { formatWorkDueLine } from '@/lib/work/due-order';
import { followUpStatusLabel, FOLLOW_UP_COPY } from '@/lib/work/follow-up';
import {
  formatPriority,
  formatSubjectType,
  formatTimestamp,
  formatWorkApprovalStatus,
  formatWorkStatus,
  statusToneForWork,
} from '@/lib/work/labels';
import { memberLabel, type MemberLabelMap } from '@/lib/work/member-resolver';
import { workItemHref } from '@/lib/work/navigation';
import { partyHref } from '@/lib/party/navigation';

type WorkListProps = {
  items: WorkSummaryReadModel[];
  memberLabels: MemberLabelMap;
  partyLabels?: PartyLabelMap;
  presentation?: 'work' | 'follow-up';
  /** Leadership lists omit approval state. They do not grant approval authority. */
  showApproval?: boolean;
};

function subjectPresentation(
  work: WorkSummaryReadModel,
  partyLabels?: PartyLabelMap,
): { label: string; href: string | null } | null {
  if (work.subjectType === 'party' && work.subjectId) {
    return {
      label: partyLabels ? partyLabel(partyLabels, work.subjectId) : 'Cliente',
      href: partyHref(work.subjectId),
    };
  }
  const subject = formatSubjectType(work.subjectType);
  if (!subject) return null;
  return { label: subject, href: null };
}

export function WorkList({
  items,
  memberLabels,
  partyLabels,
  presentation = 'work',
  showApproval = true,
}: WorkListProps) {
  const followUp = presentation === 'follow-up';
  return (
    <ul className="divide-y divide-[var(--isalwa-mist)]" aria-label={followUp ? 'Lista de seguimientos' : 'Cola de trabajo'}>
      {items.map((work) => {
        const due = formatWorkDueLine(work, {
          caption: followUp ? FOLLOW_UP_COPY.due : 'Vence',
        });
        const subject = subjectPresentation(work, partyLabels);
        const statusLabel = followUp ? followUpStatusLabel(work.status) : formatWorkStatus(work.status);
        const completedAt = formatTimestamp(work.completedAt);
        const undatedOpen = work.status === 'open' && !due.overdue && !work.dueAt;
        const notablePriority = work.priority !== 'normal';

        return (
          <ListRow key={work.workItemId} as="li" className="px-1 py-1">
            <div className="rounded-[var(--isalwa-radius-control)] px-3 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {subject ? (
                    <p className="text-sm text-[var(--isalwa-slate)]">
                      {subject.href ? (
                        <Link href={subject.href} className="text-[var(--isalwa-glaze)] hover:underline">
                          {subject.label}
                        </Link>
                      ) : (
                        subject.label
                      )}
                    </p>
                  ) : null}
                  <Link
                    href={workItemHref(work.workItemId)}
                    className="isalwa-t-fast mt-1 block font-medium text-[var(--isalwa-kiln)] outline-none hover:text-[var(--isalwa-glaze-deep)] focus-visible:shadow-[var(--isalwa-shadow-focus)]"
                  >
                    <span className="sr-only">{followUp ? `${FOLLOW_UP_COPY.nextAction}: ` : 'Próxima acción: '}</span>
                    {work.title}
                  </Link>
                  {work.description ? (
                    <p className="mt-2 line-clamp-2 text-sm text-[var(--isalwa-slate)]">
                      {work.description}
                    </p>
                  ) : null}
                  <dl className="mt-3 grid gap-1 text-sm text-[var(--isalwa-slate)] sm:grid-cols-2">
                    <div>
                      <dt className="sr-only">Responsable</dt>
                      <dd>Responsable: {memberLabel(memberLabels, work.ownerMemberId)}</dd>
                    </div>
                    <div>
                      <dt className="sr-only">{followUp ? FOLLOW_UP_COPY.due : 'Fecha'}</dt>
                      <dd>{due.text}</dd>
                    </div>
                    {completedAt ? (
                      <div>
                        <dt className="sr-only">Completado</dt>
                        <dd>Completado: {completedAt}</dd>
                      </div>
                    ) : null}
                    {notablePriority ? (
                      <div>
                        <dt className="sr-only">Prioridad</dt>
                        <dd>Prioridad: {formatPriority(work.priority)}</dd>
                      </div>
                    ) : null}
                    {showApproval && work.approvalStatus !== 'none' ? (
                      <div>
                        <dt className="sr-only">Estado de aprobación</dt>
                        <dd>{formatWorkApprovalStatus(work.approvalStatus)}</dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill tone={statusToneForWork(work.status)}>{statusLabel}</StatusPill>
                  {due.overdue ? <StatusPill tone="danger">Vencido</StatusPill> : null}
                  {undatedOpen ? <StatusPill tone="neutral">Sin fecha</StatusPill> : null}
                </div>
              </div>
            </div>
          </ListRow>
        );
      })}
    </ul>
  );
}
