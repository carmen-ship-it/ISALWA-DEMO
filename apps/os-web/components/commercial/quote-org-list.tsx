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

function customerLine(name: string): string {
  return name === 'Cliente' ? 'Cliente' : `Cliente · ${name}`;
}

export function QuoteOrgList({
  items,
  memberLabels,
  partyLabels,
  compact,
  showAmount = true,
}: QuoteOrgListProps) {
  return (
    <ul className="min-w-0" aria-label="Cotizaciones">
      {items.map((item) => {
        const dateLabel = formatTimestamp(item.submittedAt ?? item.createdAt);
        const customer = partyLabel(partyLabels, item.partyId);
        const owner = memberLabel(memberLabels, item.ownerMemberId);
        const compactFacts = [
          `Responsable · ${owner}`,
          showAmount ? formatCentavos(item.totalCentavos, item.currency) : null,
          dateLabel || null,
        ].filter((part): part is string => Boolean(part));

        return (
          <ListRow key={item.quoteId} as="li">
            <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm text-[var(--isalwa-slate)]">{customerLine(customer)}</p>
                <Link
                  href={quoteHref(item.partyId, item.quoteId)}
                  className="isalwa-t-fast mt-1 block break-words font-medium text-[var(--isalwa-glaze)] outline-none hover:text-[var(--isalwa-glaze-deep)] hover:underline focus-visible:shadow-[var(--isalwa-shadow-focus)]"
                >
                  {item.quoteNumber}
                </Link>
                {compact ? (
                  <p className="mt-1 break-words text-sm text-[var(--isalwa-slate)]">
                    {compactFacts.join(' · ')}
                  </p>
                ) : (
                  <dl className="mt-3 grid min-w-0 gap-1 text-sm text-[var(--isalwa-slate)] sm:grid-cols-2">
                    {showAmount ? (
                      <div className="min-w-0">
                        <dt className="sr-only">Total</dt>
                        <dd className="break-words">
                          Total: {formatCentavos(item.totalCentavos, item.currency)}
                        </dd>
                      </div>
                    ) : null}
                    <div className="min-w-0">
                      <dt className="sr-only">Fecha</dt>
                      <dd className="break-words">Fecha: {dateLabel}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="sr-only">Responsable</dt>
                      <dd className="break-words">Responsable: {owner}</dd>
                    </div>
                  </dl>
                )}
              </div>
              <StatusPill tone={statusTone(item.status)} className="shrink-0">
                {formatQuoteStatus(item.status)}
              </StatusPill>
            </div>
          </ListRow>
        );
      })}
    </ul>
  );
}
