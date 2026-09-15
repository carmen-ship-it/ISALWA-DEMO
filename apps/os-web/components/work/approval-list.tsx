import { OperatingRow, StatusPill } from '@isalwa/ui';
import type { ApprovalSummaryReadModel } from '@isalwa/os-contracts';
import { OperatingListFrame } from '@/components/lists/operating-list-frame';
import type { ListDensity } from '@/lib/productivity/list-controls';
import { APPROVAL_ROW_SUBJECT_FALLBACK } from '@/lib/work/approval-row-subject';
import { formatApprovalStatus, statusToneForApproval } from '@/lib/work/labels';
import { memberLabel, type MemberLabelMap } from '@/lib/work/member-resolver';
import { approvalHref } from '@/lib/work/navigation';

type ApprovalListProps = {
  items: ApprovalSummaryReadModel[];
  memberLabels: MemberLabelMap;
  subjects?: Map<string, string>;
  density?: ListDensity;
  showHeader?: boolean;
};

const APPROVAL_COLUMNS = [
  { id: 'subject', label: 'Solicitud', className: 'min-w-0 flex-1' },
  { id: 'status', label: 'Estado', className: 'shrink-0' },
];

export function ApprovalList({
  items,
  memberLabels,
  subjects,
  density = 'compact',
  showHeader = false,
}: ApprovalListProps) {
  const list = (
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
              density={density}
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

  if (!showHeader) return list;

  return (
    <OperatingListFrame
      density={density}
      columns={APPROVAL_COLUMNS}
      label="Bandeja de aprobaciones"
    >
      {list}
    </OperatingListFrame>
  );
}
