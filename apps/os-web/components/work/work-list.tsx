import { StatusPill, cx } from '@isalwa/ui';
import type { WorkSummaryReadModel } from '@isalwa/os-contracts';
import { OperatingScanListHeader, OperatingScanRow } from '@/components/lists/operating-scan-row';
import { partyLabel, type PartyLabelMap } from '@/lib/commercial/party-resolver';
import type { ListDensity } from '@/lib/productivity/list-controls';
import { formatWorkDueLine } from '@/lib/work/due-order';
import { workDueRailClass, workDueVisualTone } from '@/lib/work/due-visual';
import { followUpStatusLabel, FOLLOW_UP_COPY } from '@/lib/work/follow-up';
import {
  formatWorkApprovalStatus,
  formatWorkStatus,
  statusToneForWork,
} from '@/lib/work/labels';
import { memberLabel, type MemberLabelMap } from '@/lib/work/member-resolver';
import { workItemHref } from '@/lib/work/navigation';
import { isEngineeringFixtureCopy, staffFacingSubject } from '@/lib/work/staff-subject';
import {
  PURCHASING_RESULT_STATUS,
  PURCHASING_RESULT_TITLE,
  isPurchasingResultWork,
} from '@/lib/purchasing/resolve-review-copy';
import { TOUR_TARGET } from '@/lib/walkthrough/targets';

type WorkListProps = {
  items: WorkSummaryReadModel[];
  memberLabels: MemberLabelMap;
  partyLabels?: PartyLabelMap;
  presentation?: 'work' | 'follow-up';
  /** Leadership lists omit approval state. They do not grant approval authority. */
  showApproval?: boolean;
  density?: ListDensity;
  showHeader?: boolean;
};

const DESKTOP_GRID =
  'md:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)_minmax(0,0.95fr)_5.5rem_auto_auto]';

const WORK_HEADER_COLUMNS = [
  { id: 'subject', label: 'Asunto', className: 'min-w-0' },
  { id: 'client', label: 'Cliente / pedido', className: 'min-w-0' },
  { id: 'owner', label: 'Responsable', className: 'min-w-0' },
  { id: 'date', label: 'Fecha', className: 'min-w-0' },
  { id: 'status', label: 'Estado', className: 'justify-self-end' },
  { id: 'action', label: '', className: 'justify-self-end' },
];

function partyCustomer(work: WorkSummaryReadModel, partyLabels?: PartyLabelMap): string | null {
  if (work.subjectType !== 'party' || !work.subjectId || !partyLabels) return null;
  const name = partyLabel(partyLabels, work.subjectId);
  if (!name || name === 'Cliente' || isEngineeringFixtureCopy(name)) return null;
  return name;
}

function clientOrderLabel(work: WorkSummaryReadModel, customer: string | null): string {
  if (customer) return customer;
  if (work.subjectType === 'order') return 'Pedido';
  if (work.subjectType === 'quote') return 'Cotización';
  return '—';
}

export function WorkList({
  items,
  memberLabels,
  partyLabels,
  presentation = 'work',
  showApproval = true,
  density = 'compact',
  showHeader = false,
}: WorkListProps) {
  const followUp = presentation === 'follow-up';
  const visible = items.filter((work) => !isEngineeringFixtureCopy(work.title));

  const rows = (
    <ul
      className="min-w-0 divide-y divide-[var(--isalwa-mist)]"
      aria-label={followUp ? 'Lista de seguimientos' : 'Cola de trabajo'}
      data-tour={TOUR_TARGET.workList}
    >
      {visible.map((work) => {
          const due = formatWorkDueLine(work, {
            caption: followUp ? FOLLOW_UP_COPY.due : 'Vence',
          });
          const customer = partyCustomer(work, partyLabels);
          const purchasingReturn = isPurchasingResultWork(work);
          const displayTitle = purchasingReturn
            ? PURCHASING_RESULT_TITLE
            : staffFacingSubject({
                title: work.title,
                description: work.description,
                subjectType: work.subjectType,
                customerName: customer,
              });
          if (!displayTitle || displayTitle === 'Vencido' || isEngineeringFixtureCopy(displayTitle)) {
            return null;
          }

          const owner = memberLabel(memberLabels, work.ownerMemberId);
          const statusLabel = purchasingReturn && work.status === 'open'
            ? PURCHASING_RESULT_STATUS
            : followUp
              ? followUpStatusLabel(work.status)
              : formatWorkStatus(work.status);
          const approvalNote =
            showApproval && work.approvalStatus !== 'none'
              ? formatWorkApprovalStatus(work.approvalStatus)
              : null;
          const titleWithNote = approvalNote ? `${displayTitle} · ${approvalNote}` : displayTitle;

          const dueTone = workDueVisualTone(work);
          const rail = workDueRailClass(dueTone);
          const href = workItemHref(work.workItemId);

          return (
            <li key={work.workItemId} className={cx('list-none', rail)}>
              <OperatingScanRow
                href={href}
                density={density}
                title={titleWithNote}
                desktopGridClassName={DESKTOP_GRID}
                fields={[
                  {
                    id: 'client',
                    label: 'Cliente / pedido',
                    value: clientOrderLabel(work, customer),
                  },
                  { id: 'owner', label: 'Responsable', value: owner || '—' },
                  { id: 'date', label: 'Fecha', value: due.text, hideOnMobile: true },
                ]}
                status={
                  <StatusPill tone={statusToneForWork(work.status)} icon="none">
                    {statusLabel}
                  </StatusPill>
                }
                actionLabel="Ver trabajo"
              />
            </li>
          );
        })}
    </ul>
  );

  if (!showHeader) return rows;

  return (
    <div className="overflow-x-clip bg-white" aria-label={followUp ? 'Lista de seguimientos' : 'Cola de trabajo'}>
      <OperatingScanListHeader columns={WORK_HEADER_COLUMNS} className={DESKTOP_GRID} />
      {rows}
    </div>
  );
}
