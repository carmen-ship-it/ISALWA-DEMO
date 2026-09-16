'use client';

import { EmptyState, SectionHeader, StatusPill } from '@isalwa/ui';
import type { FinanceSummaryOutcome } from '@/lib/cliente/finance-summary';
import { FINANZAS_COPY, formatFinanceSummary } from '@/lib/cliente/finance-summary';

type Cliente360FinanzasProps = {
  outcome: FinanceSummaryOutcome;
};

export function Cliente360Finanzas({ outcome }: Cliente360FinanzasProps) {
  return (
    <div>
      <SectionHeader title={FINANZAS_COPY.title} />

      {outcome.status === 'unavailable' ? (
        <p className="text-sm text-[var(--isalwa-slate)]" role="alert">
          {outcome.message}
        </p>
      ) : outcome.status === 'forbidden' ? (
        <p className="text-sm text-[var(--isalwa-slate)]" role="alert">
          {FINANZAS_COPY.forbidden}
        </p>
      ) : outcome.summary.openOrdersCount === 0 ? (
        <EmptyState title={FINANZAS_COPY.noOrders} description={FINANZAS_COPY.noOrdersHint} />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone="info">{FINANZAS_COPY.subtitle}</StatusPill>
          </div>

          <dl className="grid gap-6 sm:grid-cols-2">
            <div>
              <dt className="isalwa-section-label">{FINANZAS_COPY.openOrders}</dt>
              <dd className="mt-2 text-[var(--isalwa-kiln)]">
                {outcome.summary.openOrdersCount}
              </dd>
            </div>
            <div>
              <dt className="isalwa-section-label">{FINANZAS_COPY.openOrdersTotal}</dt>
              <dd className="mt-2 font-[family-name:var(--isalwa-font-display)] text-2xl italic text-[var(--isalwa-kiln)]">
                {formatFinanceSummary(outcome.summary)}
              </dd>
            </div>
          </dl>

          <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">
            {FINANZAS_COPY.disclaimer}
          </p>
          <p className="text-xs text-[var(--isalwa-slate)]">{FINANZAS_COPY.noPaymentClaim}</p>
        </div>
      )}
    </div>
  );
}
