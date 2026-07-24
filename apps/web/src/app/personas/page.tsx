import Link from 'next/link';
import { Panel, StatusPill } from '@isalwa/ui';
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
    const q = sp.q ? `?q=${encodeURIComponent(sp.q)}&take=60` : '?take=60';
    data = await apiGet<ListResponse>(`/accounts${q}`);
  } catch {
    data = { items: [] };
  }

  const heroes = data.items.filter((i) => i.code.startsWith('H-'));
  const rest = data.items.filter((i) => !i.code.startsWith('H-'));

  return (
    <AppShell active="/personas">
      <main className="px-5 py-8 md:px-8">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[var(--isalwa-text-sm)] font-medium tracking-[0.12em] text-[var(--isalwa-glaze)] uppercase">
              Personas
            </p>
            <h1 className="mt-2 text-[var(--isalwa-text-2xl)] font-semibold">Clientes vivos</h1>
          </div>
          <p className="text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]">Use ⌘K para encontrar al instante</p>
        </header>

        {heroes.length > 0 ? (
          <section className="mb-8">
            <h2 className="mb-3 text-[var(--isalwa-text-sm)] font-medium tracking-wide text-[var(--isalwa-slate)] uppercase">
              Cuentas que todos conocen
            </h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {heroes.map((a) => (
                <Panel key={a.id} className="p-4">
                  <Link href={`/personas/${a.id}`}>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{a.name}</h3>
                      <StatusPill tone="info">{a.segment}</StatusPill>
                    </div>
                    <p className="mt-2 line-clamp-2 text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]">
                      {a.aiSummary}
                    </p>
                    <p className="mt-3 text-[var(--isalwa-text-xs)] text-[var(--isalwa-glaze)]">
                      Score {a.relationshipScore} · {a.ownerName} · {a.territoryCode}
                    </p>
                  </Link>
                </Panel>
              ))}
            </div>
          </section>
        ) : null}

        <div className="overflow-hidden rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-white)]">
          <table className="w-full text-left text-[var(--isalwa-text-md)]">
            <thead className="bg-[var(--isalwa-porcelain)] text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]">
              <tr>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Seg.</th>
                <th className="px-4 py-3 font-medium">Score</th>
                <th className="px-4 py-3 font-medium">Crédito</th>
                <th className="px-4 py-3 font-medium">Asesor</th>
              </tr>
            </thead>
            <tbody>
              {rest.map((a) => (
                <tr key={a.id} className="border-t border-[var(--isalwa-mist)] hover:bg-[var(--isalwa-porcelain)]">
                  <td className="px-4 py-3">
                    <Link href={`/personas/${a.id}`} className="font-medium text-[var(--isalwa-kiln)]">
                      {a.name}
                    </Link>
                    <div className="text-[var(--isalwa-text-xs)] text-[var(--isalwa-slate)]">{a.code}</div>
                  </td>
                  <td className="px-4 py-3">{a.segment}</td>
                  <td className="px-4 py-3" style={{ fontFamily: 'var(--isalwa-font-mono)' }}>
                    {a.relationshipScore}
                  </td>
                  <td className="px-4 py-3">{a.creditStatus}</td>
                  <td className="px-4 py-3">{a.ownerName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </AppShell>
  );
}
