import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { QuoteCanvas } from '@/components/quote-canvas';
import { ExperienceHeader, PageContainer, StatusPill } from '@isalwa/ui';
import { apiGet } from '@/lib/api';

type AccountItem = {
  id: string;
  name: string;
  code: string;
};

type AccountList = { items: AccountItem[] };

type QuoteItem = {
  id: string;
  number: string;
  status: string;
  accountName: string;
  lineCount: number;
  total: { label: string };
  createdAt: string;
  sentAt: string | null;
};

type QuoteList = { items: QuoteItem[] };

function statusTone(s: string): 'neutral' | 'info' | 'success' | 'danger' | 'warning' {
  if (s === 'draft') return 'neutral';
  if (s === 'sent') return 'info';
  if (s === 'accepted') return 'success';
  if (s === 'rejected') return 'danger';
  return 'warning';
}

function statusLabel(s: string): string {
  if (s === 'draft') return 'Borrador';
  if (s === 'sent') return 'Enviada';
  if (s === 'accepted') return 'Aceptada';
  if (s === 'rejected') return 'Rechazada';
  return s;
}

function formatRelDate(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  if (days < 30) return `Hace ${days} días`;
  return new Date(dateStr).toLocaleDateString('es-BO', { day: 'numeric', month: 'short' });
}

export default async function CierrePage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string }>;
}) {
  const sp = await searchParams;

  let accountId: string | undefined = sp.account;
  let accountName = 'Cliente';
  let accountCode = '';
  let quotes: QuoteList = { items: [] };

  try {
    const [hero, accounts] = await Promise.all([
      apiGet<AccountList>('/accounts?q=H-NEG-001&take=5'),
      apiGet<AccountList>('/accounts?take=24'),
    ]);

    const all = [...hero.items, ...accounts.items];
    const selected = accountId
      ? all.find((a) => a.id === accountId)
      : (hero.items.find((a) => a.code === 'H-NEG-001') ?? accounts.items[0]);

    if (selected) {
      accountId = selected.id;
      accountName = selected.name;
      accountCode = selected.code;
    }

    if (accountId) {
      quotes = await apiGet<QuoteList>(`/quotes?accountId=${accountId}`);
    }
  } catch {
    // non-fatal — canvas renders empty
  }

  const recentQuotes = quotes.items.slice(0, 6);

  return (
    <AppShell active="/cierre">
      <PageContainer label="Cierre">
        <ExperienceHeader
          kicker="Cierre"
          title={accountName}
          subtitle={
            accountCode ? (
              <span className="font-[var(--isalwa-font-mono)] text-[var(--isalwa-text-2xs)] tracking-[0.04em]">
                {accountCode}
                {recentQuotes.length > 0 ? (
                  <span className="ml-2 opacity-70">
                    · {recentQuotes.length} cotización{recentQuotes.length !== 1 ? 'es' : ''} previas
                  </span>
                ) : (
                  ' · Construya la cotización con precios que el cliente ya conoce'
                )}
              </span>
            ) : (
              'Construya la cotización con precios que el cliente ya conoce'
            )
          }
          actions={
            <Link
              href="/personas"
              className="inline-flex h-10 items-center rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-4 text-[var(--isalwa-text-sm)] font-medium text-[var(--isalwa-kiln)] shadow-[var(--isalwa-shadow-soft)] transition-[border-color,background-color,box-shadow] duration-[var(--isalwa-motion-fast)] ease-[var(--isalwa-ease-out)] hover:border-[var(--isalwa-glaze)] hover:bg-[var(--isalwa-porcelain)] hover:shadow-[var(--isalwa-shadow-lift)] focus-visible:outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]"
            >
              ← Cambiar cliente
            </Link>
          }
        />

        {accountId ? (
          <QuoteCanvas accountId={accountId} accountName={accountName} accountCode={accountCode} />
        ) : (
          <div className="rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-white px-8 py-12 text-center shadow-[var(--isalwa-shadow-soft)]">
            <p
              className="text-[1.2rem] text-[var(--isalwa-kiln)]"
              style={{ fontFamily: 'var(--isalwa-font-display)', fontStyle: 'italic' }}
            >
              Sin cuentas disponibles
            </p>
            <p className="mt-2 text-[var(--isalwa-text-xs)] text-[var(--isalwa-slate)] opacity-60">
              ¿API y seed en línea?
            </p>
          </div>
        )}

        {recentQuotes.length > 0 ? (
          <section className="mt-10">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="isalwa-section-label">Historial de cotizaciones</h2>
              <span className="font-[var(--isalwa-font-mono)] text-[var(--isalwa-text-2xs)] text-[var(--isalwa-slate)] opacity-60">
                {quotes.items.length} total
              </span>
            </div>

            <div className="overflow-hidden rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-white shadow-[var(--isalwa-shadow-soft)]">
              {recentQuotes.map((q, i) => (
                <Link
                  key={q.id}
                  href={`/cierre/cotizaciones/${q.id}`}
                  className="cierre-quote-row grid grid-cols-[auto_1fr_auto_auto_20px] items-center gap-4 px-5 py-4 no-underline md:px-6"
                  style={{
                    borderBottom:
                      i < recentQuotes.length - 1
                        ? '1px solid color-mix(in srgb, var(--isalwa-mist) 85%, white)'
                        : 'none',
                  }}
                >
                  <span className="isalwa-metric whitespace-nowrap text-[var(--isalwa-text-xs)] font-semibold">
                    {q.number}
                  </span>
                  <span className="text-[var(--isalwa-text-xs)] text-[var(--isalwa-slate)]">
                    {formatRelDate(q.createdAt)}
                    {q.lineCount != null ? (
                      <span className="ml-2 opacity-55">
                        · {q.lineCount} {q.lineCount === 1 ? 'línea' : 'líneas'}
                      </span>
                    ) : null}
                  </span>
                  <StatusPill tone={statusTone(q.status)}>{statusLabel(q.status)}</StatusPill>
                  <span className="isalwa-metric whitespace-nowrap text-[var(--isalwa-text-sm)] font-semibold">
                    {q.total.label}
                  </span>
                  <span className="text-[14px] text-[var(--isalwa-slate)] opacity-35">→</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </PageContainer>
    </AppShell>
  );
}
