import { OperatingRow, OverflowMenu, StatusPill, type OperatingRowDensity } from '@isalwa/ui';
import type { QuoteSummaryReadModel } from '@isalwa/os-contracts';
import '@/components/commercial/commercial-surfaces.css';
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

function metaLine(parts: Array<string | null | undefined>): string {
  return parts.filter((part): part is string => Boolean(part && part.trim())).join(' · ');
}

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
    <ul
      className="commercial-operating-list min-w-0"
      aria-label="Cotizaciones"
      data-tour={TOUR_TARGET.quoteList}
    >
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
          const meta = metaLine([
            customer,
            showAmount ? formatCentavos(item.totalCentavos, item.currency) : null,
            owner ? `Responsable: ${owner}` : null,
            dateLabel,
          ]);

          return (
            <li key={item.quoteId}>
              <OperatingRow
                href={detailHref}
                density={density}
                selected={selectedQuoteId === item.quoteId}
                subject={item.quoteNumber}
                meta={meta || undefined}
                status={
                  <StatusPill tone={statusTone(item.status)} data-tour={TOUR_TARGET.quoteStatus}>{formatQuoteStatus(item.status)}</StatusPill>
                }
                actions={
                  listState ? (
                    <OverflowMenu
                      label={`Acciones de ${item.quoteNumber}`}
                      items={[
                        { id: 'open', label: 'Abrir', href: detailHref },
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
  );
}
