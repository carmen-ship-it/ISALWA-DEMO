'use client';

import { Button, PageSection, StatusPill } from '@isalwa/ui';
import { QuotePdfDownloadButton } from '@/components/commercial/quote-pdf-download-button';
import { QUOTE_MANUAL_SEND_COPY } from '@/lib/commercial/quote-manual-send';
import { isQuotePdfReady } from '@/lib/commercial/quote-pdf-ready';

type QuoteDocumentActionsProps = {
  quoteId: string;
  quoteNumber: string;
  quoteStatus: string;
  canRecordSend: boolean;
  sendRecorded: boolean;
};

/**
 * Primary document progression after lines exist / after present.
 * Does not send WhatsApp or email.
 */
export function QuoteDocumentActions({
  quoteId,
  quoteNumber,
  quoteStatus,
  canRecordSend,
  sendRecorded,
}: QuoteDocumentActionsProps) {
  const pdfReady = isQuotePdfReady(quoteStatus);
  const isDraft = quoteStatus === 'draft';

  if (isDraft) {
    return (
      <PageSection
        id="quote-document-actions"
        card
        className="scroll-mt-32 bg-[color-mix(in_srgb,var(--isalwa-teal-100)_28%,white)] p-5 md:p-6"
        data-quote-doc-actions="draft"
      >
        <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">
          Presente la cotización para generar el documento.
        </p>
      </PageSection>
    );
  }

  if (!pdfReady) return null;

  return (
    <PageSection
      id="quote-document-actions"
      card
      className="scroll-mt-32 bg-[color-mix(in_srgb,var(--isalwa-teal-100)_28%,white)] p-5 md:p-6"
      data-quote-doc-actions="presented"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-2">
          {sendRecorded ? (
            <StatusPill tone="success">Enviada</StatusPill>
          ) : (
            <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">
              Descargue la cotización y envíela por su canal habitual.
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <QuotePdfDownloadButton
            quoteId={quoteId}
            quoteNumber={quoteNumber}
            quoteStatus={quoteStatus}
            downloadOnly
            downloadVariant="primary"
            showManualSendHint={false}
          />
          {canRecordSend && !sendRecorded ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                document.getElementById('envio')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              {QUOTE_MANUAL_SEND_COPY.action}
            </Button>
          ) : null}
        </div>
      </div>
    </PageSection>
  );
}
