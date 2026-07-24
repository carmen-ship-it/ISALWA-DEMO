import Link from 'next/link';
import { Panel, StatusPill } from '@isalwa/ui';
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
        <header className="mb-6 max-w-3xl">
          <p className="text-[var(--isalwa-text-sm)] font-medium tracking-[0.12em] text-[var(--isalwa-glaze)] uppercase">
            Cierre
          </p>
          <h1
            className="mt-2 text-[var(--isalwa-text-2xl)] text-[var(--isalwa-kiln)]"
            style={{ fontFamily: 'var(--isalwa-font-display)' }}
          >
            Cotizar con memoria. Cerrar con claridad.
          </h1>
          <p className="mt-2 text-[var(--isalwa-text-md)] text-[var(--isalwa-slate)]">
            El margen deja de vivir en WhatsApp. Cada línea recuerda la relación.
          </p>
        </header>

        {accountId ? (
          <QuoteCanvas accountId={accountId} accountName={accountName} />
        ) : (
          <Panel className="p-5 text-[var(--isalwa-slate)]">
            No hay cuentas disponibles. ¿API y seed en línea?
          </Panel>
        )}

        <section className="mt-8">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-[var(--isalwa-text-lg)] font-semibold">Cotizaciones recientes</h2>
            <StatusPill tone="neutral">Misma verdad operativa</StatusPill>
          </div>
          <div className="space-y-2">
            {quotes.items.slice(0, 8).map((q) => (
              <Panel key={q.id} className="p-4">
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
              <Panel className="p-4 text-[var(--isalwa-slate)]">
                Aún no hay cotizaciones para este cliente — cree la primera arriba.
              </Panel>
            ) : null}
          </div>
        </section>

        <p className="mt-6 text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]">
          ¿Otro cliente?{' '}
          <Link href="/personas" className="text-[var(--isalwa-glaze)] underline-offset-2 hover:underline">
            Abrir Personas
          </Link>
        </p>
      </main>
    </AppShell>
  );
}
