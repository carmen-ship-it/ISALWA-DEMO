import { OperatingRow, StatusPill } from '@isalwa/ui';
import type { WorkSummaryReadModel } from '@isalwa/os-contracts';
import { partyLabel, type PartyLabelMap } from '@/lib/commercial/party-resolver';
import { formatWorkDueLine } from '@/lib/work/due-order';
import { followUpStatusLabel, FOLLOW_UP_COPY } from '@/lib/work/follow-up';
import {
  formatWorkApprovalStatus,
  formatWorkStatus,
  statusToneForWork,
} from '@/lib/work/labels';
import { memberLabel, type MemberLabelMap } from '@/lib/work/member-resolver';
import { workItemHref } from '@/lib/work/navigation';
import { isEngineeringFixtureCopy, staffFacingSubject } from '@/lib/work/staff-subject';

type WorkListProps = {
  items: WorkSummaryReadModel[];
  memberLabels: MemberLabelMap;
  partyLabels?: PartyLabelMap;
  presentation?: 'work' | 'follow-up';
  /** Leadership lists omit approval state. They do not grant approval authority. */
  showApproval?: boolean;
};

function partyCustomer(work: WorkSummaryReadModel, partyLabels?: PartyLabelMap): string | null {
  if (work.subjectType !== 'party' || !work.subjectId || !partyLabels) return null;
  const name = partyLabel(partyLabels, work.subjectId);
  if (!name || name === 'Cliente' || isEngineeringFixtureCopy(name)) return null;
  return name;
}

export function WorkList({
  items,
  memberLabels,
  partyLabels,
  presentation = 'work',
  showApproval = true,
}: WorkListProps) {
  const followUp = presentation === 'follow-up';
  const visible = items.filter((work) => !isEngineeringFixtureCopy(work.title));

  return (
    <ul className="min-w-0 divide-y divide-[var(--isalwa-mist)]" aria-label={followUp ? 'Lista de seguimientos' : 'Cola de trabajo'}>
      {visible.map((work) => {
        const due = formatWorkDueLine(work, {
          caption: followUp ? FOLLOW_UP_COPY.due : 'Vence',
        });
        const customer = partyCustomer(work, partyLabels);
        const displayTitle = staffFacingSubject({
          title: work.title,
          description: work.description,
          subjectType: work.subjectType,
          customerName: customer,
        });
        if (!displayTitle || displayTitle === 'Vencido' || isEngineeringFixtureCopy(displayTitle)) return null;

        const owner = memberLabel(memberLabels, work.ownerMemberId);
        const statusLabel = followUp ? followUpStatusLabel(work.status) : formatWorkStatus(work.status);
        const meta = [
          customer,
          `Responsable: ${owner}`,
          due.text,
          showApproval && work.approvalStatus !== 'none'
            ? formatWorkApprovalStatus(work.approvalStatus)
            : null,
        ]
          .filter((part): part is string => Boolean(part))
          .join(' · ');

        return (
          <li key={work.workItemId} className="list-none">
            <OperatingRow
              href={workItemHref(work.workItemId)}
              subject={
                <>
                  <span className="sr-only">
                    {followUp ? `${FOLLOW_UP_COPY.nextAction}: ` : 'Próxima acción: '}
                  </span>
                  {displayTitle}
                </>
              }
              meta={meta}
              status={<StatusPill tone={statusToneForWork(work.status)}>{statusLabel}</StatusPill>}
            />
          </li>
        );
      })}
    </ul>
  );
}
