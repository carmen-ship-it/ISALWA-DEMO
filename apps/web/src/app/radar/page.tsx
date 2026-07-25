import Link from 'next/link';
import { EmptyState, ExperienceHeader, PageContainer, Panel, StatusPill, cx } from '@isalwa/ui';
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
      <PageContainer label="Radar">
        <ExperienceHeader
          kicker="Radar"
          title="¿Quién necesita atención hoy?"
          subtitle="La urgencia se ve antes de leer. La barra es el riesgo — el texto confirma."
        />

        {error ? <EmptyState title={error} description="Reintente cuando la API esté en línea." /> : null}

        <div data-tour="radar-list" className="space-y-3">
          {data.items.map((item, idx) => {
            const reason =
              typeof item.reason === 'string'
                ? item.reason
                : String((item.reason as { reason?: string })?.reason ?? 'Requiere seguimiento');
            const critical = item.score >= 90;
            const tone = item.kind === 'collections' || critical ? 'danger' : 'warning';
            const bar =
              item.kind === 'collections' || critical
                ? 'var(--isalwa-danger)'
                : 'var(--isalwa-warning)';
            return (
              <Panel
                key={item.id}
                interactive
                className={cx(
                  `group isalwa-enter isalwa-enter-delay-${Math.min((idx % 4) + 1, 4)} overflow-hidden p-0`,
                  critical && 'ring-1 ring-[color-mix(in_srgb,var(--isalwa-danger)_18%,transparent)]',
                )}
              >
                <Link
                  href={item.href}
                  className="block p-5 focus-visible:outline-none focus-visible:shadow-[inset_0_0_0_2px_color-mix(in_srgb,var(--isalwa-glaze)_35%,transparent)] md:p-6"
                >
                  <div className={cx('isalwa-risk-bar mb-4', critical && 'h-1')}>
                    <span style={{ width: riskWidth(item.score), background: bar }} />
                  </div>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-[var(--isalwa-text-base)] font-semibold leading-snug tracking-[-0.01em]">
                          {item.title}
                        </h2>
                        {item.segment ? <StatusPill tone="info">Seg. {item.segment}</StatusPill> : null}
                        <StatusPill tone={tone}>{kindLabel(item.kind)}</StatusPill>
                        {critical ? <StatusPill tone="danger">Crítico</StatusPill> : null}
                      </div>
                      <p className="mt-2 text-[var(--isalwa-text-md)] leading-relaxed text-[var(--isalwa-slate)]">
                        {reason}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span
                        className="isalwa-metric text-[clamp(20px,1.6vw,26px)]"
                        style={{ color: bar, fontWeight: critical ? 600 : 500 }}
                      >
                        {item.score}
                      </span>
                      <span className="text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)] opacity-40 transition-opacity duration-[var(--isalwa-motion-fast)] group-hover:opacity-100">
                        Abrir →
                      </span>
                    </div>
                  </div>
                </Link>
              </Panel>
            );
          })}
          {data.items.length === 0 && !error ? (
            <EmptyState
              title="Radar en calma"
              description="Hoy no hay clientes empujando urgencia. Eso también es una señal — el sistema vigila mientras usted decide el siguiente movimiento."
              example="Cuando un cliente acumula silencio o cartera en riesgo, aparece aquí con una barra de urgencia y un motivo claro."
              walkthrough={
                <Link href="/personas" className="text-[var(--isalwa-glaze)] hover:opacity-70">
                  Revisar Personas mientras el Radar descansa →
                </Link>
              }
              action={
                <Link
                  href="/pulso"
                  className="text-[var(--isalwa-glaze)] transition-opacity duration-[var(--isalwa-motion-fast)] hover:opacity-70"
                >
                  Volver a Pulso
                </Link>
              }
            />
          ) : null}
        </div>
      </PageContainer>
    </AppShell>
  );
}
