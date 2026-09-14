import Link from 'next/link';
import { ListRow, StatusPill } from '@isalwa/ui';
import type { QuoteSummaryReadModel } from '@isalwa/os-contracts';
import {
  formatQuoteStatus,
  formatTimestamp,
  statusTone,
} from '@/lib/commercial/labels';
import { formatCentavos } from '@/lib/commercial/money';
import { quoteHref } from '@/lib/commercial/navigation';
import { partyLabel, type PartyLabelMap } from '@/lib/commercial/party-resolver';
import { memberLabel, type MemberLabelMap } from '@/lib/work/member-resolver';

type QuoteOrgListProps = {
  items: QuoteSummaryReadModel[];
  memberLabels: MemberLabelMap;
  partyLabels: PartyLabelMap;
  compact?: boolean;
  /** Leadership lists omit document amounts. Default keeps the existing quote list. */
  showAmount?: boolean;
};

export function QuoteOrgList({
  items,
  memberLabels,
  partyLabels,
  compact,
  showAmount = true,
}: QuoteOrgListProps) {
  return (
    <ul className="divide-y divide-[var(--isalwa-mist)]" aria-label="Cotizaciones">
      {items.map((item) => {
        const dateLabel = formatTimestamp(item.submittedAt ?? item.createdAt);
        return (
          <ListRow key={item.quoteId} as="li" className="px-1 py-1">
            <div className="rounded-[var(--isalwa-radius-control)] px-3 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[var(--isalwa-slate)]">
                    {partyLabel(partyLabels, item.partyId)}
                  </p>
                  <Link
                    href={quoteHref(item.partyId, item.quoteId)}
                    className="isalwa-t-fast mt-1 block font-medium text-[var(--isalwa-kiln)] outline-none hover:text-[var(--isalwa-glaze-deep)] focus-visible:shadow-[var(--isalwa-shadow-focus)]"
                  >
                    {item.quoteNumber}
                  </Link>
                  {!compact ? (
                    <dl className="mt-3 grid gap-1 text-sm text-[var(--isalwa-slate)] sm:grid-cols-2">
                      {showAmount ? (
                        <div>
                          <dt className="sr-only">Total</dt>
                          <dd>Total: {formatCentavos(item.totalCentavos, item.currency)}</dd>
                        </div>
                      ) : null}
                      <div>
                        <dt className="sr-only">Fecha</dt>
                        <dd>Fecha: {dateLabel}</dd>
                      </div>
                      <div>
                        <dt className="sr-only">Responsable</dt>
                        <dd>Responsable: {memberLabel(memberLabels, item.ownerMemberId)}</dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="mt-2 text-sm text-[var(--isalwa-slate)]">
                      {showAmount
                        ? `${formatCentavos(item.totalCentavos, item.currency)}${dateLabel ? ` · ${dateLabel}` : ''}`
                        : `${memberLabel(memberLabels, item.ownerMemberId)}${dateLabel ? ` · ${dateLabel}` : ''}`}
                    </p>
                  )}
                </div>
                <StatusPill tone={statusTone(item.status)}>
                  {formatQuoteStatus(item.status)}
                </StatusPill>
              </div>
            </div>
          </ListRow>
        );
      })}
    </ul>
  );
}
