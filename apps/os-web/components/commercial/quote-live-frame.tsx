'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { PageSection, SectionHeader, StatusPill } from '@isalwa/ui';
import type { QuoteDetailReadModel, QuoteLineReadModel } from '@isalwa/os-contracts';
import { formatQuoteStatus, statusTone } from '@/lib/commercial/labels';
import { formatCentavos } from '@/lib/commercial/money';
import { lineProvenanceView } from '@/lib/commercial/product-picker';
import {
  applyAddedLine,
  applySubmitted,
  mergeServerQuote,
} from '@/lib/commercial/quote-live-refresh';
import { TOUR_TARGET } from '@/lib/walkthrough/targets';

type AddedLinePatch = {
  totalCentavos?: string;
};

type QuoteLiveContextValue = {
  quote: QuoteDetailReadModel;
  serverQuote: QuoteDetailReadModel;
  recordAddedLine: (line: QuoteLineReadModel, patch?: AddedLinePatch) => void;
  recordSubmitted: () => void;
};

const QuoteLiveContext = createContext<QuoteLiveContextValue | null>(null);

function sumLineTotals(lines: QuoteLineReadModel[]): string | null {
  let sum = BigInt(0);
  for (const line of lines) {
    if (!/^-?\d+$/.test(line.lineTotalCentavos)) return null;
    sum += BigInt(line.lineTotalCentavos);
  }
  return sum.toString();
}

function withOverlayTotals(quote: QuoteDetailReadModel, reportedTotal: string | undefined): QuoteDetailReadModel {
  const subtotal = sumLineTotals(quote.lines);
  if (!subtotal && !reportedTotal) return quote;
  const next = { ...quote };
  if (subtotal) next.subtotalCentavos = subtotal;
  if (reportedTotal) {
    next.totalCentavos = reportedTotal;
    return next;
  }
  if (subtotal && /^-?\d+$/.test(quote.headerDiscountCentavos)) {
    const total = BigInt(subtotal) - BigInt(quote.headerDiscountCentavos);
    if (total >= BigInt(0)) next.totalCentavos = total.toString();
  }
  return next;
}

export function QuoteLiveFrame({
  quote,
  children,
}: {
  quote: QuoteDetailReadModel;
  children: ReactNode;
}) {
  const [live, setLive] = useState(quote);
  const shown = mergeServerQuote(live, quote);
  if (shown !== live) setLive(shown);

  const recordAddedLine = useCallback((line: QuoteLineReadModel, patch?: AddedLinePatch) => {
    setLive((current) => {
      const next = applyAddedLine(current, line);
      if (next === current) return current;
      return withOverlayTotals(next, patch?.totalCentavos);
    });
  }, []);

  const recordSubmitted = useCallback(() => {
    setLive((current) => applySubmitted(current));
  }, []);

  return (
    <QuoteLiveContext.Provider
      value={{
        quote: shown,
        serverQuote: quote,
        recordAddedLine,
        recordSubmitted,
      }}
    >
      {children}
    </QuoteLiveContext.Provider>
  );
}

export function useQuoteLive(): QuoteLiveContextValue | null {
  return useContext(QuoteLiveContext);
}

export function QuoteLiveStatus() {
  const live = useQuoteLive();
  if (!live) return null;
  return (
    <StatusPill tone={statusTone(live.quote.status)} data-tour={TOUR_TARGET.quoteStatus}>
      {formatQuoteStatus(live.quote.status)}
    </StatusPill>
  );
}

const documentTitle = (
  <h2 className="font-[family-name:var(--isalwa-font-display)] text-2xl font-normal italic text-[var(--isalwa-kiln)]">
    Líneas
  </h2>
);

function DocumentLines({ quote }: { quote: QuoteDetailReadModel }) {
  const lines = [...quote.lines].sort((a, b) => a.lineNumber - b.lineNumber);
  return (
    <PageSection card className="mt-10 bg-white p-8 md:p-10">
      <SectionHeader title={documentTitle} />
      {lines.length > 0 ? (
        <>
          <ul className="divide-y divide-[var(--isalwa-mist)]" aria-label="Líneas de cotización">
            {lines.map((line) => {
              const provenance = lineProvenanceView(line.productRef);
              return (
                <li key={line.quoteLineId} className="py-6 first:pt-2">
                  <p className="whitespace-pre-wrap font-medium text-[var(--isalwa-kiln)]">{line.description}</p>
                  {provenance.caption ? (
                    <p className="mt-2 text-sm text-[var(--isalwa-slate)]">{provenance.caption}</p>
                  ) : null}
                  {provenance.note ? (
                    <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{provenance.note}</p>
                  ) : null}
                  <dl className="mt-4 grid gap-4 text-sm text-[var(--isalwa-slate)] sm:grid-cols-3">
                    <div>
                      <dt className="isalwa-section-label">Cantidad</dt>
                      <dd className="mt-1 text-[var(--isalwa-kiln)]">
                        {line.quantity}
                        {line.unitLabel ? ` ${line.unitLabel}` : ''}
                      </dd>
                    </div>
                    <div>
                      <dt className="isalwa-section-label">{provenance.priceLabel}</dt>
                      <dd className="mt-1 text-[var(--isalwa-kiln)]">
                        {formatCentavos(line.unitPriceCentavos, quote.currency)}
                      </dd>
                    </div>
                    <div>
                      <dt className="isalwa-section-label">Total línea</dt>
                      <dd className="mt-1 text-[var(--isalwa-kiln)]">
                        {formatCentavos(line.lineTotalCentavos, quote.currency)}
                      </dd>
                    </div>
                    {line.discountCentavos !== '0' ? (
                      <div>
                        <dt className="isalwa-section-label">Descuento</dt>
                        <dd className="mt-1 text-[var(--isalwa-kiln)]">
                          {formatCentavos(line.discountCentavos, quote.currency)}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                </li>
              );
            })}
          </ul>
          <dl className="mt-8 grid gap-6 border-t border-[var(--isalwa-mist)] pt-8 text-sm sm:grid-cols-3">
            <div>
              <dt className="isalwa-section-label">Subtotal</dt>
              <dd className="mt-2 text-[var(--isalwa-kiln)]">
                {formatCentavos(quote.subtotalCentavos, quote.currency)}
              </dd>
            </div>
            {quote.headerDiscountCentavos !== '0' ? (
              <div>
                <dt className="isalwa-section-label">Descuento</dt>
                <dd className="mt-2 text-[var(--isalwa-kiln)]">
                  {formatCentavos(quote.headerDiscountCentavos, quote.currency)}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="isalwa-section-label">Total</dt>
              <dd className="mt-2 font-medium text-[var(--isalwa-kiln)]">
                {formatCentavos(quote.totalCentavos, quote.currency)}
              </dd>
            </div>
          </dl>
        </>
      ) : (
        <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">
          Esta cotización no tiene líneas.
        </p>
      )}
    </PageSection>
  );
}

/** Server lines stay while they match. The overlay replaces them when the projection is behind. */
export function QuoteLiveLines({ children }: { children: ReactNode }) {
  const live = useQuoteLive();
  if (!live || live.quote === live.serverQuote) return children;
  return <DocumentLines quote={live.quote} />;
}
