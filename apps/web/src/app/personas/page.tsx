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

function creditLabel(status: string): string {
  if (status === 'ok') return 'Crédito OK';
  if (status === 'watch') return 'Vigilar';
  if (status === 'hold') return 'Bloqueado';
  return status;
}

function creditTone(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'ok') return 'success';
  if (status === 'watch') return 'warning';
  if (status === 'hold') return 'danger';
  return 'neutral';
}

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
      <main className="isalwa-page">
        <ExperienceHeader
          kicker="Personas"
          title="Clientes vivos"
          subtitle="No es una lista. Es el elenco de ISALWA — héroes primero, el resto con densidad limpia."
          actions={
            <p className="text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]">
              <kbd className="rounded border border-[var(--isalwa-mist)] border-b-2 bg-[var(--isalwa-porcelain)] px-1.5 py-0.5 font-[var(--isalwa-font-mono)] text-[10px] leading-none">
                ⌘K
              </kbd>{' '}
              encuentra en un latido
            </p>
          }
        />

        {heroes.length > 0 ? (
          <section className="mb-10">
            <h2 className="isalwa-section-label mb-4">Cuentas que todos conocen</h2>
            <div data-tour="personas-heroes" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {heroes.map((a, idx) => (
                <Panel
                  key={a.id}
                  interactive
                  className={`group isalwa-enter isalwa-enter-delay-${Math.min(idx + 1, 4)} flex h-full flex-col p-5 md:p-6`}
                >
                  <Link href={`/personas/${a.id}`} className="flex flex-1 flex-col" tabIndex={-1}>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[var(--isalwa-text-base)] font-semibold tracking-[-0.01em]">{a.name}</h3>
                      <StatusPill tone="info">Seg. {a.segment}</StatusPill>
                      <StatusPill tone={creditTone(a.creditStatus)}>
                        {creditLabel(a.creditStatus)}
                      </StatusPill>
                    </div>
                    <p className="mt-4 line-clamp-3 flex-1 text-[var(--isalwa-text-sm)] leading-relaxed text-[var(--isalwa-slate)]">
                      {a.aiSummary}
                    </p>
                    <div className="mt-5 flex items-center justify-between text-[var(--isalwa-text-xs)]">
                      <span className="text-[var(--isalwa-slate)]">
                        Score{' '}
                        <span className="isalwa-metric text-[var(--isalwa-text-sm)]">{a.relationshipScore}</span>
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

        {rest.length === 0 && heroes.length === 0 ? (
          <EmptyState
            title="Aún no hay clientes en el elenco"
            description="Personas es el elenco comercial de ISALWA — cuentas vivas con score, crédito y un resumen que habla como un colega."
            example="Cerámica del Valle · Seg. A · Score 82 · crédito OK"
            walkthrough={
              <span>
                Use{' '}
                <kbd className="rounded border border-[var(--isalwa-mist)] border-b-2 bg-[var(--isalwa-porcelain)] px-1 py-px font-[var(--isalwa-font-mono)] text-[10px]">
                  ⌘K
                </kbd>{' '}
                para buscar cuando la cartera esté cargada, o siembre el universo demo.
              </span>
            }
          />
        ) : rest.length > 0 ? (
          <section>
            <h2 className="isalwa-section-label mb-4">Cartera completa</h2>
            <div className="overflow-hidden rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-white)] shadow-[var(--isalwa-shadow-soft)]">
              <div className="personas-table-wrap overflow-x-auto">
                <table className="isalwa-table min-w-[640px]">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Seg.</th>
                      <th>Score</th>
                      <th>Crédito</th>
                      <th className="hidden md:table-cell">Asesor</th>
                      <th className="w-8" aria-hidden />
                    </tr>
                  </thead>
                  <tbody>
                    {rest.map((a) => (
                      <tr key={a.id} className="group cursor-pointer">
                        <td>
                          <Link
                            href={`/personas/${a.id}`}
                            className="font-medium transition-colors duration-[var(--isalwa-motion-fast)] hover:text-[var(--isalwa-glaze)] focus-visible:text-[var(--isalwa-glaze)] focus-visible:outline-none"
                          >
                            {a.name}
                          </Link>
                          <div className="mt-0.5 text-[var(--isalwa-text-xs)] text-[var(--isalwa-slate)]">{a.code}</div>
                        </td>
                        <td>
                          <StatusPill tone="neutral">{a.segment}</StatusPill>
                        </td>
                        <td>
                          <span className="isalwa-metric text-[var(--isalwa-text-md)]">{a.relationshipScore}</span>
                        </td>
                        <td>
                          <StatusPill tone={creditTone(a.creditStatus)}>
                            {creditLabel(a.creditStatus)}
                          </StatusPill>
                        </td>
                        <td className="hidden text-[var(--isalwa-slate)] md:table-cell">{a.ownerName}</td>
                        <td className="pr-4 text-right" aria-hidden>
                          <span className="text-xs text-[var(--isalwa-glaze)] opacity-0 transition-opacity duration-[var(--isalwa-motion-fast)] group-hover:opacity-60">
                            →
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="personas-mobile-cards divide-y divide-[var(--isalwa-mist)]">
                {rest.map((a) => (
                  <li key={`m-${a.id}`}>
                    <Link
                      href={`/personas/${a.id}`}
                      className="flex min-h-14 items-center justify-between gap-3 px-4 py-3.5 active:bg-[var(--isalwa-porcelain)]"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[var(--isalwa-kiln)]">{a.name}</p>
                        <p className="mt-0.5 text-[var(--isalwa-text-xs)] text-[var(--isalwa-slate)]">
                          {a.code} · Seg. {a.segment} · {creditLabel(a.creditStatus)}
                        </p>
                      </div>
                      <span className="isalwa-metric shrink-0 text-[var(--isalwa-text-md)]">
                        {a.relationshipScore}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}
      </main>
    </AppShell>
  );
}
