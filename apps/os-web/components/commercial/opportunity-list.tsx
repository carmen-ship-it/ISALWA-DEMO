import { StatusPill } from '@isalwa/ui';
import type { OpportunitySummaryReadModel } from '@isalwa/os-contracts';
import { OperatingScanListHeader, OperatingScanRow } from '@/components/lists/operating-scan-row';
import {
  formatListAge,
  formatOpportunityStatus,
  presentStage,
  statusTone,
} from '@/lib/commercial/labels';
import { formatOptionalCentavos } from '@/lib/commercial/money';
import { opportunityHref, newQuoteHref, quoteHref } from '@/lib/commercial/navigation';
import { presentHumanCopy } from '@/lib/demo/human-facing-copy';
import { opportunityNextStep, preferredLinkedQuote, type OpportunityLinkedQuote } from '@/lib/commercial/next-step';
import { memberLabel, type MemberLabelMap } from '@/lib/work/member-resolver';
import { TOUR_TARGET } from '@/lib/walkthrough/targets';

type OpportunityListProps = {
  partyId: string;
  items: OpportunitySummaryReadModel[];
  memberLabels: MemberLabelMap;
  /** Quotes already loaded for this customer. Not a new opportunity field. */
  linkedQuotes?: readonly OpportunityLinkedQuote[];
};

const DESKTOP_GRID =
  'md:grid-cols-[minmax(0,1.35fr)_minmax(0,0.95fr)_4.5rem_minmax(0,1fr)_auto_auto]';

const HEADER_COLUMNS = [
  { id: 'title', label: 'Oportunidad', className: 'min-w-0' },
  { id: 'owner', label: 'Responsable', className: 'min-w-0' },
  { id: 'age', label: 'Antigüedad', className: 'min-w-0' },
  { id: 'next', label: 'Próximo paso', className: 'min-w-0' },
  { id: 'status', label: 'Estado', className: 'justify-self-end' },
  { id: 'action', label: '', className: 'justify-self-end' },
];

export function OpportunityList({ partyId, items, memberLabels, linkedQuotes }: OpportunityListProps) {
  return (
    <div className="min-w-0" data-tour={TOUR_TARGET.opportunityList}>
      <OperatingScanListHeader columns={HEADER_COLUMNS} className={DESKTOP_GRID} />
      <ul className="m-0 list-none divide-y divide-[var(--isalwa-mist)] p-0" aria-label="Oportunidades">
        {items.map((item) => {
          const value = formatOptionalCentavos(item.expectedValueCentavos ?? undefined, 'BOB');
          const age = formatListAge(item.createdAt);
          const linked = preferredLinkedQuote(linkedQuotes, item.opportunityId);
          const next = opportunityNextStep({
            status: item.status,
            partyId,
            opportunityId: item.opportunityId,
            newQuoteHref: newQuoteHref(partyId, item.opportunityId),
            linkedQuoteHref: linked ? quoteHref(linked.partyId || partyId, linked.quoteId) : null,
          });
          const nextLabel =
            next && !next.waiting && next.hrefLabel ? next.hrefLabel : next?.waiting ? 'En espera' : '—';
          const href = opportunityHref(partyId, item.opportunityId);
          const owner = memberLabel(memberLabels, item.ownerMemberId);

          return (
            <li key={item.opportunityId}>
              <OperatingScanRow
                href={href}
                title={presentHumanCopy(item.title)}
                desktopGridClassName={DESKTOP_GRID}
                fields={[
                  { id: 'owner', label: 'Responsable', value: owner || '—' },
                  { id: 'age', label: 'Antigüedad', value: age ?? '—', hideOnMobile: true },
                  {
                    id: 'next',
                    label: 'Próximo paso',
                    value: value
                      ? `${presentStage(item.stage)} · ${nextLabel} · ${value}`
                      : `${presentStage(item.stage)} · ${nextLabel}`,
                    hideOnMobile: true,
                  },
                ]}
                status={
                  <StatusPill tone={statusTone(item.status)} icon="none">
                    {formatOpportunityStatus(item.status)}
                  </StatusPill>
                }
                actionLabel="Abrir"
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
