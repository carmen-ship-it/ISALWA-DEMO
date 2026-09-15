import { OperatingRow, StatusPill } from '@isalwa/ui';
import type { OpportunitySummaryReadModel } from '@isalwa/os-contracts';
import '@/components/commercial/commercial-surfaces.css';
import { formatListAge, formatOpportunityStatus, formatStage, statusTone } from '@/lib/commercial/labels';
import { newQuoteHref, opportunityHref } from '@/lib/commercial/navigation';
import { opportunityNextStep } from '@/lib/commercial/next-step';
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
    <ul
      className="commercial-operating-list min-w-0"
      aria-label="Oportunidades"
      data-tour={TOUR_TARGET.opportunityList}
    >
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
          const age = formatListAge(item.createdAt);
          const next = opportunityNextStep({
            status: item.status,
            partyId: item.partyId,
            opportunityId: item.opportunityId,
            newQuoteHref: newQuoteHref(item.partyId, item.opportunityId),
          });
          return (
            <li key={item.opportunityId}>
              <OperatingRow
                href={opportunityHref(item.partyId, item.opportunityId)}
                subject={item.title}
                meta={
                  metaLine([
                    customer,
                    stage,
                    owner ? `Responsable: ${owner}` : null,
                    age,
                    next && !next.waiting && next.hrefLabel ? `Próximo: ${next.hrefLabel}` : null,
                  ]) || undefined
                }
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
