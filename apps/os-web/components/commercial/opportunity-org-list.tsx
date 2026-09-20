import { OperatingRow, StatusPill, type OperatingRowDensity } from '@isalwa/ui';
import type { OpportunitySummaryReadModel } from '@isalwa/os-contracts';
import '@/components/commercial/commercial-surfaces.css';
import { formatListAge, formatOpportunityStatus, presentStage, statusTone } from '@/lib/commercial/labels';
import { newQuoteHref, opportunityHref, quoteHref } from '@/lib/commercial/navigation';
import { opportunityNextStep, preferredLinkedQuote, type OpportunityLinkedQuote } from '@/lib/commercial/next-step';
import { partyLabel, type PartyLabelMap } from '@/lib/commercial/party-resolver';
import { presentHumanCopy } from '@/lib/demo/human-facing-copy';
import { memberLabel, type MemberLabelMap } from '@/lib/work/member-resolver';
import { isEngineeringFixtureCopy } from '@/lib/work/staff-subject';
import { TOUR_TARGET } from '@/lib/walkthrough/targets';

type OpportunityOrgListProps = {
  items: OpportunitySummaryReadModel[];
  memberLabels: MemberLabelMap;
  partyLabels: PartyLabelMap;
  compact?: boolean;
  /** Quotes already loaded beside these opportunities. Not a new opportunity field. */
  linkedQuotes?: readonly OpportunityLinkedQuote[];
  density?: OperatingRowDensity;
};

function metaLine(parts: Array<string | null | undefined>): string {
  return parts.filter((part): part is string => Boolean(part && part.trim())).join(' · ');
}

export function OpportunityOrgList({
  items,
  memberLabels,
  partyLabels,
  linkedQuotes,
  density = 'compact',
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
          const stage = item.stage.trim() ? presentStage(item.stage) : null;
          const age = formatListAge(item.createdAt);
          const linked = preferredLinkedQuote(linkedQuotes, item.opportunityId);
          const next = opportunityNextStep({
            status: item.status,
            partyId: item.partyId,
            opportunityId: item.opportunityId,
            newQuoteHref: newQuoteHref(item.partyId, item.opportunityId),
            linkedQuoteHref: linked ? quoteHref(linked.partyId || item.partyId, linked.quoteId) : null,
          });
          return (
            <li key={item.opportunityId}>
              <OperatingRow
                href={opportunityHref(item.partyId, item.opportunityId)}
                density={density}
                subject={presentHumanCopy(item.title)}
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
