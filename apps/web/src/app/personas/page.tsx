import Link from 'next/link';
import { EmptyState, ExperienceHeader, Panel, StatusPill } from '@isalwa/ui';
import { AppShell } from '@/components/app-shell';
import { apiGet } from '@/lib/api';

type ListResponse = {
  items: Array<{
    id: string;
    code: string;
    name: string;
    segment: string;
    personaKey: string | null;
    relationshipScore: number;
    creditStatus: string;
    ownerName: string;
    territoryCode: string;
    aiSummary: string | null;
  }>;
};

// ── Credit status helpers ──────────────────────────────────────────────────────

function creditLabel(status: string): string {
  if (status === 'ok')    return 'Crédito OK';
  if (status === 'watch') return 'Vigilar';
  if (status === 'hold')  return 'Bloqueado';
  return status;
}

function creditTone(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'ok')    return 'success';
  if (status === 'watch') return 'warning';
  if (status === 'hold')  return 'danger';
  return 'neutral';
}

// ─────────────────────────────────────────────────────────────────────────────

export default async function PersonasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  let data: ListResponse = { items: [] };
  try {
    const q = sp.q ? `?q=${encodeURIComponent(sp.q)}&take=60` : '?take=80';
    data = await apiGet<ListResponse>(`/accounts${q}`);
  } catch {
    data = { items: [] };
  }

  const heroes = data.items.filter((i) => i.code.startsWith('H-'));
  const rest = data.items.filter((i) => !i.code.startsWith('H-'));

  return (
    <AppShell active="/personas">
      <main className="px-5 py-8 md:px-8">
        <ExperienceHeader
          kicker="Personas"
          title="Clientes vivos"
          subtitle="No es una lista. Es el elenco de ISALWA — héroes primero, el resto con densidad limpia."
          actions={
            <p className="text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]">
              <kbd className="rounded border border-[var(--isalwa-mist)] border-b-2 bg-[var(--isalwa-porcelain)] px-1 py-px font-[var(--isalwa-font-mono)] text-[10px] leading-none">⌘K</kbd>
              {' '}encuentra en un latido
            </p>
          }
        />

        {/* ── Héroe cards ─────────────────────────────────────────────────── */}
        {heroes.length > 0 ? (
          <section className="mb-8">
            <h2 className="mb-3 text-[var(--isalwa-text-sm)] font-medium tracking-wide text-[var(--isalwa-slate)] uppercase">
              Cuentas que todos conocen
            </h2>
            <div data-tour="personas-heroes" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {heroes.map((a, idx) => (
                <Panel
                  key={a.id}
                  interactive
                  className={`group isalwa-enter isalwa-enter-delay-${Math.min(idx + 1, 4)} p-5`}
                >
                  <Link href={`/personas/${a.id}`} className="block" tabIndex={-1}>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{a.name}</h3>
                      <StatusPill tone="info">Seg. {a.segment}</StatusPill>
                      <StatusPill tone={creditTone(a.creditStatus)}>
                        {creditLabel(a.creditStatus)}
                      </StatusPill>
                    </div>
                    <p className="mt-3 line-clamp-3 text-[var(--isalwa-text-sm)] leading-relaxed text-[var(--isalwa-slate)]">
                      {a.aiSummary}
                    </p>
                    <div className="mt-4 flex items-center justify-between text-[var(--isalwa-text-xs)]">
                      <span className="text-[var(--isalwa-slate)]">
                        Score{' '}
                        <span style={{ fontFamily: 'var(--isalwa-font-mono)', fontVariantNumeric: 'tabular-nums' }}>
                          {a.relationshipScore}
                        </span>
                        {' '}· {a.ownerName}
                      </span>
                      <span
                        className="text-[var(--isalwa-glaze)] opacity-0 transition-opacity duration-[var(--isalwa-motion-fast)] ease-[var(--isalwa-ease-out)] group-hover:opacity-100"
                        aria-hidden
                      >
                        Abrir →
                      </span>
                    </div>
                  </Link>
                </Panel>
              ))}
            </div>
          </section>
        ) : null}

        {/* ── Rest table ──────────────────────────────────────────────────── */}
        {rest.length === 0 && heroes.length === 0 ? (
          <EmptyState
            title="Sin clientes"
            description="Seedee el universo demo para llenar Personas."
          />
        ) : rest.length > 0 ? (
          <div className="overflow-hidden rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-white)] shadow-[var(--isalwa-shadow-soft)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-[var(--isalwa-text-md)]">
                <thead>
                  <tr className="bg-[var(--isalwa-porcelain)] text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]">
                    <th className="px-4 py-3 font-medium border-b border-[var(--isalwa-mist)]">Cliente</th>
                    <th className="px-4 py-3 font-medium border-b border-[var(--isalwa-mist)]">Seg.</th>
                    <th className="px-4 py-3 font-medium border-b border-[var(--isalwa-mist)]">Score</th>
                    <th className="px-4 py-3 font-medium border-b border-[var(--isalwa-mist)]">Crédito</th>
                    <th className="hidden px-4 py-3 font-medium border-b border-[var(--isalwa-mist)] md:table-cell">Asesor</th>
                    <th className="w-8 border-b border-[var(--isalwa-mist)]" aria-hidden />
                  </tr>
                </thead>
                <tbody>
                  {rest.map((a) => (
                    <tr
                      key={a.id}
                      className="group border-t border-[var(--isalwa-mist)] cursor-pointer transition-colors duration-[var(--isalwa-motion-fast)] ease-[var(--isalwa-ease-out)] hover:bg-[color-mix(in_srgb,var(--isalwa-glaze)_4%,white)]"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/personas/${a.id}`}
                          className="font-medium transition-colors duration-[var(--isalwa-motion-fast)] hover:text-[var(--isalwa-glaze)] focus-visible:text-[var(--isalwa-glaze)] focus-visible:outline-none"
                        >
                          {a.name}
                        </Link>
                        <div className="text-[var(--isalwa-text-xs)] text-[var(--isalwa-slate)]">{a.code}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-block rounded px-1.5 py-0.5 text-[var(--isalwa-text-xs)] font-semibold tracking-wide bg-[var(--isalwa-mist)] text-[var(--isalwa-slate)]"
                        >
                          {a.segment}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3 text-[var(--isalwa-kiln)]"
                        style={{ fontFamily: 'var(--isalwa-font-mono)', fontVariantNumeric: 'tabular-nums' }}
                      >
                        {a.relationshipScore}
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill tone={creditTone(a.creditStatus)}>
                          {creditLabel(a.creditStatus)}
                        </StatusPill>
                      </td>
                      <td className="hidden px-4 py-3 text-[var(--isalwa-slate)] md:table-cell">{a.ownerName}</td>
                      {/* Row navigate indicator */}
                      <td className="pr-4 text-right text-[var(--isalwa-slate)]" aria-hidden>
                        <span className="opacity-0 transition-opacity duration-[var(--isalwa-motion-fast)] group-hover:opacity-60 text-xs text-[var(--isalwa-glaze)]">→</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </main>
    </AppShell>
  );
}
