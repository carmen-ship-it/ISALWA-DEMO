import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Panel, StatusPill } from '@isalwa/ui';
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
      <main className="px-5 py-8 md:px-8">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[var(--isalwa-text-sm)] uppercase tracking-[0.12em] text-[var(--isalwa-glaze)]">
              Cotización
            </p>
            <h1
              className="mt-1"
              style={{
                fontFamily: 'var(--isalwa-font-mono)',
                fontSize: 'clamp(1.1rem, 1.8vw, 1.4rem)',
                fontWeight: 600,
                letterSpacing: '-0.01em',
                color: 'var(--isalwa-kiln)',
              }}
            >
              {quote.number}
            </h1>
            <div className="mt-2 flex flex-wrap gap-2">
              <StatusPill tone="info">
                {quote.status === 'draft' ? 'Borrador' : quote.status === 'sent' ? 'Enviado' : quote.status === 'accepted' ? 'Aceptado' : quote.status === 'rejected' ? 'Rechazado' : quote.status}
              </StatusPill>
              <StatusPill tone="neutral">{quote.ownerName}</StatusPill>
            </div>
            <p className="mt-2 text-[var(--isalwa-slate)]">
              <Link href={`/personas/${quote.accountId}`} className="text-[var(--isalwa-glaze)] transition-opacity duration-[var(--isalwa-motion-fast)] hover:opacity-70">
                {quote.accountName}
              </Link>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--isalwa-slate)]">Total</p>
            <p
              className="mt-1"
              style={{
                fontFamily: 'var(--isalwa-font-mono)',
                fontSize: 'clamp(1.25rem, 2vw, 1.6rem)',
                fontWeight: 600,
                color: 'var(--isalwa-kiln)',
                letterSpacing: '-0.02em',
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
              }}
            >
              {quote.total.label}
            </p>
          </div>
        </header>

        <Panel className="p-5">
          <ul className="space-y-3">
            {quote.items.map((i) => (
              <li key={i.id} className="flex flex-wrap justify-between gap-2 border-b border-[var(--isalwa-mist)] pb-3">
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
                <div className="text-right" style={{ fontFamily: 'var(--isalwa-font-mono)' }}>
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
          <Link href={`/cierre?account=${quote.accountId}`} className="text-[var(--isalwa-glaze)] transition-opacity duration-[var(--isalwa-motion-fast)] hover:opacity-70">
            Nueva cotización →
          </Link>
          <Link href={`/personas/${quote.accountId}`} className="text-[var(--isalwa-glaze)] transition-opacity duration-[var(--isalwa-motion-fast)] hover:opacity-70">
            ← Volver al dossier
          </Link>
        </div>
      </main>
    </AppShell>
  );
}
