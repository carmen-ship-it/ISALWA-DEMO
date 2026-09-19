'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@isalwa/ui';
import { QuotePdfDownloadButton } from '@/components/commercial/quote-pdf-download-button';
import { isQuotePdfReady, QUOTE_PDF_COPY } from '@/lib/commercial/quote-pdf-ready';
import { QUOTE_MANUAL_SEND_COPY } from '@/lib/commercial/quote-manual-send';
import { FOLLOW_UP_COPY } from '@/lib/work/follow-up';

type QuoteDetailActionsProps = {
  quoteId: string;
  quoteNumber: string;
  quoteStatus: string;
  canRecordSend: boolean;
  canRegisterFollowUp: boolean;
  canEdit: boolean;
  canCancel: boolean;
  canConvertToOrder: boolean;
  onOpenSend?: () => void;
};

const menuItemClass =
  'block w-full rounded-[var(--isalwa-radius-control)] px-3 py-2 text-left text-sm text-[var(--isalwa-kiln)] hover:bg-[var(--isalwa-porcelain)]';

export function QuoteDetailActions({
  quoteId,
  quoteNumber,
  quoteStatus,
  canRecordSend,
  canRegisterFollowUp,
  canEdit,
  canCancel,
  canConvertToOrder,
  onOpenSend,
}: QuoteDetailActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const pdfReady = isQuotePdfReady(quoteStatus);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  return (
    <div ref={rootRef} className="flex flex-col items-stretch gap-3 sm:items-end">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {pdfReady ? (
          <QuotePdfDownloadButton
            quoteId={quoteId}
            quoteNumber={quoteNumber}
            quoteStatus={quoteStatus}
            downloadVariant="primary"
          />
        ) : null}
        {canRecordSend ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              onOpenSend?.();
              document.getElementById('envio')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          >
            {QUOTE_MANUAL_SEND_COPY.action}
          </Button>
        ) : null}
        <div className="relative">
          <Button
            type="button"
            variant="tertiary"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => setMenuOpen((open) => !open)}
          >
            + Acciones
          </Button>
          {menuOpen ? (
            <div
              id={menuId}
              role="menu"
              className="absolute right-0 z-20 mt-2 min-w-[14rem] rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-white p-2 shadow-[var(--isalwa-shadow-soft)]"
            >
              {canRegisterFollowUp ? (
                <a
                  href="#seguimiento"
                  role="menuitem"
                  className={menuItemClass}
                  onClick={() => setMenuOpen(false)}
                >
                  {QUOTE_MANUAL_SEND_COPY.followUpAction}
                </a>
              ) : null}
              {canEdit ? (
                <a
                  href="#editar-cotizacion"
                  role="menuitem"
                  className={menuItemClass}
                  onClick={() => setMenuOpen(false)}
                >
                  Editar
                </a>
              ) : null}
              {canCancel ? (
                <a
                  href="#cancelar-cotizacion"
                  role="menuitem"
                  className={menuItemClass}
                  onClick={() => setMenuOpen(false)}
                >
                  Cancelar
                </a>
              ) : null}
              {canConvertToOrder ? (
                <a
                  href="#convertir-pedido"
                  role="menuitem"
                  className={menuItemClass}
                  onClick={() => setMenuOpen(false)}
                >
                  {quoteStatus === 'accepted'
                    ? 'Cliente aceptó · Convertir a Pedido'
                    : 'Convertir a Pedido'}
                </a>
              ) : null}
              {!canRegisterFollowUp && !canEdit && !canCancel && !canConvertToOrder ? (
                <p className="px-3 py-2 text-sm text-[var(--isalwa-slate)]">
                  No hay acciones adicionales.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      {!pdfReady ? (
        <p className="max-w-xs text-right text-sm text-[var(--isalwa-slate)]">
          {QUOTE_PDF_COPY.notReady}
        </p>
      ) : null}
      {canRegisterFollowUp ? (
        <Link
          href="#seguimiento"
          className="sr-only"
          tabIndex={-1}
        >
          {FOLLOW_UP_COPY.action}
        </Link>
      ) : null}
    </div>
  );
}
