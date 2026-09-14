import { OperatingRow, StatusPill } from '@isalwa/ui';
import type { ApprovalSummaryReadModel } from '@isalwa/os-contracts';
import { APPROVAL_ROW_SUBJECT_FALLBACK } from '@/lib/work/approval-row-subject';
import { formatApprovalStatus, statusToneForApproval } from '@/lib/work/labels';
import { memberLabel, type MemberLabelMap } from '@/lib/work/member-resolver';
import { approvalHref } from '@/lib/work/navigation';

type ApprovalListProps = {
  items: ApprovalSummaryReadModel[];
  memberLabels: MemberLabelMap;
  subjects?: Map<string, string>;
};

export function ApprovalList({ items, memberLabels, subjects }: ApprovalListProps) {
  return (
    <ul className="min-w-0 divide-y divide-[var(--isalwa-mist)]" aria-label="Bandeja de aprobaciones">
      {items.map((approval) => {
        const subject = subjects?.get(approval.approvalRequestId) ?? APPROVAL_ROW_SUBJECT_FALLBACK;
        const meta = [
          `Solicitado por ${memberLabel(memberLabels, approval.requestedByMemberId)}`,
          `Aprobador: ${memberLabel(memberLabels, approval.approverMemberId)}`,
        ].join(' · ');

        return (
          <li key={approval.approvalRequestId} className="list-none">
            <OperatingRow
              href={approvalHref(approval.approvalRequestId)}
              subject={subject}
              meta={meta}
              status={
                <StatusPill tone={statusToneForApproval(approval.status)}>
                  {formatApprovalStatus(approval.status)}
                </StatusPill>
              }
            />
          </li>
        );
      })}
    </ul>
  );
}
