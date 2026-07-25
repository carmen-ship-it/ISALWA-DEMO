import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExperienceHeader, PageContainer, Panel, StatusPill } from '@isalwa/ui';
import { AppShell } from '@/components/app-shell';
import { apiGet } from '@/lib/api';
import { QuoteActions } from '@/components/quote-actions';

type Quote = {
  id: string;
  number: string;
  status: string;
  accountId: string;
  accountName: string;
  ownerName: string;
  total: { label: string };
  items: Array<{
    id: string;
    name: string;
    sku: string;
    qty: number;
    unitPrice: { label: string };
    lineTotal: { label: string };
    lastPriceShown: { label: string } | null;
  }>;
  invoiceId: string | null;
  invoiceNumber: string | null;
  orderNumber: string | null;
};

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let quote: Quote | null = null;
  try {
    quote = await apiGet<Quote>(`/quotes/${id}`);
  } catch {
    notFound();
  }
  if (!quote) notFound();

  return (
    <AppShell active="/cierre">
      <PageContainer label={`Cotización ${quote.number}`}>
        <ExperienceHeader
          kicker="Cotización"
          title={<span className="isalwa-metric not-italic font-semibold">{quote.number}</span>}
          subtitle={
            <span className="flex flex-wrap items-center gap-2">
              <StatusPill tone="info">
                {quote.status === 'draft'
                  ? 'Borrador'
                  : quote.status === 'sent'
                    ? 'Enviado'
                    : quote.status === 'accepted'
                      ? 'Aceptado'
                      : quote.status === 'rejected'
                        ? 'Rechazado'
                        : quote.status}
              </StatusPill>
              <StatusPill tone="neutral">{quote.ownerName}</StatusPill>
              <Link
                href={`/personas/${quote.accountId}`}
                className="text-[var(--isalwa-glaze)] transition-opacity duration-[var(--isalwa-motion-fast)] hover:opacity-70"
              >
                {quote.accountName}
              </Link>
            </span>
          }
          actions={
            <div className="text-right">
              <p className="isalwa-section-label">Total</p>
              <p className="isalwa-metric mt-1 text-[clamp(1.25rem,2vw,1.6rem)] font-semibold">
                {quote.total.label}
              </p>
            </div>
          }
        />

        <Panel className="p-5 md:p-6">
          <ul className="space-y-3">
            {quote.items.map((i) => (
              <li
                key={i.id}
                className="flex flex-wrap justify-between gap-2 border-b border-[var(--isalwa-mist)] pb-3 last:border-0"
              >
                <div>
                  <p className="font-medium">
                    {i.qty} × {i.name}
                  </p>
                  <p className="text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]">{i.sku}</p>
                  {i.lastPriceShown ? (
                    <p className="text-[var(--isalwa-text-sm)] text-[var(--isalwa-glaze)]">
                      Memoria mostrada: {i.lastPriceShown.label}
                    </p>
                  ) : null}
                </div>
                <div className="text-right font-[var(--isalwa-font-mono)]">
                  <p>{i.unitPrice.label}</p>
                  <p className="font-medium">{i.lineTotal.label}</p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <div className="mt-5">
          <QuoteActions
            quoteId={quote.id}
            status={quote.status}
            invoiceId={quote.invoiceId}
            invoiceNumber={quote.invoiceNumber}
          />
        </div>

        <div className="mt-6 flex flex-wrap gap-3 text-[var(--isalwa-text-md)]">
          <Link
            href={`/cierre?account=${quote.accountId}`}
            className="text-[var(--isalwa-glaze)] transition-opacity duration-[var(--isalwa-motion-fast)] hover:opacity-70"
          >
            Nueva cotización →
          </Link>
          <Link
            href={`/personas/${quote.accountId}`}
            className="text-[var(--isalwa-glaze)] transition-opacity duration-[var(--isalwa-motion-fast)] hover:opacity-70"
          >
            ← Volver al dossier
          </Link>
        </div>
      </PageContainer>
    </AppShell>
  );
}
