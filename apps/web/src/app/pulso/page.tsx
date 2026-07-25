import Link from 'next/link';
import {
  DashboardGrid,
  MetricCard,
  PageContainer,
  PageSection,
} from '@isalwa/ui';
import type { PulseResponse } from '@isalwa/contracts';
import { AppShell } from '@/components/app-shell';
import { AnimatedValue } from '@/components/animated-value';
import { apiGet } from '@/lib/api';

const ACCENT: Record<string, string> = {
  success: 'var(--isalwa-success)',
  warning: 'var(--isalwa-warning)',
  danger: 'var(--isalwa-danger)',
  info: 'var(--isalwa-info)',
  neutral: 'var(--isalwa-glaze)',
};

function urgencyColor(score: number): string {
  if (score >= 90) return 'var(--isalwa-danger)';
  if (score >= 75) return 'var(--isalwa-warning)';
  return 'var(--isalwa-glaze)';
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('es-BO', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export default async function PulsoPage() {
  let pulse: PulseResponse | null = null;
  let error: string | null = null;

  try {
    pulse = await apiGet<PulseResponse>('/pulse');
  } catch {
    error = 'No se pudo conectar con la API.';
  }

  if (!pulse) {
    return (
      <AppShell active="/pulso">
        <PageContainer label="Error de Pulso" className="flex min-h-[70vh] flex-col items-center justify-center">
          <div className="max-w-sm text-center">
            <p className="isalwa-kicker" style={{ color: 'var(--isalwa-warning)' }}>
              Sin señal
            </p>
            <h1 className="isalwa-page-title mt-3">El pulso no responde.</h1>
            <p className="mt-3 text-[var(--isalwa-text-md)] leading-relaxed text-[var(--isalwa-slate)]">
              {error ?? 'Verifique que la API y la base de datos estén en línea.'}
            </p>
            <Link
              href="/"
              className="mt-6 inline-block text-[var(--isalwa-text-md)] font-medium text-[var(--isalwa-glaze)] transition-opacity duration-[var(--isalwa-motion-fast)] hover:opacity-70"
            >
              Volver al inicio
            </Link>
          </div>
        </PageContainer>
      </AppShell>
    );
  }

  const time = fmtTime(pulse.asOf);

  return (
    <AppShell active="/pulso">
      <PageContainer label="Pulso — salud del negocio">
        <header className="isalwa-enter mb-8 flex flex-wrap items-start justify-between gap-4 md:mb-10">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3">
              <p className="isalwa-kicker">Pulso</p>
              {time ? (
                <span className="font-[var(--isalwa-font-mono)] text-[var(--isalwa-text-2xs)] text-[var(--isalwa-slate)] opacity-70">
                  · {time}
                </span>
              ) : null}
            </div>
            <h1 data-tour="pulso-sentence" className="isalwa-page-title mt-3">
              {pulse.sentence}
            </h1>
          </div>
          <Link
            href="/radar"
            className="isalwa-interactive shrink-0 rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-4 py-2.5 text-[var(--isalwa-text-sm)] font-medium text-[var(--isalwa-kiln)] shadow-[var(--isalwa-shadow-soft)] hover:border-[var(--isalwa-glaze)] hover:bg-[var(--isalwa-porcelain)] hover:text-[var(--isalwa-glaze)] hover:shadow-[var(--isalwa-shadow-lift)] focus-visible:outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]"
          >
            Radar →
          </Link>
        </header>

        <DashboardGrid data-tour="pulso-vitals" cols={4}>
          {pulse.vitals.map((v, idx) => {
            const accentColor = ACCENT[v.tone] ?? ACCENT.neutral;
            const isPercent = v.valueLabel.includes('%');
            const pctNum = isPercent ? parseFloat(v.valueLabel) : null;
            return (
              <MetricCard
                key={v.key}
                interactive
                label={v.label}
                accent={accentColor}
                value={<AnimatedValue value={v.valueLabel} />}
                hint={v.hint}
                className={`isalwa-enter isalwa-enter-delay-${Math.min(idx + 1, 4)}`}
                footer={
                  isPercent && pctNum !== null ? (
                    <div
                      aria-hidden
                      className="mt-3 h-[3px] overflow-hidden rounded-[var(--isalwa-radius-pill)] bg-[var(--isalwa-mist)]"
                    >
                      <div
                        className="isalwa-bar-expand h-full rounded-[inherit]"
                        style={{
                          width: `${Math.min(Math.max(pctNum, 0), 100)}%`,
                          background: accentColor,
                          transformOrigin: 'left center',
                        }}
                      />
                    </div>
                  ) : null
                }
              />
            );
          })}
        </DashboardGrid>

        <PageSection
          card
          className="isalwa-enter isalwa-enter-delay-4 mt-8"
          aria-label="Focos de atención"
        >
          <div className="flex items-center justify-between gap-4 border-b border-[var(--isalwa-mist)] px-5 py-4 md:px-6">
            <h2 className="text-[var(--isalwa-text-md)] font-semibold tracking-[-0.01em] text-[var(--isalwa-kiln)]">
              Necesitan atención
            </h2>
            <Link
              href="/radar"
              className="shrink-0 text-[var(--isalwa-text-xs)] font-medium text-[var(--isalwa-glaze)] transition-opacity duration-[var(--isalwa-motion-fast)] hover:opacity-70"
            >
              Ver Radar →
            </Link>
          </div>

          {pulse.focus.length === 0 ? (
            <div className="flex flex-col items-start gap-3 px-5 py-10 md:px-6">
              <span
                aria-hidden
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--isalwa-success)_10%,white)] text-lg text-[var(--isalwa-success)]"
              >
                ◎
              </span>
              <p className="text-[var(--isalwa-text-base)] font-semibold text-[var(--isalwa-kiln)]">Todo en calma</p>
              <p className="max-w-md text-[var(--isalwa-text-md)] leading-relaxed text-[var(--isalwa-slate)]">
                No hay focos críticos en este momento. El Radar tiene la vista completa.
              </p>
              <Link
                href="/radar"
                className="mt-1 text-[var(--isalwa-text-md)] font-medium text-[var(--isalwa-glaze)] transition-opacity duration-[var(--isalwa-motion-fast)] hover:opacity-70"
              >
                Ver Radar →
              </Link>
            </div>
          ) : (
            <ul className="m-0 list-none p-0">
              {pulse.focus.map((f, i) => {
                const uColor = urgencyColor(f.score);
                return (
                  <li
                    key={f.id}
                    className={`isalwa-enter isalwa-enter-delay-${Math.min(i + 1, 4)} border-b border-[color-mix(in_srgb,var(--isalwa-mist)_80%,white)] last:border-b-0`}
                  >
                    <Link
                      href={f.href}
                      className="isalwa-inbox-row group flex items-stretch focus-visible:outline-none focus-visible:bg-[color-mix(in_srgb,var(--isalwa-glaze)_4%,white)]"
                    >
                      <span
                        aria-hidden
                        className="my-3 w-[3px] shrink-0 rounded-r-[2px]"
                        style={{ background: uColor, opacity: 0.9 }}
                      />
                      <div className="flex flex-1 items-center justify-between gap-4 px-4 py-4 md:px-5">
                        <div className="min-w-0">
                          <p className="text-[var(--isalwa-text-md)] font-semibold tracking-[-0.01em] text-[var(--isalwa-kiln)]">
                            {f.title}
                          </p>
                          <p className="mt-1 text-[var(--isalwa-text-xs)] leading-snug text-[var(--isalwa-slate)]">
                            {f.reason}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <span
                            className="text-[var(--isalwa-text-xs)] font-medium text-[var(--isalwa-glaze)] opacity-0 transition-opacity duration-[var(--isalwa-motion-fast)] group-hover:opacity-100"
                            aria-hidden
                          >
                            Abrir →
                          </span>
                          <span className="isalwa-metric min-w-[28px] text-right text-[16px]" style={{ color: uColor }}>
                            {f.score}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </PageSection>
      </PageContainer>
    </AppShell>
  );
}
