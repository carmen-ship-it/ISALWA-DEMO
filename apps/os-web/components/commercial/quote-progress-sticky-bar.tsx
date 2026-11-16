'use client';

import type { ReactNode } from 'react';
import { Button } from '@isalwa/ui';
import { CommercialStickyBar } from '@/components/commercial/commercial-sticky-bar';
import { useQuoteLive } from '@/components/commercial/quote-live-frame';
import { useQuoteSendUi } from '@/components/commercial/quote-send-ui';
import { focusQuoteEnvioRegister } from '@/lib/commercial/quote-envio-focus';
import { QUOTE_LIFECYCLE_COPY, QUOTE_LIFECYCLE_LABELS } from '@/lib/commercial/quote-lifecycle';
import { QUOTE_MANUAL_SEND_COPY } from '@/lib/commercial/quote-manual-send';

type QuoteProgressStickyBarProps = {
  status: string;
  lineCount: number;
  sendRecorded: boolean;
  canRecordSend: boolean;
  /** Issued (Emitida) and not yet accepted: Registrar aceptación is the next stage. */
  canRecordAcceptance: boolean;
  canConvertToOrder: boolean;
};

type StickyAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  copy: ReactNode;
};

/**
 * One primary thumb CTA for the quote’s current stage — not every action at once.
 * Draft → Emitir · Issued, not sent → Envío · Issued → Registrar aceptación · Accepted → Crear pedido.
 */
export function QuoteProgressStickyBar({
  status,
  lineCount,
  sendRecorded,
  canRecordSend,
  canRecordAcceptance,
  canConvertToOrder,
}: QuoteProgressStickyBarProps) {
  const live = useQuoteLive();
  const sendUi = useQuoteSendUi();
  const effectiveStatus = live?.quote.status ?? status;
  const effectiveLines = live?.quote.lines.length ?? lineCount;
  const effectiveSend = sendRecorded || Boolean(sendUi?.sendRecorded);

  let action: StickyAction | null = null;

  if (effectiveStatus === 'draft') {
    if (effectiveLines > 0) {
      action = {
        label: QUOTE_LIFECYCLE_LABELS.issue,
        href: '#cotizacion-acciones',
        copy: (
          <div className="text-sm text-[var(--isalwa-slate)]">
            <p>Revise las líneas y emita la cotización.</p>
            <p>Emitir necesita la aprobación de estos términos exactos.</p>
          </div>
        ),
      };
    }
  } else if (!effectiveSend && canRecordSend) {
    action = {
      label: QUOTE_MANUAL_SEND_COPY.action,
      onClick: () => focusQuoteEnvioRegister({ openDialog: true }),
      copy: (
        <div className="text-sm text-[var(--isalwa-slate)]">
          <p>Cotización emitida</p>
          <p>Registre el envío por su canal habitual. ISALWA no envía el mensaje.</p>
        </div>
      ),
    };
  } else if (effectiveStatus === 'submitted' && canRecordAcceptance) {
    action = {
      label: QUOTE_LIFECYCLE_LABELS.recordAcceptance,
      href: '#registrar-aceptacion',
      copy: (
        <div className="text-sm text-[var(--isalwa-slate)]">
          <p>Cotización emitida</p>
          <p>Registre la aceptación del cliente cuando la confirme. Entonces podrá crear el pedido.</p>
        </div>
      ),
    };
  } else if (effectiveStatus === 'accepted' && canConvertToOrder) {
    action = {
      label: QUOTE_LIFECYCLE_LABELS.createOrder,
      href: '#convertir-pedido',
      copy: <p className="text-sm text-[var(--isalwa-slate)]">{QUOTE_LIFECYCLE_COPY.acceptedNextStep}</p>,
    };
  }

  if (!action) return null;

  return (
    <CommercialStickyBar className="mb-6" id="quote-progress-sticky">
      {action.copy}
      {action.onClick ? (
        <Button type="button" variant="primary" onClick={action.onClick}>
          {action.label}
        </Button>
      ) : (
        <a href={action.href}>
          <Button type="button" variant="primary">
            {action.label}
          </Button>
        </a>
      )}
    </CommercialStickyBar>
  );
}
