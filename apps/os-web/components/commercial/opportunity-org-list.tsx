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

function customerLine(name: string): string {
  return name === 'Cliente' ? 'Cliente' : `Cliente · ${name}`;
}

export function OpportunityOrgList({
  items,
  memberLabels,
  partyLabels,
  compact,
}: OpportunityOrgListProps) {
  return (
    <ul className="min-w-0" aria-label="Oportunidades">
      {items.map((item) => {
        const customer = partyLabel(partyLabels, item.partyId);
        const owner = memberLabel(memberLabels, item.ownerMemberId);
        return (
          <ListRow key={item.opportunityId} as="li">
            <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm text-[var(--isalwa-slate)]">{customerLine(customer)}</p>
                <Link
                  href={opportunityHref(item.partyId, item.opportunityId)}
                  className="isalwa-t-fast mt-1 block break-words font-medium text-[var(--isalwa-glaze)] outline-none hover:text-[var(--isalwa-glaze-deep)] hover:underline focus-visible:shadow-[var(--isalwa-shadow-focus)]"
                >
                  {item.title}
                </Link>
                {compact ? (
                  <p className="mt-1 break-words text-sm text-[var(--isalwa-slate)]">
                    {formatStage(item.stage)} · Responsable · {owner}
                  </p>
                ) : (
                  <dl className="mt-3 grid min-w-0 gap-1 text-sm text-[var(--isalwa-slate)] sm:grid-cols-2">
                    <div className="min-w-0">
                      <dt className="sr-only">Etapa</dt>
                      <dd className="break-words">Etapa: {formatStage(item.stage)}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="sr-only">Responsable</dt>
                      <dd className="break-words">Responsable: {owner}</dd>
                    </div>
                  </dl>
                )}
              </div>
              <StatusPill tone={statusTone(item.status)} className="shrink-0">
                {formatOpportunityStatus(item.status)}
              </StatusPill>
            </div>
          </ListRow>
        );
      })}
    </ul>
  );
}
