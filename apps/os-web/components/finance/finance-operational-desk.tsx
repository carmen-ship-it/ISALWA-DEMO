'use client';

import { useState } from 'react';
import { EmptyState, PageSection } from '@isalwa/ui';
import type { PaymentReportView } from '@isalwa/os-contracts';
import { PaymentInstructionsPanel } from '@/components/finance/payment-instructions-panel';
import { PaymentReportForm } from '@/components/finance/payment-report-form';
import { PaymentReportList } from '@/components/finance/payment-report-list';
import {
  FINANCE_DESK_COPY,
  PAYMENT_DESK_COPY,
  type FinanceDeskDenial,
  financePermissionCopy,
} from '@/lib/finance';

type FinanceOperationalDeskProps =
  | {
      status: 'denied';
      reason: FinanceDeskDenial;
    }
  | {
      status: 'ready';
      canReport: boolean;
      canVerify: boolean;
      canPublishInstructions: boolean;
      initialCustomerId?: string;
      initialCustomerLabel?: string;
      initialOrderId?: string;
      /** Vista de evaluación: read-only, nothing can be written. */
      mutationsBlocked?: boolean;
    };

/**
 * Contabilidad operational desk. Reported payments and their human verification.
 * Not a ledger, not Ingresos, not official accounting: ISALWA records what was reported and
 * which person verified each payment tender.
 */
export function FinanceOperationalDesk(props: FinanceOperationalDeskProps) {
  if (props.status === 'denied') {
    const copy = financePermissionCopy(props.reason);
    return (
      <div data-finance-status="denied" role="alert" className="max-w-2xl">
        <EmptyState title={copy.title} description={copy.description} />
      </div>
    );
  }
  return <ReadyDesk {...props} />;
}

function ReadyDesk(props: Extract<FinanceOperationalDeskProps, { status: 'ready' }>) {
  const [reloadToken, setReloadToken] = useState(0);
  const blocked = props.mutationsBlocked === true;

  function onRecorded(_report: PaymentReportView) {
    setReloadToken((token) => token + 1);
  }

  return (
    <div data-finance-status="ready" className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start">
      <PageSection card clip={false} className="min-w-0 space-y-4 overflow-visible p-5 shadow-[var(--isalwa-shadow-resting)] md:p-6" data-finance-contexto="">
        <div>
          <p className="isalwa-kicker">Contexto</p>
          <h2 className="mt-2 text-sm font-medium text-[var(--isalwa-kiln)]">{FINANCE_DESK_COPY.paymentSectionTitle}</h2>
          <p className="mt-1 text-sm leading-relaxed text-[var(--isalwa-slate)]">{FINANCE_DESK_COPY.paymentHelper}</p>
        </div>
        {props.canReport && !blocked ? (
          <div className="border-t border-[var(--isalwa-mist)] pt-4 [&_button[type=submit]]:sticky [&_button[type=submit]]:bottom-3 [&_button[type=submit]]:z-10 [&_button[type=submit]]:shadow-[var(--isalwa-shadow-resting)]">
            <PaymentReportForm
              initialCustomerId={props.initialCustomerId}
              initialCustomerLabel={props.initialCustomerLabel}
              initialOrderId={props.initialOrderId}
              onRecorded={onRecorded}
            />
          </div>
        ) : null}
        {props.canReport && blocked ? (
          <p className="border-t border-[var(--isalwa-mist)] pt-4 text-sm text-[var(--isalwa-slate)]" role="status">
            Vista de evaluación es solo lectura. Vuelva a su vista para registrar pagos.
          </p>
        ) : null}
        {!props.canReport ? (
          <p className="border-t border-[var(--isalwa-mist)] pt-4 text-sm text-[var(--isalwa-slate)]" role="status">
            Su asignación no incluye registrar pagos reportados. {props.canVerify ? 'Verifique los pagos de la lista.' : ''}
          </p>
        ) : null}
        {!props.canVerify ? (
          <p className="text-sm text-[var(--isalwa-slate)]">{PAYMENT_DESK_COPY.notVerifier}</p>
        ) : null}
      </PageSection>

      <PageSection card className="min-w-0 self-start space-y-1 p-5 md:p-6" data-finance-sesion="">
        <PaymentReportList
          canVerify={props.canVerify && !blocked}
          reloadToken={reloadToken}
          initialCustomerId={props.initialCustomerId}
        />
      </PageSection>

      <PageSection card className="min-w-0 space-y-3 p-5 md:p-6 lg:col-span-2" data-finance-instrucciones="">
        <PaymentInstructionsPanel canPublish={props.canPublishInstructions && !blocked} />
      </PageSection>
    </div>
  );
}
