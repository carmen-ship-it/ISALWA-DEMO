import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExperienceHeader, PageContainer, Panel, StatusPill } from '@isalwa/ui';
import { AppShell } from '@/components/app-shell';
import { PaymentForm } from '@/components/payment-form';
import { apiGet } from '@/lib/api';

type Invoice = {
  id: string;
  number: string;
  status: string;
  accountId: string;
  accountName: string;
  issuedAt: string;
  dueAt: string;
  total: { label: string; centavos: number };
  balance: { label: string; centavos: number };
  quoteId: string | null;
  quoteNumber: string | null;
  items: Array<{
    id: string;
    productName: string;
    sku: string;
    qty: number;
    lineTotal: { label: string };
  }>;
  payments: Array<{
    id: string;
    amount: { label: string };
    method: string;
    paidAt: string;
  }>;
};

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let invoice: Invoice | null = null;
  try {
    invoice = await apiGet<Invoice>(`/invoices/${id}`);
  } catch {
    notFound();
  }
  if (!invoice) notFound();

  return (
    <AppShell active="/cierre">
      <PageContainer label={`Factura ${invoice.number}`}>
        <ExperienceHeader
          kicker="Factura"
          title={invoice.number}
          subtitle={
            <span className="flex flex-wrap items-center gap-2">
              <StatusPill tone={invoice.balance.centavos > 0 ? 'warning' : 'success'}>
                {invoice.status === 'paid'
                  ? 'Pagado'
                  : invoice.status === 'overdue'
                    ? 'Vencido'
                    : invoice.status === 'partial'
                      ? 'Parcial'
                      : invoice.status === 'open'
                        ? 'Abierto'
                        : invoice.status}
              </StatusPill>
              <StatusPill tone="neutral">
                Vence {new Date(invoice.dueAt).toLocaleDateString('es-BO')}
              </StatusPill>
              <Link
                href={`/personas/${invoice.accountId}`}
                className="text-[var(--isalwa-glaze)] transition-opacity duration-[var(--isalwa-motion-fast)] hover:opacity-70"
              >
                {invoice.accountName}
              </Link>
            </span>
          }
          actions={
            <div className="text-right">
              <p className="isalwa-section-label">Saldo</p>
              <p className="isalwa-metric mt-1 text-[clamp(1.25rem,2vw,1.6rem)] font-semibold">
                {invoice.balance.label}
              </p>
              <p className="mt-1 text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]">
                Total {invoice.total.label}
              </p>
            </div>
          }
        />

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel className="p-5">
            <h2 className="font-semibold">Líneas</h2>
            <ul className="mt-3 space-y-2">
              {invoice.items.map((i) => (
                <li key={i.id} className="flex justify-between gap-2 text-[var(--isalwa-text-md)]">
                  <span>
                    {i.qty} × {i.productName}
                  </span>
                  <span style={{ fontFamily: 'var(--isalwa-font-mono)' }}>{i.lineTotal.label}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel className="p-5">
            <h2 className="font-semibold">Cobranza</h2>
            <div className="mt-4">
              <PaymentForm invoiceId={invoice.id} balanceCentavos={invoice.balance.centavos} />
            </div>
            <ul className="mt-5 space-y-2 border-t border-[var(--isalwa-mist)] pt-4">
              {invoice.payments.map((p) => (
                <li key={p.id} className="flex justify-between text-[var(--isalwa-text-sm)]">
                  <span>
                    {new Date(p.paidAt).toLocaleDateString('es-BO')} · {p.method}
                  </span>
                  <span style={{ fontFamily: 'var(--isalwa-font-mono)' }}>{p.amount.label}</span>
                </li>
              ))}
              {invoice.payments.length === 0 ? (
                <li className="text-[var(--isalwa-slate)]">Sin pagos registrados todavía.</li>
              ) : null}
            </ul>
          </Panel>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/personas/${invoice.accountId}`}
            className="rounded-[var(--isalwa-radius-control)] bg-[var(--isalwa-glaze)] px-4 py-2 text-sm font-medium text-white cursor-pointer transition-[background-color] duration-[var(--isalwa-motion-fast)] ease-[var(--isalwa-ease-out)] hover:bg-[var(--isalwa-glaze-deep)] active:scale-[0.97] focus-visible:outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]"
          >
            Seguimiento en dossier
          </Link>
          <Link
            href={`/cierre?account=${invoice.accountId}`}
            className="rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-4 py-2 text-sm font-medium text-[var(--isalwa-kiln)] cursor-pointer transition-[border-color,color] duration-[var(--isalwa-motion-fast)] ease-[var(--isalwa-ease-out)] hover:border-[var(--isalwa-glaze)] hover:text-[var(--isalwa-glaze)] active:scale-[0.97] focus-visible:outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]"
          >
            Nueva oportunidad →
          </Link>
        </div>
      </PageContainer>
    </AppShell>
  );
}
