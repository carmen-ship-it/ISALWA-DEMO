'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type Phase = 'wordmark' | 'tagline' | 'init' | 'kpi' | 'ready';

/**
 * ISALWA OS — first-impression intro experience.
 *
 * Concept: "El sistema despierta."
 * A precision instrument powering on. Each phase is real, not cosmetic.
 * The business data loads while the ceremony plays.
 * By the time the owner sees her number, the machine already did the work.
 *
 * Rules:
 * - Plays once per browser session (sessionStorage).
 * - Dismissible instantly via click or ESC.
 * - Respects prefers-reduced-motion.
 * - Uses the same porcelain gradient as the app body → zero visual cut on exit.
 * - Navigates to /pulso at the end; Pulso was always the destination.
 */
export function IntroExperience() {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('wordmark');
  const [initStep, setInitStep] = useState(0);   // 0 → 1 → 2 → 3 as lines appear
  const [kpiRaw, setKpiRaw] = useState<string | null>(null);   // fetched value
  const [kpiDisplay, setKpiDisplay] = useState('Bs 0,00');      // animated display
  const [exiting, setExiting] = useState(false);

  const doneRef = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const rafRef = useRef<number>(0);

  // ── Exit (idempotent) ─────────────────────────────────────────────────────
  const exit = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    timers.current.forEach(clearTimeout);
    cancelAnimationFrame(rafRef.current);
    setExiting(true);
    const t = setTimeout(() => {
      try { sessionStorage.setItem('isalwa_intro_done', '1'); } catch { /* private mode */ }
      router.replace('/pulso');
    }, 420);
    timers.current.push(t);
  }, [router]);

  // ── Skip if already seen this session ─────────────────────────────────────
  useEffect(() => {
    try {
      if (sessionStorage.getItem('isalwa_intro_done')) {
        router.replace('/pulso');
      }
    } catch { /* private mode — show intro */ }
  }, [router]);

  // ── Fetch live KPI (Dinero cobrado este mes) ──────────────────────────────
  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? '';
    const ctrl = new AbortController();
    fetch(`${apiBase}/v1/pulse`, { signal: ctrl.signal })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        const vital = data?.vitals?.[0]; // vitals[0] is always "Dinero entrante"
        if (vital?.valueLabel) setKpiRaw(vital.valueLabel);
      })
      .catch(() => { /* leave kpiRaw null — display stays at 'Bs 0,00' */ });
    return () => ctrl.abort();
  }, []);

  // ── Count-up: triggers when phase reaches 'kpi' and raw value is available ─
  useEffect(() => {
    if (!kpiRaw) return;

    const kpiVisible = phase === 'kpi' || phase === 'ready';
    if (!kpiVisible) return;

    // Respect reduced-motion OR skip animation if we're already past 'kpi'
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced || phase === 'ready') {
      setKpiDisplay(kpiRaw);
      return;
    }

    // phase === 'kpi': animate from Bs 0 to the real value
    const numMatch = kpiRaw.match(/[\d.,]+/);
    if (!numMatch) { setKpiDisplay(kpiRaw); return; }
    const to = Number(numMatch[0].replace(/\./g, '').replace(',', '.'));
    if (!Number.isFinite(to)) { setKpiDisplay(kpiRaw); return; }

    const duration = 1100; // ms
    const startMs = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - startMs) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // cubic ease-out
      const current = to * eased;
      setKpiDisplay(
        'Bs ' +
          current.toLocaleString('es-BO', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
      );
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setKpiDisplay(kpiRaw); // snap to exact value at the end
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, kpiRaw]);

  // ── Animation sequence ────────────────────────────────────────────────────
  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced) {
      setPhase('ready');
      const t = setTimeout(exit, 1500);
      timers.current.push(t);
      return () => clearTimeout(t);
    }

    const ts = timers.current;
    const at = (ms: number, fn: () => void) => {
      const t = setTimeout(fn, ms);
      ts.push(t);
    };

    //   ms    event
    at(  600, () => setPhase('tagline'));         // tagline rises in
    at( 1500, () => setPhase('init'));            // divider draws; init mounts
    at( 1700, () => setInitStep(1));             // "Leyendo el territorio..."
    at( 2300, () => setInitStep(2));             // "Sincronizando cuentas..."
    at( 2900, () => setInitStep(3));             // "Pulso en línea ✓"
    at( 3700, () => setPhase('kpi'));            // init fades; KPI rises + counts up
    at( 5000, () => setPhase('ready'));          // "Abrir Pulso →" appears
    at( 7500, exit);                            // auto-advance

    return () => ts.forEach(clearTimeout);
  }, [exit]);

  // ── ESC to skip ───────────────────────────────────────────────────────────
  useEffect(() => {
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') exit(); };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [exit]);

  // Helper: is the current phase in the given set?
  const inPhase = (...ps: Phase[]) => ps.includes(phase);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bienvenida a ISALWA OS — haga clic para continuar"
      tabIndex={-1}
      onClick={exit}
      suppressHydrationWarning
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        // Transparent so the body's porcelain gradient shows through.
        // /pulso uses the same gradient → zero visual cut on exit.
        background: 'transparent',
        opacity: exiting ? 0 : 1,
        transition: 'opacity 420ms ease-out',
      }}
    >
      {/* ── Central composition ──────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', userSelect: 'none', position: 'relative' }}>

        {/* Alive dot — breathing animation via CSS class */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <span
            className="isalwa-alive-dot"
            aria-hidden="true"
            style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: 'var(--isalwa-glaze)',
            }}
          />
        </div>

        {/* Wordmark — Newsreader italic: the product's authoritative voice */}
        <h1
          className="isalwa-enter"
          style={{
            fontFamily: 'var(--isalwa-font-display)',
            fontStyle: 'italic',
            fontWeight: 400,
            fontSize: 'clamp(2.75rem, 6vw, 4rem)',
            lineHeight: 1.05,
            color: 'var(--isalwa-kiln)',
            letterSpacing: '-0.01em',
            margin: 0,
          }}
        >
          ISALWA OS
        </h1>

        {/* Tagline — rises in at phase 'tagline' */}
        <p
          suppressHydrationWarning
          style={{
            marginTop: 16,
            fontSize: 14,
            color: 'var(--isalwa-slate)',
            letterSpacing: '0.015em',
            opacity: inPhase('wordmark') ? 0 : 1,
            transform: inPhase('wordmark') ? 'translateY(6px)' : 'translateY(0)',
            transition:
              'opacity 380ms var(--isalwa-ease-out), transform 380ms var(--isalwa-ease-out)',
          }}
        >
          Sistema operativo comercial · Santa Cruz, Bolivia
        </p>

        {/* Divider line — draws outward via width transition */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
          <div
            aria-hidden="true"
            suppressHydrationWarning
            style={{
              height: 1,
              background: 'var(--isalwa-glaze)',
              width: inPhase('wordmark', 'tagline') ? 0 : 56,
              opacity: inPhase('wordmark', 'tagline') ? 0 : 1,
              transition:
                'width 520ms var(--isalwa-ease-out), opacity 300ms ease-out',
            }}
          />
        </div>

        {/* ── Dynamic area: init checklist ↔ KPI ──────────────────────────── */}
        {/* Fixed-height container prevents layout shift during the crossfade */}
        <div style={{ position: 'relative', marginTop: 32, minHeight: 148 }}>

          {/* Initialization checklist */}
          <div
            aria-hidden={!inPhase('init')}
            suppressHydrationWarning
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              alignItems: 'center',
              justifyContent: 'flex-start',
              fontFamily: 'var(--isalwa-font-mono)',
              fontSize: 13,
              opacity: inPhase('init') ? 1 : 0,
              transition: 'opacity 300ms ease-out',
              pointerEvents: 'none',
            }}
          >
            {initStep >= 1 && (
              <InitLine
                text="Leyendo el territorio comercial"
                done={initStep >= 2}
              />
            )}
            {initStep >= 2 && (
              <InitLine
                text="Sincronizando cuentas activas"
                done={initStep >= 3}
              />
            )}
            {initStep >= 3 && (
              <InitLine text="Pulso en línea" done highlight />
            )}
          </div>

          {/* Live KPI — cross-fades in and counts up from zero */}
          <div
            aria-live="polite"
            suppressHydrationWarning
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              opacity: inPhase('kpi', 'ready') ? 1 : 0,
              transform: inPhase('kpi', 'ready')
                ? 'translateY(0)'
                : 'translateY(14px)',
              transition:
                'opacity 460ms var(--isalwa-ease-out), transform 460ms var(--isalwa-ease-out)',
              pointerEvents: 'none',
            }}
          >
            {/* The number — real and live; counts up from Bs 0 as it enters */}
            <p
              style={{
                fontFamily: 'var(--isalwa-font-mono)',
                fontSize: 'clamp(2rem, 5vw, 2.75rem)',
                color: 'var(--isalwa-kiln)',
                lineHeight: 1.1,
                letterSpacing: '-0.03em',
                fontWeight: 500,
                margin: 0,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {kpiDisplay}
            </p>
            <p
              style={{
                marginTop: 8,
                fontSize: 13,
                color: 'var(--isalwa-slate)',
                letterSpacing: '0.01em',
              }}
            >
              Dinero cobrado este mes
            </p>
          </div>
        </div>

        {/* "Abrir Pulso →" — invitation, appears at phase 'ready' */}
        <p
          suppressHydrationWarning
          style={{
            marginTop: 40,
            fontSize: 13,
            color: 'var(--isalwa-glaze)',
            letterSpacing: '0.04em',
            fontWeight: 500,
            opacity: inPhase('ready') ? 1 : 0,
            transition: 'opacity 400ms ease-out',
          }}
        >
          Abrir Pulso →
        </p>
      </div>

      {/* ── Skip hint ─────────────────────────────────────────────────────── */}
      <p
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: 28,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: 12,
          color: 'var(--isalwa-slate)',
          opacity: 0.42,
          letterSpacing: '0.01em',
          pointerEvents: 'none',
        }}
      >
        Clic en cualquier lugar · ESC para continuar
      </p>
    </div>
  );
}

// ── Init checklist line ───────────────────────────────────────────────────────

function InitLine({
  text,
  done,
  highlight,
}: {
  text: string;
  done: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className="isalwa-whisper"
      style={{ display: 'flex', alignItems: 'center', gap: 10 }}
    >
      {/* Hollow circle → ✓ as each step confirms */}
      <span
        aria-hidden="true"
        style={{
          fontSize: 11,
          lineHeight: 1,
          minWidth: 14,
          textAlign: 'center',
          color: done ? 'var(--isalwa-success)' : 'var(--isalwa-mist)',
          transition: 'color 300ms ease-out',
        }}
      >
        {done ? '✓' : '○'}
      </span>

      <span
        style={{
          color: highlight ? 'var(--isalwa-glaze)' : 'var(--isalwa-slate)',
          fontWeight: done ? 500 : 400,
        }}
      >
        {text}
      </span>
    </div>
  );
}
