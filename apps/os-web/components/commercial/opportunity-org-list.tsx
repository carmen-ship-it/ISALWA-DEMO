import { StatusPill, type OperatingRowDensity } from '@isalwa/ui';
import type { OpportunitySummaryReadModel } from '@isalwa/os-contracts';
import '@/components/commercial/commercial-surfaces.css';
import { OperatingScanListHeader, OperatingScanRow } from '@/components/lists/operating-scan-row';
import { formatListAge, formatOpportunityStatus, statusTone } from '@/lib/commercial/labels';
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

const DESKTOP_GRID =
  'md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,0.95fr)_4.5rem_minmax(0,1.1fr)_auto_auto]';

const HEADER_COLUMNS = [
  { id: 'title', label: 'Oportunidad', className: 'min-w-0' },
  { id: 'client', label: 'Cliente', className: 'min-w-0' },
  { id: 'owner', label: 'Responsable', className: 'min-w-0' },
  { id: 'age', label: 'Antigüedad', className: 'min-w-0' },
  { id: 'next', label: 'Próximo paso', className: 'min-w-0' },
  { id: 'status', label: 'Estado', className: 'justify-self-end' },
  { id: 'action', label: '', className: 'justify-self-end' },
];

export function OpportunityOrgList({
  items,
  memberLabels,
  partyLabels,
  linkedQuotes,
  compact = false,
  density = 'compact',
}: OpportunityOrgListProps) {
  const visible = items.filter(
    (item) =>
      !isEngineeringFixtureCopy(item.title) &&
      !isEngineeringFixtureCopy(partyLabel(partyLabels, item.partyId)),
  );

  if (compact) {
    return (
      <ul
        className="m-0 min-w-0 list-none p-0"
        aria-label="Oportunidades"
        data-tour={TOUR_TARGET.opportunityList}
        data-opportunity-list-layout="summary"
      >
        {visible.map((item) => {
          const customer = partyLabel(partyLabels, item.partyId);
          const owner = memberLabel(memberLabels, item.ownerMemberId);
          const href = opportunityHref(item.partyId, item.opportunityId);
          return (
            <li
              key={item.opportunityId}
              className="min-w-0 border-b border-[color-mix(in_srgb,var(--isalwa-mist)_80%,white)] py-3 last:border-b-0"
            >
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-semibold leading-5 text-[var(--isalwa-kiln)]">
                    {presentHumanCopy(item.title)}
                  </p>
                  <p className="mt-1 break-words text-sm text-[var(--isalwa-slate)]">{customer}</p>
                  {owner ? (
                    <p className="mt-1 text-xs text-[var(--isalwa-slate)]">Responsable · {owner}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                  <StatusPill tone={statusTone(item.status)} icon="none">
                    {formatOpportunityStatus(item.status)}
                  </StatusPill>
                  <a
                    href={href}
                    className="isalwa-t-fast inline-flex h-8 items-center rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 text-xs font-medium text-[var(--isalwa-kiln)]"
                  >
                    Ver oportunidad
                  </a>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="commercial-operating-list min-w-0" data-tour={TOUR_TARGET.opportunityList}>
      <OperatingScanListHeader columns={HEADER_COLUMNS} className={DESKTOP_GRID} />
      <ul className="m-0 list-none p-0" aria-label="Oportunidades">
        {items
          .filter(
            (item) =>
              !isEngineeringFixtureCopy(item.title) &&
              !isEngineeringFixtureCopy(partyLabel(partyLabels, item.partyId)),
          )
          .map((item) => {
            const customer = partyLabel(partyLabels, item.partyId);
            const owner = memberLabel(memberLabels, item.ownerMemberId);
            const age = formatListAge(item.createdAt);
            const linked = preferredLinkedQuote(linkedQuotes, item.opportunityId);
            const next = opportunityNextStep({
              status: item.status,
              partyId: item.partyId,
              opportunityId: item.opportunityId,
              newQuoteHref: newQuoteHref(item.partyId, item.opportunityId),
              linkedQuoteHref: linked ? quoteHref(linked.partyId || item.partyId, linked.quoteId) : null,
            });
            const nextLabel =
              next && !next.waiting && next.hrefLabel ? next.hrefLabel : next?.waiting ? 'En espera' : '—';
            const href = opportunityHref(item.partyId, item.opportunityId);

            return (
              <li key={item.opportunityId}>
                <OperatingScanRow
                  href={href}
                  density={density}
                  title={presentHumanCopy(item.title)}
                  desktopGridClassName={DESKTOP_GRID}
                  fields={[
                    { id: 'client', label: 'Cliente', value: customer },
                    { id: 'owner', label: 'Responsable', value: owner || '—' },
                    { id: 'age', label: 'Antigüedad', value: age ?? '—', hideOnMobile: true },
                    {
                      id: 'next',
                      label: 'Próximo paso',
                      value: nextLabel,
                      hideOnMobile: true,
                    },
                  ]}
                  status={
                    <StatusPill tone={statusTone(item.status)} icon="none">
                      {formatOpportunityStatus(item.status)}
                    </StatusPill>
                  }
                  actionLabel="Ver oportunidad"
                />
              </li>
            );
          })}
      </ul>
    </div>
  );
}
