import Link from 'next/link';
import { Panel } from '@isalwa/ui';
import type { PulseResponse } from '@isalwa/contracts';
import { AppShell } from '@/components/app-shell';
import { AnimatedValue } from '@/components/animated-value';
import { apiGet } from '@/lib/api';

// ── Tone → accent color ───────────────────────────────────────────────────────
const ACCENT: Record<string, string> = {
  success: 'var(--isalwa-success)',
  warning: 'var(--isalwa-warning)',
  danger:  'var(--isalwa-danger)',
  info:    'var(--isalwa-info)',
  neutral: 'var(--isalwa-glaze)',
};

// Urgency score → color token
function urgencyColor(score: number): string {
  if (score >= 90) return 'var(--isalwa-danger)';
  if (score >= 75) return 'var(--isalwa-warning)';
  return 'var(--isalwa-glaze)';
}

// Format the asOf ISO timestamp to a short local time
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

// ─────────────────────────────────────────────────────────────────────────────

export default async function PulsoPage() {
  let pulse: PulseResponse | null = null;
  let error: string | null = null;

  try {
    pulse = await apiGet<PulseResponse>('/pulse');
  } catch {
    error = 'No se pudo conectar con la API.';
  }

  // ── Error state ─────────────────────────────────────────────────────────────
  if (!pulse) {
    return (
      <AppShell active="/pulso">
        <main
          className="flex min-h-[70vh] flex-col items-center justify-center px-8"
          aria-label="Error de Pulso"
        >
          <div style={{ maxWidth: 340, textAlign: 'center' }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--isalwa-warning)',
                marginBottom: 12,
              }}
            >
              Sin señal
            </p>
            <h1
              style={{
                fontFamily: 'var(--isalwa-font-display)',
                fontStyle: 'italic',
                fontWeight: 400,
                fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                lineHeight: 1.2,
                color: 'var(--isalwa-kiln)',
                margin: 0,
              }}
            >
              El pulso no responde.
            </h1>
            <p
              style={{
                marginTop: 12,
                fontSize: 13,
                color: 'var(--isalwa-slate)',
                lineHeight: 1.5,
              }}
            >
              {error ?? 'Verifique que la API y la base de datos estén en línea.'}
            </p>
            <Link
              href="/"
              style={{
                display: 'inline-block',
                marginTop: 20,
                fontSize: 13,
                color: 'var(--isalwa-glaze)',
                fontWeight: 500,
              }}
              className="transition-opacity duration-[var(--isalwa-motion-fast)] hover:opacity-70"
            >
              Volver al inicio
            </Link>
          </div>
        </main>
      </AppShell>
    );
  }

  const time = fmtTime(pulse.asOf);

  return (
    <AppShell active="/pulso">
      <main
        className="min-h-screen px-5 pb-16 pt-8 md:px-8 md:pt-10"
        aria-label="Pulso — salud del negocio"
      >

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <header className="isalwa-enter mb-9 flex flex-wrap items-start justify-between gap-4 md:mb-11">
          <div style={{ maxWidth: 700 }}>

            {/* Kicker + live timestamp */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'var(--isalwa-glaze)',
                  margin: 0,
                }}
              >
                Pulso
              </p>
              {time && (
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--isalwa-slate)',
                    fontFamily: 'var(--isalwa-font-mono)',
                    opacity: 0.7,
                  }}
                >
                  · {time}
                </span>
              )}
            </div>

            {/* System sentence — Newsreader italic.
                This is the machine's voice. One sentence. The whole business. */}
            <h1
              data-tour="pulso-sentence"
              style={{
                marginTop: 10,
                fontFamily: 'var(--isalwa-font-display)',
                fontStyle: 'italic',
                fontWeight: 400,
                fontSize: 'clamp(1.4rem, 2.6vw, 2.1rem)',
                lineHeight: 1.22,
                color: 'var(--isalwa-kiln)',
                letterSpacing: '-0.01em',
              }}
            >
              {pulse.sentence}
            </h1>
          </div>

          {/* Radar shortcut — understated, confident */}
          <Link
            href="/radar"
            className="shrink-0 rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-4 py-2 text-sm font-medium text-[var(--isalwa-kiln)] transition-[border-color,color,background-color] duration-[var(--isalwa-motion-fast)] ease-[var(--isalwa-ease-out)] hover:border-[var(--isalwa-glaze)] hover:bg-[var(--isalwa-porcelain)] hover:text-[var(--isalwa-glaze)] focus-visible:outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]"
          >
            Radar →
          </Link>
        </header>

        {/* ── Vitals — four numbers that summarize the company ──────────────── */}
        <div data-tour="pulso-vitals" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {pulse.vitals.map((v, idx) => {
            const accentColor = ACCENT[v.tone] ?? ACCENT.neutral;

            // Parse percentage values for the mini progress bar
            const isPercent = v.valueLabel.includes('%');
            const pctNum = isPercent ? parseFloat(v.valueLabel) : null;

            return (
              <Panel
                key={v.key}
                interactive
                className={`isalwa-enter isalwa-enter-delay-${Math.min(idx + 1, 4)} overflow-hidden`}
                style={{ padding: 0 }}
              >
                {/* Tone accent bar — 2px, precise */}
                <span
                  aria-hidden
                  style={{
                    display: 'block',
                    height: 2,
                    background: accentColor,
                    flexShrink: 0,
                  }}
                />

                <div style={{ padding: '18px 20px 20px' }}>

                  {/* Label — small, uppercase, slate */}
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: 'var(--isalwa-slate)',
                      margin: 0,
                    }}
                  >
                    {v.label}
                  </p>

                  {/* Value — IBM Plex Mono, forced single line, counts up on load */}
                  <p
                    style={{
                      marginTop: 10,
                      fontFamily: 'var(--isalwa-font-mono)',
                      fontSize: 'clamp(18px, 1.75vw, 24px)',
                      fontWeight: 500,
                      letterSpacing: '-0.02em',
                      color: 'var(--isalwa-kiln)',
                      whiteSpace: 'nowrap',
                      fontVariantNumeric: 'tabular-nums',
                      lineHeight: 1.15,
                      margin: '10px 0 0',
                    }}
                  >
                    <AnimatedValue value={v.valueLabel} />
                  </p>

                  {/* Progress bar for percentage vitals (Motor comercial, Respuesta) */}
                  {isPercent && pctNum !== null && (
                    <div
                      aria-hidden
                      style={{
                        marginTop: 10,
                        height: 3,
                        background: 'var(--isalwa-mist)',
                        borderRadius: 'var(--isalwa-radius-pill)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        className="isalwa-bar-expand"
                        style={{
                          height: '100%',
                          width: `${Math.min(Math.max(pctNum, 0), 100)}%`,
                          background: accentColor,
                          transformOrigin: 'left center',
                          borderRadius: 'inherit',
                        }}
                      />
                    </div>
                  )}

                  {/* Hint — answers "so what?" */}
                  <p
                    style={{
                      marginTop: 10,
                      fontSize: 12,
                      color: 'var(--isalwa-slate)',
                      lineHeight: 1.4,
                      margin: '10px 0 0',
                    }}
                  >
                    {v.hint}
                  </p>
                </div>
              </Panel>
            );
          })}
        </div>

        {/* ── Focus — who needs attention right now ─────────────────────────── */}
        <section
          className="isalwa-enter isalwa-enter-delay-4 mt-6"
          aria-label="Focos de atención"
          style={{
            background: 'var(--isalwa-white)',
            border: '1px solid var(--isalwa-mist)',
            borderRadius: 'var(--isalwa-radius-panel)',
            boxShadow: 'var(--isalwa-shadow-soft)',
            overflow: 'hidden',
          }}
        >
          {/* Section header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              padding: '16px 24px',
              borderBottom: pulse.focus.length > 0
                ? '1px solid var(--isalwa-mist)'
                : undefined,
            }}
          >
            <h2
              style={{
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: '-0.01em',
                color: 'var(--isalwa-kiln)',
                margin: 0,
              }}
            >
              Necesitan atención
            </h2>
            <Link
              href="/radar"
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--isalwa-glaze)',
                flexShrink: 0,
              }}
              className="transition-opacity duration-[var(--isalwa-motion-fast)] hover:opacity-70"
            >
              Ver Radar →
            </Link>
          </div>

          {/* ── Empty state — all clear ──────────────────────────────────── */}
          {pulse.focus.length === 0 && (
            <div
              style={{
                padding: '36px 24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 10,
              }}
            >
              <span
                aria-hidden
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'color-mix(in srgb, var(--isalwa-success) 12%, white)',
                  color: 'var(--isalwa-success)',
                  fontSize: 18,
                }}
              >
                ◎
              </span>
              <p
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: 'var(--isalwa-kiln)',
                  margin: 0,
                }}
              >
                Todo en calma
              </p>
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--isalwa-slate)',
                  maxWidth: 380,
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                No hay focos críticos en este momento. El Radar tiene la vista completa.
              </p>
              <Link
                href="/radar"
                className="transition-opacity duration-[var(--isalwa-motion-fast)] hover:opacity-70"
                style={{
                  fontSize: 13,
                  color: 'var(--isalwa-glaze)',
                  fontWeight: 500,
                  marginTop: 4,
                }}
              >
                Ver Radar →
              </Link>
            </div>
          )}

          {/* ── Focus items list ─────────────────────────────────────────── */}
          {pulse.focus.length > 0 && (
            <ul style={{ margin: 0, padding: '4px 0 8px', listStyle: 'none' }}>
              {pulse.focus.map((f, i) => {
                const uColor = urgencyColor(f.score);
                return (
                  <li
                    key={f.id}
                    className={`isalwa-enter isalwa-enter-delay-${Math.min(i + 1, 4)}`}
                  >
                    {/*
                      Row is a flex container so the left urgency strip
                      can stretch to full row height via align-items: stretch.
                    */}
                    <Link
                      href={f.href}
                      className="group flex items-stretch transition-colors duration-[var(--isalwa-motion-fast)] ease-[var(--isalwa-ease-out)] hover:bg-[var(--isalwa-porcelain)] focus-visible:outline-none focus-visible:bg-[var(--isalwa-porcelain)]"
                    >
                      {/* Left urgency strip — color-coded by score */}
                      <span
                        aria-hidden
                        style={{
                          display: 'block',
                          width: 3,
                          flexShrink: 0,
                          background: uColor,
                          borderRadius: '0 2px 2px 0',
                          margin: '8px 0',
                          opacity: 0.85,
                        }}
                      />

                      {/* Content */}
                      <div
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 16,
                          padding: '13px 24px 13px 16px',
                        }}
                      >
                        {/* Client + reason */}
                        <div style={{ minWidth: 0 }}>
                          <p
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              color: 'var(--isalwa-kiln)',
                              letterSpacing: '-0.01em',
                              margin: 0,
                            }}
                          >
                            {f.title}
                          </p>
                          <p
                            style={{
                              marginTop: 2,
                              fontSize: 12,
                              color: 'var(--isalwa-slate)',
                              lineHeight: 1.35,
                              margin: '2px 0 0',
                            }}
                          >
                            {f.reason}
                          </p>
                        </div>

                        {/* Right: "Abrir →" on hover + urgency score */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            flexShrink: 0,
                          }}
                        >
                          {/* "Abrir →" — hidden at rest, appears on hover */}
                          <span
                            className="opacity-0 transition-opacity duration-[var(--isalwa-motion-fast)] ease-[var(--isalwa-ease-out)] group-hover:opacity-100"
                            style={{
                              fontSize: 12,
                              color: 'var(--isalwa-glaze)',
                              fontWeight: 500,
                            }}
                            aria-hidden
                          >
                            Abrir →
                          </span>

                          {/* Urgency score — colored by severity */}
                          <span
                            style={{
                              fontFamily: 'var(--isalwa-font-mono)',
                              fontSize: 16,
                              fontWeight: 500,
                              color: uColor,
                              letterSpacing: '-0.02em',
                              fontVariantNumeric: 'tabular-nums',
                              minWidth: 26,
                              textAlign: 'right',
                            }}
                          >
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
        </section>

      </main>
    </AppShell>
  );
}
