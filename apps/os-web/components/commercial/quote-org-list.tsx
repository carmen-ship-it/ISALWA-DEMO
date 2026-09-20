import { OverflowMenu, StatusPill, type OperatingRowDensity } from '@isalwa/ui';
import type { QuoteSummaryReadModel } from '@isalwa/os-contracts';
import '@/components/commercial/commercial-surfaces.css';
import { OperatingScanListHeader, OperatingScanRow } from '@/components/lists/operating-scan-row';
import { formatListAge, formatQuoteStatus, statusTone } from '@/lib/commercial/labels';
import { formatCentavos } from '@/lib/commercial/money';
import { quoteHref } from '@/lib/commercial/navigation';
import { partyLabel, type PartyLabelMap } from '@/lib/commercial/party-resolver';
import { canRegisterQuoteFollowUp } from '@/lib/commercial/quote-follow-up';
import { listHref, panelHref, type ListQueryState } from '@/lib/lists/url-state';
import { FOLLOW_UP_COPY } from '@/lib/work/follow-up';
import { memberLabel, type MemberLabelMap } from '@/lib/work/member-resolver';
import { isEngineeringFixtureCopy } from '@/lib/work/staff-subject';
import { TOUR_TARGET } from '@/lib/walkthrough/targets';

type QuoteOrgListProps = {
  items: QuoteSummaryReadModel[];
  memberLabels: MemberLabelMap;
  partyLabels: PartyLabelMap;
  compact?: boolean;
  /** Leadership lists omit document amounts. Default keeps the existing quote list. */
  showAmount?: boolean;
  /** Org list context. Overflow stays off unless the owning page passes it. */
  listState?: ListQueryState;
  selectedQuoteId?: string;
  density?: OperatingRowDensity;
};

function quotePdfHref(quoteId: string): string {
  return `/api/quotes/${encodeURIComponent(quoteId)}/pdf?disposition=inline`;
}

function quickViewHref(listState: ListQueryState, quoteId: string): string {
  const panel = `quote:${quoteId}`;
  if (listState.cursor) {
    return listHref('/cotizaciones', { ...listState, panel });
  }
  return panelHref('/cotizaciones', listState, panel);
}

const DESKTOP_GRID =
  'md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,0.85fr)_4.5rem_auto_auto]';

const HEADER_COLUMNS = [
  { id: 'title', label: 'Cotización', className: 'min-w-0' },
  { id: 'client', label: 'Cliente', className: 'min-w-0' },
  { id: 'owner', label: 'Responsable', className: 'min-w-0' },
  { id: 'amount', label: 'Monto', className: 'min-w-0' },
  { id: 'age', label: 'Antigüedad', className: 'min-w-0' },
  { id: 'status', label: 'Estado', className: 'justify-self-end' },
  { id: 'action', label: '', className: 'justify-self-end' },
];

export function QuoteOrgList({
  items,
  memberLabels,
  partyLabels,
  showAmount = true,
  listState,
  selectedQuoteId,
  density = 'compact',
}: QuoteOrgListProps) {
  return (
    <div className="commercial-operating-list min-w-0" data-tour={TOUR_TARGET.quoteList}>
      <OperatingScanListHeader columns={HEADER_COLUMNS} className={DESKTOP_GRID} />
      <ul className="m-0 list-none p-0" aria-label="Cotizaciones">
        {items
          .filter(
            (item) =>
              !isEngineeringFixtureCopy(item.quoteNumber) &&
              !isEngineeringFixtureCopy(partyLabel(partyLabels, item.partyId)),
          )
          .map((item) => {
            const customer = partyLabel(partyLabels, item.partyId);
            const owner = memberLabel(memberLabels, item.ownerMemberId);
            const dateLabel = formatListAge(item.submittedAt ?? item.createdAt);
            const detailHref = quoteHref(item.partyId, item.quoteId);

            return (
              <li key={item.quoteId}>
                <OperatingScanRow
                  href={detailHref}
                  density={density}
                  selected={selectedQuoteId === item.quoteId}
                  title={item.quoteNumber}
                  desktopGridClassName={DESKTOP_GRID}
                  fields={[
                    { id: 'client', label: 'Cliente', value: customer },
                    { id: 'owner', label: 'Responsable', value: owner || '—' },
                    {
                      id: 'amount',
                      label: 'Monto',
                      value: showAmount ? formatCentavos(item.totalCentavos, item.currency) : '—',
                      hideOnMobile: true,
                    },
                    { id: 'age', label: 'Antigüedad', value: dateLabel ?? '—', hideOnMobile: true },
                  ]}
                  status={
                    <StatusPill tone={statusTone(item.status)} icon="none" data-tour={TOUR_TARGET.quoteStatus}>
                      {formatQuoteStatus(item.status)}
                    </StatusPill>
                  }
                  actionLabel="Ver cotización"
                  secondaryActions={
                    listState ? (
                      <OverflowMenu
                        label={`Más acciones de ${item.quoteNumber}`}
                        items={[
                          {
                            id: 'preview',
                            label: 'Vista rápida',
                            href: quickViewHref(listState, item.quoteId),
                          },
                          { id: 'pdf', label: 'PDF', href: quotePdfHref(item.quoteId) },
                          ...(canRegisterQuoteFollowUp(item.status)
                            ? [{ id: 'follow-up', label: FOLLOW_UP_COPY.action, href: detailHref }]
                            : []),
                        ]}
                      />
                    ) : undefined
                  }
                />
              </li>
            );
          })}
      </ul>
    </div>
  );
}
