import Link from 'next/link';
import { Panel, StatusPill } from '@isalwa/ui';
import { AppShell } from '@/components/app-shell';
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

  const minLat = Math.min(...data.points.map((p) => p.lat), -17.9);
  const maxLat = Math.max(...data.points.map((p) => p.lat), -17.3);
  const minLng = Math.min(...data.points.map((p) => p.lng), -63.4);
  const maxLng = Math.max(...data.points.map((p) => p.lng), -63.0);

  const project = (lat: number, lng: number) => {
    const x = ((lng - minLng) / (maxLng - minLng || 1)) * 100;
    const y = (1 - (lat - minLat) / (maxLat - minLat || 1)) * 100;
    return { left: `${x}%`, top: `${y}%` };
  };

  return (
    <AppShell active="/territorio">
      <main className="px-5 py-8 md:px-8">
        <header className="mb-6">
          <p className="text-[var(--isalwa-text-sm)] font-medium tracking-[0.12em] text-[var(--isalwa-glaze)] uppercase">
            Territorio
          </p>
          <h1 className="mt-2 text-[var(--isalwa-text-2xl)] font-semibold">Santa Cruz · clientes en el mapa</h1>
        </header>

        <Panel className="relative h-[420px] overflow-hidden p-0 md:h-[560px]">
          <div className="absolute inset-0 bg-[linear-gradient(160deg,#dfe8e4,#f7f5f2_45%,#e7eef2)]" />
          <div className="absolute inset-6 rounded-[var(--isalwa-radius-panel)] border border-[color-mix(in_srgb,var(--isalwa-kiln)_8%,transparent)]">
            {data.points.map((p) => {
              const pos = project(p.lat, p.lng);
              const color =
                p.creditStatus === 'ok'
                  ? 'var(--isalwa-glaze)'
                  : p.creditStatus === 'hold'
                    ? 'var(--isalwa-danger)'
                    : 'var(--isalwa-warning)';
              return (
                <Link
                  key={p.accountId}
                  href={p.href}
                  title={p.name}
                  className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white shadow"
                  style={{ left: pos.left, top: pos.top, background: color }}
                />
              );
            })}
          </div>
          <div className="absolute bottom-3 left-3 flex gap-2">
            <StatusPill tone="success">Crédito OK</StatusPill>
            <StatusPill tone="warning">Watch</StatusPill>
            <StatusPill tone="danger">Hold</StatusPill>
          </div>
        </Panel>

        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {data.points
            .filter((p) => p.code.startsWith('H-'))
            .map((p) => (
              <Panel key={p.accountId} className="p-3">
                <Link href={p.href} className="flex items-center justify-between">
                  <span className="font-medium">{p.name}</span>
                  <StatusPill tone="info">{p.territoryCode}</StatusPill>
                </Link>
              </Panel>
            ))}
        </div>
      </main>
    </AppShell>
  );
}
