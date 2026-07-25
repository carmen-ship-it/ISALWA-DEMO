import { Suspense } from 'react';
import { AppShell } from '@/components/app-shell';
import { TerritoryMap } from '@/components/territory-map';
import { apiGet } from '@/lib/api';
import type { TerritoryPoint } from '@/lib/territorio/points';

export default async function TerritorioPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  // searchParams reserved for RSC filter hint; client syncs via URL
  await searchParams;

  let points: TerritoryPoint[] = [];
  try {
    const data = await apiGet<{ points: TerritoryPoint[] }>('/territorio/points?take=200');
    points = data.points;
  } catch {
    points = [];
  }

  return (
    <AppShell active="/territorio">
      <Suspense
        fallback={
          <div className="isalwa-page">
            <p className="isalwa-kicker">Territorio</p>
            <p
              className="mt-4 text-[var(--isalwa-slate)]"
              style={{ fontFamily: 'var(--isalwa-font-display)', fontStyle: 'italic' }}
            >
              Cargando territorio…
            </p>
          </div>
        }
      >
        <TerritoryMap points={points} />
      </Suspense>
    </AppShell>
  );
}
