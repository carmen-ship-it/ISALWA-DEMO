'use client';

import { useRef, useState } from 'react';
import { Button } from '@isalwa/ui';
import { FormFeedback } from '@/components/commercial/form-feedback';
import {
  isQuotePdfReady,
  QUOTE_PDF_COPY,
  quotePdfDownloadFilename,
} from '@/lib/commercial/quote-pdf-ready';
import { TOUR_TARGET } from '@/lib/walkthrough/targets';

type QuotePdfDownloadButtonProps = {
  quoteId: string;
  quoteNumber: string;
  quoteStatus: string;
  /** When true, render only primary download (no Ver PDF). */
  downloadOnly?: boolean;
  /** Button hierarchy for the download action. */
  downloadVariant?: 'primary' | 'secondary' | 'ghost';
  className?: string;
};

async function staffPdfError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { message?: unknown };
    if (typeof data.message === 'string') {
      const message = data.message.trim();
      if (message && message.length <= 180 && !message.includes('\n') && !/stack|at \//i.test(message)) {
        return message;
      }
    }
  } catch {
    // Non-JSON bodies stay staff-safe and never surface provider text.
  }
  if (response.status === 401) {
    return 'Su sesión venció. Vuelva a iniciar sesión para descargar la cotización.';
  }
  if (response.status === 403) {
    return 'No tiene permiso para descargar esta cotización.';
  }
  if (response.status === 404) {
    return 'No se encontró esta cotización.';
  }
  return 'No se pudo preparar la cotización. Intente de nuevo.';
}

export function QuotePdfDownloadButton({
  quoteId,
  quoteNumber,
  quoteStatus,
  downloadOnly = false,
  downloadVariant = 'primary',
  className,
}: QuotePdfDownloadButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const locked = useRef(false);
  const ready = isQuotePdfReady(quoteStatus);

  async function download(disposition: 'attachment' | 'inline') {
    if (!ready || locked.current) return;
    locked.current = true;
    setPending(true);
    setError(null);
    try {
      const url = `/api/quotes/${encodeURIComponent(quoteId)}/pdf${
        disposition === 'inline' ? '?disposition=inline' : ''
      }`;
      const response = await fetch(url, { method: 'GET', cache: 'no-store' });
      if (!response.ok) {
        setError(await staffPdfError(response));
        return;
      }
      const type = response.headers.get('content-type') ?? '';
      if (!type.includes('pdf') && !type.includes('octet-stream')) {
        setError('No se pudo preparar la cotización. Intente de nuevo.');
        return;
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      if (disposition === 'inline') {
        window.open(objectUrl, '_blank', 'noopener,noreferrer');
      } else {
        const anchor = document.createElement('a');
        anchor.href = objectUrl;
        anchor.download = quotePdfDownloadFilename(quoteNumber);
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      }
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch {
      setError('No se pudo preparar la cotización. Intente de nuevo.');
    } finally {
      locked.current = false;
      setPending(false);
    }
  }

  if (!ready) {
    return (
      <div className={className} data-tour={TOUR_TARGET.quotePdf}>
        <p className="max-w-sm text-sm leading-relaxed text-[var(--isalwa-slate)]">
          {QUOTE_PDF_COPY.notReady}
        </p>
      </div>
    );
  }

  return (
    <div className={className} data-tour={TOUR_TARGET.quotePdf}>
      <div className="flex flex-col items-stretch gap-3 sm:items-start">
        <div className="flex flex-wrap justify-start gap-2">
          {!downloadOnly ? (
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              aria-busy={pending}
              onClick={() => void download('inline')}
            >
              {pending ? QUOTE_PDF_COPY.preparing : QUOTE_PDF_COPY.view}
            </Button>
          ) : null}
          <Button
            type="button"
            variant={downloadVariant}
            disabled={pending}
            aria-busy={pending}
            onClick={() => void download('attachment')}
          >
            {pending ? QUOTE_PDF_COPY.preparing : QUOTE_PDF_COPY.download}
          </Button>
        </div>
        <FormFeedback error={error} />
        <p className="max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
          {QUOTE_PDF_COPY.manualSend}
        </p>
      </div>
    </div>
  );
}
