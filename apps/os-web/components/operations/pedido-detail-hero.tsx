import { PageSection, SectionHeader, StatusPill } from '@isalwa/ui';
import Link from 'next/link';

const linkClass =
  'isalwa-t-fast font-medium text-[var(--isalwa-glaze)] underline-offset-4 hover:text-[var(--isalwa-glaze-deep)] hover:underline';

export type PedidoDetailHeroProps = {
  orderNumber: string;
  statusLabel: string;
  statusTone: 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'manual';
  customerName: string;
  customerHref: string;
  sourceQuoteNumber: string | null;
  sourceQuoteHref: string | null;
  totalLabel: string;
  createdAtLabel: string;
  responsibleLabel: string;
};

/**
 * Top Pedido card: number, client, source quote, total, date, responsible.
 */
export function PedidoDetailHero({
  orderNumber,
  statusLabel,
  statusTone,
  customerName,
  customerHref,
  sourceQuoteNumber,
  sourceQuoteHref,
  totalLabel,
  createdAtLabel,
  responsibleLabel,
}: PedidoDetailHeroProps) {
  return (
    <PageSection card className="bg-white p-8 md:p-10" aria-label={`Pedido ${orderNumber}`}>
      <SectionHeader
        kicker="Pedido"
        title={
          <h2 className="font-[family-name:var(--isalwa-font-display)] text-2xl font-normal italic text-[var(--isalwa-kiln)]">
            {orderNumber}
          </h2>
        }
        action={<StatusPill tone={statusTone}>{statusLabel}</StatusPill>}
      />
      <dl className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <dt className="isalwa-section-label">Cliente</dt>
          <dd className="mt-2">
            <Link href={customerHref} className={linkClass}>
              {customerName}
            </Link>
          </dd>
        </div>
        {sourceQuoteHref ? (
          <div>
            <dt className="isalwa-section-label">Cotización de origen</dt>
            <dd className="mt-2">
              <Link href={sourceQuoteHref} className={linkClass}>
                {sourceQuoteNumber ?? 'Ver cotización'}
              </Link>
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="isalwa-section-label">Total</dt>
          <dd className="mt-2 font-[family-name:var(--isalwa-font-display)] text-2xl italic text-[var(--isalwa-kiln)]">
            {totalLabel}
          </dd>
        </div>
        <div>
          <dt className="isalwa-section-label">Fecha</dt>
          <dd className="mt-2 text-[var(--isalwa-kiln)]">{createdAtLabel}</dd>
        </div>
        <div>
          <dt className="isalwa-section-label">Responsable</dt>
          <dd className="mt-2 text-[var(--isalwa-kiln)]">{responsibleLabel}</dd>
        </div>
      </dl>
    </PageSection>
  );
}
