'use client';

import type { ReactNode } from 'react';
import { Button } from '@isalwa/ui';
import { CommercialStickyBar } from '@/components/commercial/commercial-sticky-bar';
import { useQuoteLive } from '@/components/commercial/quote-live-frame';
import { useQuoteSendUi } from '@/components/commercial/quote-send-ui';
import { focusQuoteEnvioRegister } from '@/lib/commercial/quote-envio-focus';
import { QUOTE_MANUAL_SEND_COPY } from '@/lib/commercial/quote-manual-send';

type QuoteProgressStickyBarProps = {
  status: string;
  lineCount: number;
  sendRecorded: boolean;
  canRecordSend: boolean;
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
 * Draft → Presentar · Presented unpaid-send → Envío · Ready to order → Convertir.
 */
export function QuoteProgressStickyBar({
  status,
  lineCount,
  sendRecorded,
  canRecordSend,
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
        label: 'Presentar cotización',
        href: '#presentar-cotizacion',
        copy: (
          <p className="text-sm text-[var(--isalwa-slate)]">
            Revise las líneas y presente la cotización.
          </p>
        ),
      };
    }
  } else if (!effectiveSend && canRecordSend) {
    action = {
      label: QUOTE_MANUAL_SEND_COPY.action,
      onClick: () => focusQuoteEnvioRegister({ openDialog: true }),
      copy: (
        <div className="text-sm text-[var(--isalwa-slate)]">
          <p>Cotización presentada</p>
          <p>Registre el envío por su canal habitual. ISALWA no envía el mensaje.</p>
        </div>
      ),
    };
  } else if (canConvertToOrder && effectiveStatus !== 'draft') {
    action = {
      label: 'Convertir a Pedido',
      href: '#convertir-pedido',
      copy:
        effectiveStatus === 'accepted' ? (
          <p className="text-sm text-[var(--isalwa-slate)]">Cliente aceptó · listo para pedido</p>
        ) : (
          <div className="text-sm text-[var(--isalwa-slate)]">
            <p>Cotización presentada</p>
            <p>Registre el seguimiento o convierta a pedido cuando corresponda.</p>
          </div>
        ),
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
