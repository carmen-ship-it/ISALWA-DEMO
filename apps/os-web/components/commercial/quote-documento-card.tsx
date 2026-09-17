import { QuotePdfDownloadButton } from '@/components/commercial/quote-pdf-download-button';
import { formatTimestamp } from '@/lib/commercial/labels';
import { isQuotePdfReady, QUOTE_PDF_COPY } from '@/lib/commercial/quote-pdf-ready';

type QuoteDocumentoCardProps = {
  quoteId: string;
  quoteNumber: string;
  quoteStatus: string;
  createdAt: string;
};

export function QuoteDocumentoCard({
  quoteId,
  quoteNumber,
  quoteStatus,
  createdAt,
}: QuoteDocumentoCardProps) {
  const ready = isQuotePdfReady(quoteStatus);

  return (
    <section
      className="rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-porcelain)] p-6 md:p-8"
      data-quote-documento="card"
      aria-labelledby="quote-documento-title"
    >
      <p className="isalwa-section-label">{QUOTE_PDF_COPY.documento}</p>
      <h2
        id="quote-documento-title"
        className="mt-2 font-[family-name:var(--isalwa-font-display)] text-2xl font-normal italic text-[var(--isalwa-kiln)]"
      >
        Cotización {quoteNumber}
      </h2>
      <p className="mt-2 text-sm text-[var(--isalwa-slate)]">
        {ready ? QUOTE_PDF_COPY.available : QUOTE_PDF_COPY.notReady}
      </p>
      <p className="mt-4 text-sm text-[var(--isalwa-slate)]">
        Creada: <span className="text-[var(--isalwa-kiln)]">{formatTimestamp(createdAt)}</span>
      </p>
      {ready ? (
        <div className="mt-6">
          <QuotePdfDownloadButton
            quoteId={quoteId}
            quoteNumber={quoteNumber}
            quoteStatus={quoteStatus}
            downloadVariant="primary"
          />
        </div>
      ) : null}
    </section>
  );
}
