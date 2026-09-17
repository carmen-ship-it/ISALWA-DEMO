import Link from 'next/link';
import type { ApprovalSummaryReadModel } from '@isalwa/os-contracts';
import { Button, StatusPill, cx } from '@isalwa/ui';
import { APPROVAL_ROW_SUBJECT_FALLBACK } from '@/lib/work/approval-row-subject';
import { formatApprovalStatus, statusToneForApproval } from '@/lib/work/labels';
import { memberLabel, type MemberLabelMap } from '@/lib/work/member-resolver';
import { approvalHref } from '@/lib/work/navigation';

type ApprovalPendingCardsProps = {
  items: ApprovalSummaryReadModel[];
  memberLabels: MemberLabelMap;
  subjects?: Map<string, string>;
};

const cardClass =
  'rounded-lg border border-[color-mix(in_srgb,var(--isalwa-warning)_22%,var(--isalwa-mist))] bg-white p-5 shadow-[var(--isalwa-shadow-soft)]';

export function ApprovalPendingCards({ items, memberLabels, subjects }: ApprovalPendingCardsProps) {
  return (
    <ul className="grid min-w-0 gap-4" aria-label="Aprobaciones pendientes">
      {items.map((approval) => {
        const detailHref = approvalHref(approval.approvalRequestId);
        const subject = subjects?.get(approval.approvalRequestId) ?? APPROVAL_ROW_SUBJECT_FALLBACK;
        const requester = memberLabel(memberLabels, approval.requestedByMemberId);
        return (
          <li key={approval.approvalRequestId} className={cx(cardClass, 'border-l-4 border-l-[var(--isalwa-warning)]')}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--isalwa-kiln)]">{subject}</p>
                <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
                  Solicitado por {requester}
                  {approval.decisionReason?.trim() ? ` · ${approval.decisionReason.trim()}` : null}
                </p>
              </div>
              <StatusPill tone={statusToneForApproval(approval.status)}>
                {formatApprovalStatus(approval.status)}
              </StatusPill>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={detailHref} className="inline-flex">
                <Button type="button" variant="primary" size="sm">
                  Aprobar
                </Button>
              </Link>
              <Link href={detailHref} className="inline-flex">
                <Button type="button" variant="secondary" size="sm">
                  Rechazar
                </Button>
              </Link>
              <Link
                href={detailHref}
                className="inline-flex h-8 items-center px-3 text-sm font-medium text-[var(--isalwa-glaze)] hover:underline"
              >
                Ver registro
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
