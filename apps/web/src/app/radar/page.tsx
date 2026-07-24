import Link from 'next/link';
import { EmptyState, ExperienceHeader, Panel, StatusPill } from '@isalwa/ui';
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

function riskWidth(score: number) {
  return `${Math.min(100, Math.max(8, score))}%`;
}

function kindLabel(kind: string) {
  if (kind === 'visit_gap') return 'Silencio';
  if (kind === 'collections') return 'Cartera';
  return kind;
}

export default async function RadarPage() {
  let data: RadarResponse = { items: [] };
  let error: string | null = null;
  try {
    data = await apiGet<RadarResponse>('/radar/items');
  } catch {
    error = 'Radar no disponible';
    data = { items: [] };
  }

  return (
    <AppShell active="/radar">
      <main className="px-5 py-8 md:px-8">
        <ExperienceHeader
          kicker="Radar"
          title="¿Quién necesita atención hoy?"
          subtitle="La urgencia se ve antes de leer. La barra es el riesgo — el texto confirma."
        />

        {error ? (
          <EmptyState title={error} description="Reintente cuando la API esté en línea." />
        ) : null}

        <div className="space-y-3">
          {data.items.map((item, idx) => {
            const reason =
              typeof item.reason === 'string'
                ? item.reason
                : String((item.reason as { reason?: string })?.reason ?? 'Requiere seguimiento');
            const tone = item.kind === 'collections' ? 'danger' : 'warning';
            const bar =
              item.kind === 'collections' ? 'var(--isalwa-danger)' : 'var(--isalwa-warning)';
            return (
              <Panel
                key={item.id}
                interactive
                className={`isalwa-enter isalwa-enter-delay-${Math.min((idx % 4) + 1, 4)} overflow-hidden p-0`}
              >
                <Link href={item.href} className="block p-4 md:p-5">
                  <div className="isalwa-risk-bar mb-3">
                    <span style={{ width: riskWidth(item.score), background: bar }} />
                  </div>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold">{item.title}</h2>
                        {item.segment ? <StatusPill tone="info">Seg. {item.segment}</StatusPill> : null}
                        <StatusPill tone={tone}>{kindLabel(item.kind)}</StatusPill>
                      </div>
                      <p className="mt-1 text-[var(--isalwa-text-md)] text-[var(--isalwa-slate)]">{reason}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        style={{ fontFamily: 'var(--isalwa-font-mono)' }}
                        className="text-[var(--isalwa-text-lg)] text-[var(--isalwa-glaze)]"
                      >
                        {item.score}
                      </span>
                      <span className="text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]">Abrir →</span>
                    </div>
                  </div>
                </Link>
              </Panel>
            );
          })}
          {data.items.length === 0 && !error ? (
            <EmptyState
              title="Sin alertas abiertas"
              description="El Radar está en calma. Eso también es una señal."
              action={
                <Link href="/pulso" className="text-[var(--isalwa-glaze)] hover:underline">
                  Volver a Pulso
                </Link>
              }
            />
          ) : null}
        </div>
      </main>
    </AppShell>
  );
}
