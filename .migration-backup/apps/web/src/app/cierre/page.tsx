import Link from 'next/link';
import { EmptyState, ExperienceHeader, Panel, StatusPill } from '@isalwa/ui';
import { AppShell } from '@/components/app-shell';
import { QuoteCanvas } from '@/components/quote-canvas';
import { apiGet } from '@/lib/api';

type AccountList = {
  items: Array<{ id: string; name: string; code: string }>;
};

type QuoteList = {
  items: Array<{
    id: string;
    number: string;
    status: string;
    accountName: string;
    total: { label: string };
    createdAt: string;
  }>;
};

export default async function CierrePage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string }>;
}) {
  const sp = await searchParams;
  let accounts: AccountList = { items: [] };
  let quotes: QuoteList = { items: [] };
  let accountId = sp.account;
  let accountName = 'Cliente';

  try {
    const hero = await apiGet<AccountList>('/accounts?q=H-NEG-001&take=5');
    accounts = await apiGet<AccountList>('/accounts?take=24');
    accountId =
      accountId ??
      hero.items.find((a) => a.code === 'H-NEG-001')?.id ??
      accounts.items[0]?.id;
    const selected =
      [...hero.items, ...accounts.items].find((a) => a.id === accountId) ??
      hero.items[0] ??
      accounts.items[0];
    if (selected) {
      accountId = selected.id;
      accountName = selected.name;
    }
    quotes = await apiGet<QuoteList>(
      accountId ? `/quotes?accountId=${accountId}` : '/quotes',
    );
  } catch {
    /* empty */
  }

  return (
    <AppShell active="/cierre">
      <main className="px-5 py-8 md:px-8">
        <ExperienceHeader
          kicker="Cierre"
          title="Cotizar con memoria. Cerrar con claridad."
          subtitle="Agregue un producto. El susurro de último precio es el momento. Enviar y aceptar genera la factura real."
          actions={
            <Link
              href="/personas"
              className="rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-[var(--isalwa-text-sm)] hover:border-[var(--isalwa-glaze)]"
            >
              Cambiar cliente
            </Link>
          }
        />

        {accountId ? (
          <QuoteCanvas accountId={accountId} accountName={accountName} />
        ) : (
          <EmptyState title="Sin cuentas disponibles" description="¿API y seed en línea?" />
        )}

        <section className="mt-8">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-[var(--isalwa-text-lg)] font-semibold">Cotizaciones recientes</h2>
            <StatusPill tone="neutral">Misma verdad operativa</StatusPill>
          </div>
          <div className="space-y-2">
            {quotes.items.slice(0, 8).map((q) => (
              <Panel key={q.id} interactive className="p-4">
                <Link
                  href={`/cierre/cotizaciones/${q.id}`}
                  className="flex flex-wrap items-center justify-between gap-2"
                >
                  <div>
                    <p className="font-medium">
                      {q.number} · {q.accountName}
                    </p>
                    <p className="text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]">
                      {new Date(q.createdAt).toLocaleString('es-BO')} · {q.status}
                    </p>
                  </div>
                  <span style={{ fontFamily: 'var(--isalwa-font-mono)' }}>{q.total.label}</span>
                </Link>
              </Panel>
            ))}
            {quotes.items.length === 0 ? (
              <EmptyState
                title="Aún no hay cotizaciones para este cliente"
                description="Cree la primera arriba — el susurro de precio es el momento."
              />
            ) : null}
          </div>
        </section>
      </main>
    </AppShell>
  );
}
