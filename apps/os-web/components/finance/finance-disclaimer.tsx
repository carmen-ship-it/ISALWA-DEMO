import { PageSection, StatusPill } from '@isalwa/ui';
import { FINANCE_DESK_COPY } from '@/lib/finance';

/**
 * Single finance boundary banner for /finanzas. Do not duplicate on the desk or payment form.
 */
export function FinanceDisclaimer({ className }: { className?: string }) {
  return (
    <PageSection
      card
      className={
        className ??
        'mb-6 border border-[var(--isalwa-sky)] bg-[var(--isalwa-sky)] p-4 shadow-[var(--isalwa-shadow-soft)] md:p-5'
      }
      aria-label="Alcance del registro financiero"
    >
      <div className="flex flex-wrap gap-2">
        <StatusPill tone="manual">Registro manual</StatusPill>
        <StatusPill tone="neutral">No es contabilidad oficial</StatusPill>
      </div>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
        {FINANCE_DESK_COPY.disclaimerBanner}
      </p>
    </PageSection>
  );
}
