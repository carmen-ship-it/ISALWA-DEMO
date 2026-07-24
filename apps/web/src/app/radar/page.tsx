import Link from 'next/link';
import { Panel, StatusPill } from '@isalwa/ui';
import { AppShell } from '@/components/app-shell';
import { apiGet } from '@/lib/api';

type RadarResponse = {
  items: Array<{
    id: string;
    title: string;
    reason: string | Record<string, unknown>;
    score: number;
    href: string;
    kind: string;
    segment: string | null;
  }>;
};

export default async function RadarPage() {
  let data: RadarResponse = { items: [] };
  try {
    data = await apiGet<RadarResponse>('/radar/items');
  } catch {
    data = { items: [] };
  }

  return (
    <AppShell active="/radar">
      <main className="px-5 py-8 md:px-8">
        <header className="mb-6">
          <p className="text-[var(--isalwa-text-sm)] font-medium tracking-[0.12em] text-[var(--isalwa-glaze)] uppercase">
            Radar
          </p>
          <h1 className="mt-2 text-[var(--isalwa-text-2xl)] font-semibold">¿Quién necesita atención hoy?</h1>
        </header>
        <div className="space-y-3">
          {data.items.map((item) => (
            <Panel key={item.id} className="p-4 transition-shadow hover:shadow-[var(--isalwa-shadow-soft)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <Link href={item.href} className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{item.title}</h2>
                    {item.segment ? <StatusPill tone="info">Seg. {item.segment}</StatusPill> : null}
                    <StatusPill tone={item.kind === 'collections' ? 'danger' : 'warning'}>
                      {item.kind === 'visit_gap' ? 'Silencio' : item.kind === 'collections' ? 'Cartera' : item.kind}
                    </StatusPill>
                  </div>
                  <p className="mt-1 text-[var(--isalwa-text-md)] text-[var(--isalwa-slate)]">
                    {typeof item.reason === 'string'
                      ? item.reason
                      : String((item.reason as { reason?: string })?.reason ?? 'Requiere seguimiento')}
                  </p>
                </Link>
                <div className="flex flex-col items-end gap-2">
                  <span style={{ fontFamily: 'var(--isalwa-font-mono)' }} className="text-[var(--isalwa-glaze)]">
                    {item.score}
                  </span>
                  <Link
                    href={item.href}
                    className="text-[var(--isalwa-text-sm)] text-[var(--isalwa-glaze)] hover:underline"
                  >
                    Abrir
                  </Link>
                  {item.kind === 'collections' && item.href.includes('/personas/') ? (
                    <Link
                      href={item.href}
                      className="text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)] hover:underline"
                    >
                      Ver dinero →
                    </Link>
                  ) : null}
                </div>
              </div>
            </Panel>
          ))}
          {data.items.length === 0 ? (
            <Panel className="p-5 text-[var(--isalwa-slate)]">Sin alertas abiertas — o la API no está disponible.</Panel>
          ) : null}
        </div>
      </main>
    </AppShell>
  );
}
