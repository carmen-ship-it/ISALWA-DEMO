import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { QuoteCanvas } from '@/components/quote-canvas';
import { StatusPill } from '@isalwa/ui';
import { apiGet } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

type AccountItem = {
  id:   string;
  name: string;
  code: string;
};

type AccountList = { items: AccountItem[] };

type QuoteItem = {
  id:          string;
  number:      string;
  status:      string;
  accountName: string;
  lineCount:   number;
  total:       { label: string };
  createdAt:   string;
  sentAt:      string | null;
};

type QuoteList = { items: QuoteItem[] };

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusTone(s: string): 'neutral' | 'info' | 'success' | 'danger' | 'warning' {
  if (s === 'draft')    return 'neutral';
  if (s === 'sent')     return 'info';
  if (s === 'accepted') return 'success';
  if (s === 'rejected') return 'danger';
  return 'warning';
}

function statusLabel(s: string): string {
  if (s === 'draft')    return 'Borrador';
  if (s === 'sent')     return 'Enviada';
  if (s === 'accepted') return 'Aceptada';
  if (s === 'rejected') return 'Rechazada';
  return s;
}

function formatRelDate(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  if (days < 30)  return `Hace ${days} días`;
  return new Date(dateStr).toLocaleDateString('es-BO', { day: 'numeric', month: 'short' });
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function CierrePage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string }>;
}) {
  const sp = await searchParams;

  let accountId:   string | undefined = sp.account;
  let accountName  = 'Cliente';
  let accountCode  = '';
  let quotes: QuoteList = { items: [] };

  try {
    const [hero, accounts] = await Promise.all([
      apiGet<AccountList>('/accounts?q=H-NEG-001&take=5'),
      apiGet<AccountList>('/accounts?take=24'),
    ]);

    // Resolve which account to quote
    const all      = [...hero.items, ...accounts.items];
    const selected = accountId
      ? all.find((a) => a.id === accountId)
      : hero.items.find((a) => a.code === 'H-NEG-001') ?? accounts.items[0];

    if (selected) {
      accountId   = selected.id;
      accountName = selected.name;
      accountCode = selected.code;
    }

    // Fetch recent quotes for this account
    if (accountId) {
      quotes = await apiGet<QuoteList>(`/quotes?accountId=${accountId}`);
    }
  } catch {
    // non-fatal — canvas renders empty
  }

  const recentQuotes = quotes.items.slice(0, 6);

  return (
    <AppShell active="/cierre">
      <main className="px-5 pb-12 pt-7 md:px-8 md:pt-8">

        {/* ── Page header ────────────────────────────────────────────────── */}
        <header style={{ marginBottom: 24 }}>
          <div
            style={{
              display:        'flex',
              alignItems:     'flex-start',
              justifyContent: 'space-between',
              gap:            24,
              flexWrap:       'wrap',
            }}
          >
            {/* Identity */}
            <div>
              <p
                style={{
                  fontSize:      11,
                  fontWeight:    700,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color:         'var(--isalwa-glaze)',
                  margin:        0,
                }}
              >
                Cierre
              </p>
              <h1
                style={{
                  fontFamily:    'var(--isalwa-font-display)',
                  fontStyle:     'italic',
                  fontWeight:    400,
                  fontSize:      'clamp(1.3rem, 2.2vw, 1.9rem)',
                  color:         'var(--isalwa-kiln)',
                  letterSpacing: '-0.01em',
                  lineHeight:    1.2,
                  marginTop:     8,
                }}
              >
                {accountName}
              </h1>
              {accountCode && (
                <p
                  style={{
                    fontFamily:    'var(--isalwa-font-mono)',
                    fontSize:      11,
                    color:         'var(--isalwa-slate)',
                    marginTop:     4,
                    letterSpacing: '0.04em',
                  }}
                >
                  {accountCode}
                  {recentQuotes.length > 0 && (
                    <span style={{ marginLeft: 10, opacity: 0.7 }}>
                      · {recentQuotes.length} cotización{recentQuotes.length !== 1 ? 'es' : ''} previas
                    </span>
                  )}
                </p>
              )}
            </div>

            {/* Change customer */}
            <Link
              href="/personas"
              style={{
                padding:       '8px 16px',
                borderRadius:  'var(--isalwa-radius-control)',
                border:        '1px solid var(--isalwa-mist)',
                background:    'white',
                color:         'var(--isalwa-kiln)',
                fontSize:      12,
                fontWeight:    600,
                letterSpacing: '-0.01em',
                display:       'flex',
                alignItems:    'center',
                gap:           6,
                flexShrink:    0,
                boxShadow:     'var(--isalwa-shadow-soft)',
                transition:    'border-color var(--isalwa-motion-fast) var(--isalwa-ease-out), background-color var(--isalwa-motion-fast) var(--isalwa-ease-out)',
              }}
            >
              ← Cambiar cliente
            </Link>
          </div>
        </header>

        {/* ── Quote canvas ────────────────────────────────────────────────── */}
        {accountId ? (
          <QuoteCanvas
            accountId={accountId}
            accountName={accountName}
            accountCode={accountCode}
          />
        ) : (
          <div
            style={{
              padding:      '48px 32px',
              textAlign:    'center',
              background:   'white',
              border:       '1px solid var(--isalwa-mist)',
              borderRadius: 'var(--isalwa-radius-panel)',
              color:        'var(--isalwa-slate)',
            }}
          >
            <p
              style={{
                fontFamily: 'var(--isalwa-font-display)',
                fontStyle:  'italic',
                fontSize:   '1.2rem',
              }}
            >
              Sin cuentas disponibles
            </p>
            <p style={{ fontSize: 12, marginTop: 8, opacity: 0.6 }}>
              ¿API y seed en línea?
            </p>
          </div>
        )}

        {/* ── Recent quotes ───────────────────────────────────────────────── */}
        {recentQuotes.length > 0 && (
          <section style={{ marginTop: 40 }}>
            {/* Section header */}
            <div
              style={{
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'space-between',
                marginBottom:   12,
              }}
            >
              <h2
                style={{
                  fontSize:      10,
                  fontWeight:    700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color:         'var(--isalwa-slate)',
                  margin:        0,
                }}
              >
                Historial de cotizaciones
              </h2>
              <span
                style={{
                  fontFamily:    'var(--isalwa-font-mono)',
                  fontSize:      11,
                  color:         'var(--isalwa-slate)',
                  opacity:       0.6,
                }}
              >
                {quotes.items.length} total
              </span>
            </div>

            {/* Quote table */}
            <div
              style={{
                background:   'white',
                border:       '1px solid var(--isalwa-mist)',
                borderRadius: 'var(--isalwa-radius-panel)',
                overflow:     'hidden',
                boxShadow:    'var(--isalwa-shadow-soft)',
              }}
            >
              {recentQuotes.map((q, i) => (
                <Link
                  key={q.id}
                  href={`/cierre/cotizaciones/${q.id}`}
                  style={{
                    display:        'grid',
                    gridTemplateColumns: 'auto 1fr auto auto 20px',
                    alignItems:     'center',
                    gap:            16,
                    padding:        '13px 20px',
                    borderBottom:   i < recentQuotes.length - 1
                      ? '1px solid var(--isalwa-mist)'
                      : 'none',
                    transition:     'background-color var(--isalwa-motion-fast) var(--isalwa-ease-out)',
                    textDecoration: 'none',
                  }}
                  // hover via CSS class below
                  className="cierre-quote-row"
                >
                  {/* Quote number */}
                  <span
                    style={{
                      fontFamily:    'var(--isalwa-font-mono)',
                      fontSize:      12,
                      fontWeight:    600,
                      color:         'var(--isalwa-kiln)',
                      letterSpacing: '-0.01em',
                      whiteSpace:    'nowrap',
                    }}
                  >
                    {q.number}
                  </span>

                  {/* Date + lines */}
                  <span style={{ fontSize: 12, color: 'var(--isalwa-slate)' }}>
                    {formatRelDate(q.createdAt)}
                    {q.lineCount != null && (
                      <span style={{ marginLeft: 8, opacity: 0.55 }}>
                        · {q.lineCount} {q.lineCount === 1 ? 'línea' : 'líneas'}
                      </span>
                    )}
                  </span>

                  {/* Status pill */}
                  <StatusPill tone={statusTone(q.status)}>
                    {statusLabel(q.status)}
                  </StatusPill>

                  {/* Total */}
                  <span
                    style={{
                      fontFamily:    'var(--isalwa-font-mono)',
                      fontSize:      13,
                      fontWeight:    600,
                      color:         'var(--isalwa-kiln)',
                      letterSpacing: '-0.02em',
                      whiteSpace:    'nowrap',
                    }}
                  >
                    {q.total.label}
                  </span>

                  {/* Arrow */}
                  <span style={{ color: 'var(--isalwa-slate)', opacity: 0.35, fontSize: 14 }}>
                    →
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </AppShell>
  );
}
