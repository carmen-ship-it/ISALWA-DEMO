import Link from 'next/link';
import { EmptyState, ExperienceHeader, Panel, StatusPill } from '@isalwa/ui';
import type { PulseResponse } from '@isalwa/contracts';
import { AppShell } from '@/components/app-shell';
import { AnimatedValue } from '@/components/animated-value';
import { apiGet } from '@/lib/api';

const toneAccent: Record<string, string> = {
  success: 'var(--isalwa-success)',
  warning: 'var(--isalwa-warning)',
  danger: 'var(--isalwa-danger)',
  info: 'var(--isalwa-info)',
  neutral: 'var(--isalwa-glaze)',
};

export default async function PulsoPage() {
  let pulse: PulseResponse | null = null;
  let error: string | null = null;
  try {
    pulse = await apiGet<PulseResponse>('/pulse');
  } catch {
    error = 'No se pudo cargar Pulso. ¿API y base de datos en línea?';
  }

  return (
    <AppShell active="/pulso">
      <main className="px-5 py-8 md:px-8">
        <ExperienceHeader
          kicker="Pulso"
          title={pulse?.sentence ?? (error ? 'Sin señal del negocio' : 'Escuchando el pulso…')}
          subtitle={
            pulse
              ? 'Cuatro vitales. Una oración. Tres focos. Diez segundos para saber si ISALWA está sano.'
              : undefined
          }
          actions={
            <Link
              href="/radar"
              className="rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-[var(--isalwa-text-sm)] hover:border-[var(--isalwa-glaze)]"
            >
              Ir al Radar →
            </Link>
          }
        />

        {pulse ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {pulse.vitals.map((v, idx) => (
                <Panel
                  key={v.key}
                  interactive
                  className={`isalwa-enter isalwa-enter-delay-${Math.min(idx + 1, 4)} relative overflow-hidden p-5`}
                >
                  <span
                    className="absolute inset-x-0 top-0 h-1"
                    style={{ background: toneAccent[v.tone] ?? toneAccent.neutral }}
                    aria-hidden
                  />
                  <p className="text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]">{v.label}</p>
                  <p
                    className="mt-3 text-[var(--isalwa-text-xl)] tracking-tight text-[var(--isalwa-kiln)] md:text-[28px]"
                    style={{ fontFamily: 'var(--isalwa-font-mono)' }}
                  >
                    <AnimatedValue value={v.valueLabel} />
                  </p>
                  <p className="mt-2 text-[var(--isalwa-text-xs)] leading-relaxed text-[var(--isalwa-slate)]">
                    {v.hint}
                  </p>
                </Panel>
              ))}
            </div>

            <Panel className="isalwa-enter isalwa-enter-delay-4 mt-6 p-5 md:p-6">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <h2 className="text-[var(--isalwa-text-lg)] font-semibold">Necesitan atención</h2>
                <StatusPill tone="info">Radar vivo</StatusPill>
              </div>
              {pulse.focus.length === 0 ? (
                <EmptyState
                  title="Todo en calma"
                  description="No hay focos críticos ahora. Abra Radar para la cola completa."
                  action={
                    <Link href="/radar" className="text-[var(--isalwa-glaze)] hover:underline">
                      Ver Radar
                    </Link>
                  }
                />
              ) : (
                <ul className="space-y-1">
                  {pulse.focus.map((f) => (
                    <li key={f.id}>
                      <Link
                        href={f.href}
                        className="group flex items-center justify-between gap-4 rounded-[var(--isalwa-radius-control)] px-3 py-3 transition-colors hover:bg-[var(--isalwa-porcelain)]"
                      >
                        <div className="min-w-0">
                          <p className="font-medium group-hover:text-[var(--isalwa-glaze-deep)]">{f.title}</p>
                          <p className="text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]">{f.reason}</p>
                        </div>
                        <span
                          className="shrink-0 text-[var(--isalwa-text-sm)] text-[var(--isalwa-glaze)]"
                          style={{ fontFamily: 'var(--isalwa-font-mono)' }}
                        >
                          {f.score}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </>
        ) : (
          <EmptyState
            title={error ?? 'Cargando…'}
            description="Verifique que la API esté en :4000 y la base seedada."
            action={
              <Link href="/" className="text-[var(--isalwa-glaze)] hover:underline">
                Volver al inicio
              </Link>
            }
          />
        )}
      </main>
    </AppShell>
  );
}
