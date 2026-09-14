import Link from 'next/link';
import { ListRow, StatusPill } from '@isalwa/ui';
import type { QuoteSummaryReadModel } from '@isalwa/os-contracts';
import {
  formatQuoteStatus,
  formatTimestamp,
  statusTone,
} from '@/lib/commercial/labels';
import { formatCentavos } from '@/lib/commercial/money';
import { opportunityHref, quoteHref } from '@/lib/commercial/navigation';
import { memberLabel, type MemberLabelMap } from '@/lib/work/member-resolver';
import { TOUR_TARGET } from '@/lib/walkthrough/targets';

type QuoteListProps = {
  partyId: string;
  items: QuoteSummaryReadModel[];
  memberLabels: MemberLabelMap;
};

export function QuoteList({ partyId, items, memberLabels }: QuoteListProps) {
  return (
    <ul className="divide-y divide-[var(--isalwa-mist)]" aria-label="Cotizaciones" data-tour={TOUR_TARGET.quoteList}>
      {items.map((item) => (
        <ListRow key={item.quoteId} as="li" className="px-1 py-1">
          <div className="rounded-[var(--isalwa-radius-control)] px-3 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Link
                  href={quoteHref(partyId, item.quoteId)}
                  className="isalwa-t-fast font-medium text-[var(--isalwa-kiln)] outline-none hover:text-[var(--isalwa-glaze-deep)] focus-visible:shadow-[var(--isalwa-shadow-focus)]"
                >
                  {item.quoteNumber}
                </Link>
                <dl className="mt-3 grid gap-1 text-sm text-[var(--isalwa-slate)] sm:grid-cols-2">
                  <div>
                    <dt className="sr-only">Total</dt>
                    <dd>Total: {formatCentavos(item.totalCentavos, item.currency)}</dd>
                  </div>
                  <div>
                    <dt className="sr-only">Responsable</dt>
                    <dd>Responsable: {memberLabel(memberLabels, item.ownerMemberId)}</dd>
                  </div>
                  {item.opportunityId ? (
                    <div>
                      <dt className="sr-only">Oportunidad</dt>
                      <dd>
                        <Link
                          href={opportunityHref(partyId, item.opportunityId)}
                          className="isalwa-t-fast text-[var(--isalwa-glaze)] underline-offset-4 hover:text-[var(--isalwa-glaze-deep)] hover:underline"
                        >
                          Ver oportunidad
                        </Link>
                      </dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="sr-only">Creada</dt>
                    <dd>Creada: {formatTimestamp(item.createdAt)}</dd>
                  </div>
                  {item.submittedAt ? (
                    <div>
                      <dt className="sr-only">Enviada</dt>
                      <dd>Enviada: {formatTimestamp(item.submittedAt)}</dd>
                    </div>
                  ) : null}
                  {item.cancelledAt ? (
                    <div>
                      <dt className="sr-only">Cancelada</dt>
                      <dd>Cancelada: {formatTimestamp(item.cancelledAt)}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>
              <StatusPill tone={statusTone(item.status)} data-tour={TOUR_TARGET.quoteStatus}>
                {formatQuoteStatus(item.status)}
              </StatusPill>
            </div>
          </div>
        </ListRow>
      ))}
    </ul>
  );
}
