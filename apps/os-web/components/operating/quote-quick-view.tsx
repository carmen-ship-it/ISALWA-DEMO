'use client';

import { useRouter } from 'next/navigation';
import { ContextDrawer, StatusPill } from '@isalwa/ui';
import type { QuoteSummaryReadModel } from '@isalwa/os-contracts';
import { formatQuoteStatus, formatTimestamp, statusTone } from '@/lib/commercial/labels';
import { formatCentavos } from '@/lib/commercial/money';
import { quoteHref } from '@/lib/commercial/navigation';
import { canRegisterQuoteFollowUp } from '@/lib/commercial/quote-follow-up';
import { FOLLOW_UP_COPY } from '@/lib/work/follow-up';

export type QuoteQuickViewProps = {
  quote: QuoteSummaryReadModel;
  customer: string;
  owner: string;
  closeHref: string;
};

const actionLinkClass =
  'isalwa-t-fast inline-flex h-10 items-center rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-4 text-sm font-medium text-[var(--isalwa-kiln)] outline-none hover:border-[var(--isalwa-glaze)] focus-visible:shadow-[var(--isalwa-shadow-focus)]';

function quotePdfHref(quoteId: string): string {
  return `/api/quotes/${encodeURIComponent(quoteId)}/pdf?disposition=inline`;
}

export function QuoteQuickView({ quote, customer, owner, closeHref }: QuoteQuickViewProps) {
  const router = useRouter();
  const detailHref = quoteHref(quote.partyId, quote.quoteId);
  const dateLabel = formatTimestamp(quote.submittedAt ?? quote.createdAt);
  const followUp = canRegisterQuoteFollowUp(quote.status);

  return (
    <ContextDrawer
      open
      title={quote.quoteNumber}
      onClose={() => router.replace(closeHref, { scroll: false })}
    >
      <dl className="grid gap-4 text-sm">
        <div>
          <dt className="isalwa-section-label">Número</dt>
          <dd className="mt-1 break-words text-[var(--isalwa-kiln)]">{quote.quoteNumber}</dd>
        </div>
        <div>
          <dt className="isalwa-section-label">Cliente</dt>
          <dd className="mt-1 break-words text-[var(--isalwa-kiln)]">{customer}</dd>
        </div>
        <div>
          <dt className="isalwa-section-label">Total</dt>
          <dd className="mt-1 text-[var(--isalwa-kiln)]">
            {formatCentavos(quote.totalCentavos, quote.currency)}
          </dd>
        </div>
        <div>
          <dt className="isalwa-section-label">Responsable</dt>
          <dd className="mt-1 break-words text-[var(--isalwa-kiln)]">{owner}</dd>
        </div>
        <div>
          <dt className="isalwa-section-label">Estado</dt>
          <dd className="mt-1">
            <StatusPill tone={statusTone(quote.status)}>{formatQuoteStatus(quote.status)}</StatusPill>
          </dd>
        </div>
        {dateLabel ? (
          <div>
            <dt className="isalwa-section-label">Fecha</dt>
            <dd className="mt-1 text-[var(--isalwa-kiln)]">{dateLabel}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-6 flex flex-wrap gap-2">
        <a href={detailHref} className={actionLinkClass}>
          Abrir
        </a>
        <a
          href={quotePdfHref(quote.quoteId)}
          className={actionLinkClass}
          target="_blank"
          rel="noopener noreferrer"
        >
          PDF
        </a>
        {followUp ? (
          <a href={detailHref} className={actionLinkClass}>
            {FOLLOW_UP_COPY.action}
          </a>
        ) : null}
      </div>

      <p className="mt-4 text-sm leading-relaxed text-[var(--isalwa-slate)]">
        La conversión se registra en la cotización.
      </p>
    </ContextDrawer>
  );
}
