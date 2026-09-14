import Link from 'next/link';
import { ListRow, StatusPill } from '@isalwa/ui';
import type { ApprovalSummaryReadModel } from '@isalwa/os-contracts';
import {
  approvalSubjectLabel,
  formatApprovalStatus,
  formatSubjectType,
  formatTimestamp,
  statusToneForApproval,
} from '@/lib/work/labels';
import { memberLabel, type MemberLabelMap } from '@/lib/work/member-resolver';
import { approvalHref } from '@/lib/work/navigation';

type ApprovalListProps = {
  items: ApprovalSummaryReadModel[];
  memberLabels: MemberLabelMap;
  readOnly?: boolean;
};

export function ApprovalList({ items, memberLabels, readOnly = true }: ApprovalListProps) {
  return (
    <ul className="divide-y divide-[var(--isalwa-mist)]" aria-label="Lista de aprobaciones">
      {items.map((approval) => {
        const decidedAt = formatTimestamp(approval.decidedAt);
        const subject = formatSubjectType(approval.subjectType);
        return (
          <ListRow key={approval.approvalRequestId} as="li" className="px-1 py-1">
            <Link
              href={approvalHref(approval.approvalRequestId)}
              className="isalwa-t-fast block rounded-[var(--isalwa-radius-control)] px-3 py-3 outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[var(--isalwa-kiln)]">
                    {approvalSubjectLabel(approval)}
                  </p>
                  <dl className="mt-3 grid gap-1 text-sm text-[var(--isalwa-slate)] sm:grid-cols-2">
                    <div>
                      <dt className="sr-only">Solicitado por</dt>
                      <dd>
                        Solicitado por{' '}
                        {memberLabel(memberLabels, approval.requestedByMemberId)}
                      </dd>
                    </div>
                    <div>
                      <dt className="sr-only">Aprobador</dt>
                      <dd>
                        Aprobador: {memberLabel(memberLabels, approval.approverMemberId)}
                      </dd>
                    </div>
                    {subject ? (
                      <div>
                        <dt className="sr-only">Contexto</dt>
                        <dd>Contexto: {subject}</dd>
                      </div>
                    ) : null}
                    {approval.workItemId ? (
                      <div>
                        <dt className="sr-only">Trabajo vinculado</dt>
                        <dd>Trabajo vinculado</dd>
                      </div>
                    ) : null}
                    {decidedAt ? (
                      <div>
                        <dt className="sr-only">Decisión</dt>
                        <dd>Decidido: {decidedAt}</dd>
                      </div>
                    ) : null}
                  </dl>
                  {readOnly && approval.status === 'pending' ? (
                    <p className="mt-3 text-xs text-[var(--isalwa-slate)]">
                      Abra la solicitud para registrar la decisión.
                    </p>
                  ) : null}
                </div>
                <StatusPill tone={statusToneForApproval(approval.status)}>
                  {formatApprovalStatus(approval.status)}
                </StatusPill>
              </div>
            </Link>
          </ListRow>
        );
      })}
    </ul>
  );
}
