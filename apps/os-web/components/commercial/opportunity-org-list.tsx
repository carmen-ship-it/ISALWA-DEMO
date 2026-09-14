import { OperatingRow, StatusPill } from '@isalwa/ui';
import type { OpportunitySummaryReadModel } from '@isalwa/os-contracts';
import { formatOpportunityStatus, formatStage, statusTone } from '@/lib/commercial/labels';
import { opportunityHref } from '@/lib/commercial/navigation';
import { partyLabel, type PartyLabelMap } from '@/lib/commercial/party-resolver';
import { memberLabel, type MemberLabelMap } from '@/lib/work/member-resolver';
import { isEngineeringFixtureCopy } from '@/lib/work/staff-subject';
import { TOUR_TARGET } from '@/lib/walkthrough/targets';

type OpportunityOrgListProps = {
  items: OpportunitySummaryReadModel[];
  memberLabels: MemberLabelMap;
  partyLabels: PartyLabelMap;
  compact?: boolean;
};

function metaLine(parts: Array<string | null | undefined>): string {
  return parts.filter((part): part is string => Boolean(part && part.trim())).join(' · ');
}

export function OpportunityOrgList({
  items,
  memberLabels,
  partyLabels,
}: OpportunityOrgListProps) {
  return (
    <ul className="min-w-0" aria-label="Oportunidades" data-tour={TOUR_TARGET.opportunityList}>
      {items
        .filter(
          (item) =>
            !isEngineeringFixtureCopy(item.title) &&
            !isEngineeringFixtureCopy(partyLabel(partyLabels, item.partyId)),
        )
        .map((item) => {
          const customer = partyLabel(partyLabels, item.partyId);
          const owner = memberLabel(memberLabels, item.ownerMemberId);
          const stage = formatStage(item.stage).trim();
          return (
            <li key={item.opportunityId}>
              <OperatingRow
                href={opportunityHref(item.partyId, item.opportunityId)}
                subject={item.title}
                meta={metaLine([customer, stage, owner ? `Responsable: ${owner}` : null]) || undefined}
                status={
                  <StatusPill tone={statusTone(item.status)}>
                    {formatOpportunityStatus(item.status)}
                  </StatusPill>
                }
              />
            </li>
          );
        })}
    </ul>
  );
}
