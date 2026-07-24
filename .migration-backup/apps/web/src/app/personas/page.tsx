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
              ⌘K encuentra en un latido
            </p>
          }
        />

        {heroes.length > 0 ? (
          <section className="mb-8">
            <h2 className="mb-3 text-[var(--isalwa-text-sm)] font-medium tracking-wide text-[var(--isalwa-slate)] uppercase">
              Cuentas que todos conocen
            </h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {heroes.map((a, idx) => (
                <Panel
                  key={a.id}
                  interactive
                  className={`isalwa-enter isalwa-enter-delay-${Math.min(idx + 1, 4)} p-5`}
                >
                  <Link href={`/personas/${a.id}`} className="block">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{a.name}</h3>
                      <StatusPill tone="info">Seg. {a.segment}</StatusPill>
                      <StatusPill tone={a.creditStatus === 'ok' ? 'success' : 'danger'}>
                        {a.creditStatus}
                      </StatusPill>
                    </div>
                    <p className="mt-3 line-clamp-3 text-[var(--isalwa-text-sm)] leading-relaxed text-[var(--isalwa-slate)]">
                      {a.aiSummary}
                    </p>
                    <div className="mt-4 flex items-center justify-between text-[var(--isalwa-text-xs)] text-[var(--isalwa-glaze)]">
                      <span>
                        Score {a.relationshipScore} · {a.ownerName}
                      </span>
                      <span className="opacity-0 transition-opacity group-hover:opacity-100">Abrir →</span>
                    </div>
                  </Link>
                </Panel>
              ))}
            </div>
          </section>
        ) : null}

        {rest.length === 0 && heroes.length === 0 ? (
          <EmptyState
            title="Sin clientes"
            description="Seedee el universo demo para llenar Personas."
          />
        ) : (
          <div className="overflow-hidden rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-white)] shadow-[var(--isalwa-shadow-soft)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-[var(--isalwa-text-md)]">
                <thead className="bg-[var(--isalwa-porcelain)] text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Cliente</th>
                    <th className="px-4 py-3 font-medium">Seg.</th>
                    <th className="px-4 py-3 font-medium">Score</th>
                    <th className="px-4 py-3 font-medium">Crédito</th>
                    <th className="hidden px-4 py-3 font-medium md:table-cell">Asesor</th>
                  </tr>
                </thead>
                <tbody>
                  {rest.map((a) => (
                    <tr
                      key={a.id}
                      className="border-t border-[var(--isalwa-mist)] transition-colors hover:bg-[color-mix(in_srgb,var(--isalwa-glaze)_4%,white)]"
                    >
                      <td className="px-4 py-3">
                        <Link href={`/personas/${a.id}`} className="font-medium hover:text-[var(--isalwa-glaze)]">
                          {a.name}
                        </Link>
                        <div className="text-[var(--isalwa-text-xs)] text-[var(--isalwa-slate)]">{a.code}</div>
                      </td>
                      <td className="px-4 py-3">{a.segment}</td>
                      <td className="px-4 py-3" style={{ fontFamily: 'var(--isalwa-font-mono)' }}>
                        {a.relationshipScore}
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill tone={a.creditStatus === 'ok' ? 'success' : 'warning'}>
                          {a.creditStatus}
                        </StatusPill>
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">{a.ownerName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}
