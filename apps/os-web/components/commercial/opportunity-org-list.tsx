import Link from 'next/link';
import { ListRow, StatusPill } from '@isalwa/ui';
import type { OpportunitySummaryReadModel } from '@isalwa/os-contracts';
import {
  formatOpportunityStatus,
  formatStage,
  statusTone,
} from '@/lib/commercial/labels';
import { opportunityHref } from '@/lib/commercial/navigation';
import { partyLabel, type PartyLabelMap } from '@/lib/commercial/party-resolver';
import { memberLabel, type MemberLabelMap } from '@/lib/work/member-resolver';

type OpportunityOrgListProps = {
  items: OpportunitySummaryReadModel[];
  memberLabels: MemberLabelMap;
  partyLabels: PartyLabelMap;
  compact?: boolean;
};

export function OpportunityOrgList({
  items,
  memberLabels,
  partyLabels,
  compact,
}: OpportunityOrgListProps) {
  return (
    <ul className="divide-y divide-[var(--isalwa-mist)]" aria-label="Oportunidades">
      {items.map((item) => (
        <ListRow key={item.opportunityId} as="li" className="px-1 py-1">
          <div className="rounded-[var(--isalwa-radius-control)] px-3 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-[var(--isalwa-slate)]">
                  {partyLabel(partyLabels, item.partyId)}
                </p>
                <Link
                  href={opportunityHref(item.partyId, item.opportunityId)}
                  className="isalwa-t-fast mt-1 block font-medium text-[var(--isalwa-kiln)] outline-none hover:text-[var(--isalwa-glaze-deep)] focus-visible:shadow-[var(--isalwa-shadow-focus)]"
                >
                  {item.title}
                </Link>
                {!compact ? (
                  <dl className="mt-3 grid gap-1 text-sm text-[var(--isalwa-slate)] sm:grid-cols-2">
                    <div>
                      <dt className="sr-only">Etapa</dt>
                      <dd>Etapa: {formatStage(item.stage)}</dd>
                    </div>
                    <div>
                      <dt className="sr-only">Responsable</dt>
                      <dd>Responsable: {memberLabel(memberLabels, item.ownerMemberId)}</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="mt-2 text-sm text-[var(--isalwa-slate)]">
                    {formatStage(item.stage)} · {memberLabel(memberLabels, item.ownerMemberId)}
                  </p>
                )}
              </div>
              <StatusPill tone={statusTone(item.status)}>
                {formatOpportunityStatus(item.status)}
              </StatusPill>
            </div>
          </div>
        </ListRow>
      ))}
    </ul>
  );
}
