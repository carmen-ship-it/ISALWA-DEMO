'use client';

import { useState } from 'react';
import { Button } from '@isalwa/ui';

type QuotePdfDownloadButtonProps = {
  quoteId: string;
  quoteNumber: string;
};

export function QuotePdfDownloadButton({ quoteId, quoteNumber }: QuotePdfDownloadButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function download(disposition: 'attachment' | 'inline') {
    setPending(true);
    setError(null);
    try {
      const url = `/api/quotes/${encodeURIComponent(quoteId)}/pdf${
        disposition === 'inline' ? '?disposition=inline' : ''
      }`;
      const response = await fetch(url, { method: 'GET', cache: 'no-store' });
      if (!response.ok) {
        setError('No se pudo descargar la cotización.');
        return;
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      if (disposition === 'inline') {
        window.open(objectUrl, '_blank', 'noopener,noreferrer');
      } else {
        const anchor = document.createElement('a');
        anchor.href = objectUrl;
        anchor.download = `cotizacion-${quoteNumber.replace(/[^a-zA-Z0-9._-]+/g, '_')}.pdf`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      }
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch {
      setError('No se pudo descargar la cotización.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() => void download('attachment')}
        >
          {pending ? 'Preparando…' : 'Descargar cotización'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={() => void download('inline')}
        >
          Vista previa
        </Button>
      </div>
      {error ? <p className="text-sm text-[var(--isalwa-kiln)]">{error}</p> : null}
    </div>
  );
}
