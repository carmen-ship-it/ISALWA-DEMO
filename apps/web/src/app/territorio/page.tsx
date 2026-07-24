import Link from 'next/link';
import { EmptyState, ExperienceHeader, Panel, StatusPill } from '@isalwa/ui';
import { AppShell } from '@/components/app-shell';
import { TerritoryMap } from '@/components/territory-map';
import { apiGet } from '@/lib/api';

type Points = {
  points: Array<{
    accountId: string;
    name: string;
    segment: string;
    creditStatus: string;
    lat: number;
    lng: number;
    territoryCode: string;
    href: string;
    code: string;
  }>;
};

export default async function TerritorioPage() {
  let data: Points = { points: [] };
  try {
    data = await apiGet<Points>('/territorio/points?take=200');
  } catch {
    data = { points: [] };
  }

  const heroes = data.points.filter((p) => p.code.startsWith('H-'));

  return (
    <AppShell active="/territorio">
      <main className="px-5 py-8 md:px-8">
        <ExperienceHeader
          kicker="Territorio"
          title="Santa Cruz · el dinero tiene geografía"
          subtitle="Explore. Pase el cursor. Los héroes brillan más grandes. El riesgo se pinta solo."
        />

        {data.points.length === 0 ? (
          <EmptyState
            title="Mapa sin puntos"
            description="Cuando la API y el seed estén listos, el territorio cobra vida."
          />
        ) : (
          <TerritoryMap points={data.points} />
        )}

        {heroes.length > 0 ? (
          <section className="mt-6">
            <h2 className="mb-3 text-[var(--isalwa-text-sm)] font-medium tracking-wide text-[var(--isalwa-slate)] uppercase">
              Anclas del Demo Journey
            </h2>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {heroes.map((p) => (
                <Panel key={p.accountId} interactive className="p-3">
                  <Link href={p.href} className="flex items-center justify-between gap-2">
                    <span className="font-medium">{p.name}</span>
                    <StatusPill tone="info">{p.territoryCode}</StatusPill>
                  </Link>
                </Panel>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </AppShell>
  );
}
