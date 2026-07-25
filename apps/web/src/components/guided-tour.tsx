'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { IconSpark } from '@isalwa/ui';
import { clearTourDone, isDemoMode, isTourDone, markTourDone } from '@/lib/preferences';

// ── Tour step definitions ─────────────────────────────────────────────────────

type TourStep = {
  selector: string; // value of data-tour="…" on the target element
  path: string;     // URL to be on (may include query string)
  title: string;
  body: string;
  insight: string;
};

const STEPS: TourStep[] = [
  {
    selector: 'pulso-sentence',
    path: '/pulso',
    title: 'El sistema te habla primero',
    body: 'Cada vez que abrís ISALWA, una sola frase resume el estado real del negocio. No hay gráficos que interpretar — la máquina analiza los datos y te lo dice directamente.',
    insight: 'Empezá cada mañana aquí. Si hay riesgo, la frase lo dice.',
  },
  {
    selector: 'pulso-vitals',
    path: '/pulso',
    title: 'Cuatro números, toda la empresa',
    body: 'Dinero cobrado este mes, cartera abierta en riesgo, visitas completadas y conversaciones dentro de SLA. Cada número tiene su tono — verde es flujo, rojo es urgencia.',
    insight: 'Si algo está rojo, actuá antes del mediodía.',
  },
  {
    selector: 'radar-list',
    path: '/radar',
    title: '¿Quién necesita atención hoy?',
    body: 'Radar ordena automáticamente los clientes por riesgo. La barra larga y roja significa deuda grave o silencio peligroso. Sin listas manuales — el sistema empuja lo que importa.',
    insight: 'Con Radar, ningún cliente crítico pasa desapercibido.',
  },
  {
    selector: 'personas-heroes',
    path: '/personas',
    title: 'El elenco de ISALWA',
    body: 'Las cuentas más importantes aparecen primero. Cada cliente tiene un dossier completo: score de relación, resumen de IA, crédito, historial, facturas, precios negociados y WhatsApp.',
    insight: 'Abrí el dossier antes de cada visita — todo está en 10 segundos.',
  },
  {
    selector: 'territory-map',
    path: '/territorio',
    title: 'El dinero tiene geografía',
    body: 'Mirá tu cartera en el mapa de Santa Cruz. Rojo es riesgo, verde es salud. Los clusters muestran dónde concentrar la fuerza comercial esta semana.',
    insight: 'Planificá las rutas por zona — nunca en zigzag.',
  },
  {
    selector: 'cierre-catalog',
    path: '/cierre',
    title: 'Cotizar en 30 segundos',
    body: 'Buscá un producto, el precio de memoria del cliente aparece al instante. Ajustá cantidad y descuento. Enviás la cotización y aceptás el pedido sin abrir otra pantalla.',
    insight: 'El precio negociado de la última vez siempre está disponible.',
  },
  {
    selector: 'senal-list',
    path: '/senal',
    title: 'WhatsApp como instrumento',
    body: 'Cada hilo tiene su contexto, SLA y tres respuestas sugeridas listas para copiar. Ventas, cobranzas y soporte en un solo flujo — sin perder ningún mensaje.',
    insight: 'Un SLA en rojo significa: respondé ahora.',
  },
  {
    selector: 'senal-cobranzas-tab',
    path: '/senal',
    title: 'La cobranza también es ventas',
    body: 'El filtro Cobranzas muestra solo los hilos de cobro pendientes, ordenados por urgencia. La prioridad la calcula el sistema — el cliente que más debe, primero.',
    insight: 'Cobrar es parte del ciclo comercial, no un proceso aparte.',
  },
  {
    selector: 'cmdpalette-trigger',
    path: '/pulso',
    title: 'Todo en un teclado',
    body: 'Presioná ⌘K desde cualquier pantalla. Buscá un cliente, un producto o navegá directo al dossier. El sistema encuentra lo que necesitás antes de que termines de escribir.',
    insight: 'Los asesores más rápidos no usan el mouse para navegar.',
  },
];

// ── Geometry helpers ──────────────────────────────────────────────────────────

const PAD = 10; // spotlight padding (px)
const CARD_W = 344;
const CARD_H_EST = 270;
const CARD_GAP = 16;

function spotlightPanels(r: DOMRect) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const t  = Math.max(0, r.top    - PAD);
  const b  = Math.min(vh, r.bottom + PAD);
  const l  = Math.max(0, r.left   - PAD);
  const ri = Math.min(vw, r.right  + PAD);
  return {
    top:    { top: 0, left: 0,   width: vw,      height: t      },
    bottom: { top: b, left: 0,   width: vw,      height: vh - b },
    left:   { top: t, left: 0,   width: l,       height: b - t  },
    right:  { top: t, left: ri,  width: vw - ri, height: b - t  },
  };
}

function cardPosition(r: DOMRect): { top: number; left: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const spaceBelow = vh - r.bottom - CARD_GAP;
  const below = spaceBelow >= CARD_H_EST || spaceBelow >= r.top - CARD_GAP;
  const top = below
    ? r.bottom + CARD_GAP
    : r.top - CARD_H_EST - CARD_GAP;
  let left = r.left + r.width / 2 - CARD_W / 2;
  left = Math.max(16, Math.min(vw - CARD_W - 16, left));
  return { top: Math.max(8, top), left };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GuidedTour() {
  const router   = useRouter();
  const pathname = usePathname();

  const [active,     setActive]     = useState(false);
  const [stepIdx,    setStepIdx]    = useState(0);
  const [rect,       setRect]       = useState<DOMRect | null>(null);
  const [navigating, setNavigating] = useState(false);
  const [cardIn,     setCardIn]     = useState(false);
  const [tourDone,   setTourDone]   = useState(false);

  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const step = STEPS[stepIdx];

  useEffect(() => {
    setTourDone(isTourDone() && !isDemoMode());
  }, []);

  useEffect(() => {
    const start = () => {
      clearTourDone();
      setTourDone(false);
      startTour();
    };
    window.addEventListener('isalwa:start-tour', start);
    return () => window.removeEventListener('isalwa:start-tour', start);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-start once in demo mode if tour not completed in this demo session
  useEffect(() => {
    if (!isDemoMode()) return;
    if (isTourDone()) return;
    const t = window.setTimeout(() => startTour(), 900);
    return () => window.clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Find element, retry up to ~3 s ───────────────────────────────────────
  const findElement = useCallback((selector: string) => {
    if (retryRef.current) clearTimeout(retryRef.current);
    let attempts = 0;

    const tryFind = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${selector}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        setTimeout(() => {
          const r = el.getBoundingClientRect();
          setRect(r);
          setNavigating(false);
          requestAnimationFrame(() => requestAnimationFrame(() => setCardIn(true)));
        }, 320);
      } else if (attempts < 25) {
        attempts++;
        retryRef.current = setTimeout(tryFind, 120);
      } else {
        // Element not found — show centred card without spotlight
        setRect(null);
        setNavigating(false);
        requestAnimationFrame(() => requestAnimationFrame(() => setCardIn(true)));
      }
    };
    tryFind();
  }, []);

  // ── React to step changes ────────────────────────────────────────────────
  useEffect(() => {
    if (!active) return;
    setCardIn(false);
    setRect(null);

    const base = step.path.split('?')[0];
    if (pathname !== base) {
      setNavigating(true);
      router.push(step.path);
    } else {
      findElement(step.selector);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, stepIdx]);

  // ── React to navigation completing ───────────────────────────────────────
  useEffect(() => {
    if (!active || !navigating) return;
    const base = STEPS[stepIdx].path.split('?')[0];
    if (pathname === base) {
      findElement(STEPS[stepIdx].selector);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // ── Keyboard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape')     { endTour();  return; }
      if (e.key === 'ArrowRight') { advance();  return; }
      if (e.key === 'ArrowLeft')  { goBack();   return; }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, stepIdx]);

  // ── Resize ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!active) return;
    const onResize = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${step.selector}"]`);
      if (el) setRect(el.getBoundingClientRect());
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [active, step]);

  // ── Controls ─────────────────────────────────────────────────────────────
  const startTour = useCallback(() => {
    setStepIdx(0);
    setRect(null);
    setCardIn(false);
    setNavigating(false);
    setActive(true);
  }, []);

  const endTour = useCallback((completed = true) => {
    if (retryRef.current) clearTimeout(retryRef.current);
    setActive(false);
    setRect(null);
    setCardIn(false);
    setNavigating(false);
    if (completed) {
      markTourDone();
      setTourDone(true);
    }
  }, []);

  const advance = useCallback(() => {
    if (stepIdx < STEPS.length - 1) {
      setStepIdx((i) => i + 1);
    } else {
      endTour(true);
    }
  }, [stepIdx, endTour]);

  const goBack = useCallback(() => {
    if (stepIdx > 0) setStepIdx((i) => i - 1);
  }, [stepIdx]);

  // ── Render: trigger button ────────────────────────────────────────────────
  if (!active) {
    if (tourDone && !isDemoMode()) {
      return null;
    }
    return (
      <button
        onClick={startTour}
        aria-label="Iniciar recorrido guiado por ISALWA OS"
        className="hidden md:flex"
        style={{
          position:      'fixed',
          bottom:        26,
          left:          20,
          zIndex:        8000,
          alignItems:    'center',
          gap:           6,
          padding:       '5px 11px 5px 9px',
          fontSize:      10,
          fontWeight:    600,
          letterSpacing: '0.07em',
          textTransform: 'uppercase',
          color:         'color-mix(in srgb, white 48%, transparent)',
          background:    'transparent',
          border:        '1px solid color-mix(in srgb, white 14%, transparent)',
          borderRadius:  '100px',
          cursor:        'pointer',
          transition:    `color 140ms ease-out,
                          border-color 140ms ease-out,
                          background 140ms ease-out`,
        }}
        onMouseEnter={(e) => {
          const b = e.currentTarget;
          b.style.color = 'color-mix(in srgb, white 78%, transparent)';
          b.style.borderColor = 'color-mix(in srgb, white 24%, transparent)';
          b.style.background = 'color-mix(in srgb, white 5%, transparent)';
        }}
        onMouseLeave={(e) => {
          const b = e.currentTarget;
          b.style.color = 'color-mix(in srgb, white 48%, transparent)';
          b.style.borderColor = 'color-mix(in srgb, white 14%, transparent)';
          b.style.background = 'transparent';
        }}
      >
        <span aria-hidden style={{ fontSize: 9, lineHeight: 1 }}>◎</span>
        Recorrido
      </button>
    );
  }

  // ── Render: active overlay ────────────────────────────────────────────────
  const panels = rect ? spotlightPanels(rect) : null;
  const pos    = rect ? cardPosition(rect)    : null;
  const isLast = stepIdx === STEPS.length - 1;

  const darkPanel: React.CSSProperties = {
    position:   'fixed',
    background: 'rgba(10, 16, 26, 0.75)',
    zIndex:     9000,
    transition: 'all 280ms cubic-bezier(0.4,0,0.2,1)',
    pointerEvents: 'auto',
  };

  return (
    <>
      {/* ── Spotlight dark panels ── */}
      {panels ? (
        <>
          <div aria-hidden onClick={() => endTour()} style={{ ...darkPanel, ...panels.top    }} />
          <div aria-hidden onClick={() => endTour()} style={{ ...darkPanel, ...panels.bottom }} />
          <div aria-hidden onClick={() => endTour()} style={{ ...darkPanel, ...panels.left   }} />
          <div aria-hidden onClick={() => endTour()} style={{ ...darkPanel, ...panels.right  }} />
        </>
      ) : (
        <div aria-hidden onClick={() => endTour()} style={{ ...darkPanel, position: 'fixed', inset: 0 }} />
      )}

      {/* ── Highlight ring around target ── */}
      {rect && (
        <div
          aria-hidden
          style={{
            position:     'fixed',
            zIndex:       9050,
            top:          rect.top    - PAD - 2,
            left:         rect.left   - PAD - 2,
            width:        rect.width  + PAD * 2 + 4,
            height:       rect.height + PAD * 2 + 4,
            borderRadius: 10,
            border:       '2px solid color-mix(in srgb, var(--isalwa-glaze) 70%, white)',
            boxShadow:    '0 0 0 5px color-mix(in srgb, var(--isalwa-glaze) 18%, transparent)',
            pointerEvents:'none',
            transition:   'all 280ms cubic-bezier(0.4,0,0.2,1)',
          }}
        />
      )}

      {/* ── Popover card ── */}
      <div
        role="dialog"
        aria-modal="false"
        aria-live="polite"
        aria-label={`Paso ${stepIdx + 1} de ${STEPS.length}: ${step.title}`}
        style={{
          position:   'fixed',
          zIndex:     9100,
          width:      CARD_W,
          top:        pos ? pos.top  : '50%',
          left:       pos ? pos.left : '50%',
          transform:  pos
            ? (cardIn ? 'translateY(0) scale(1)'           : 'translateY(10px) scale(0.96)')
            : (cardIn ? 'translate(-50%,-50%) scale(1)'    : 'translate(-50%,-50%) scale(0.96)'),
          opacity:    cardIn ? 1 : 0,
          transition: 'opacity 200ms ease-out, transform 200ms ease-out',
          background: 'white',
          borderRadius: 16,
          boxShadow:  '0 28px 72px rgba(0,0,0,0.30), 0 4px 16px rgba(0,0,0,0.10)',
          padding:    '20px 20px 16px',
          pointerEvents: 'auto',
        }}
      >
        {/* Top row: step counter + skip */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <span style={{
            fontSize: 10,
            fontFamily: 'var(--isalwa-font-mono)',
            color: 'var(--isalwa-slate)',
            letterSpacing: '0.08em',
          }}>
            {stepIdx + 1} / {STEPS.length}
          </span>
          <button
            onClick={() => endTour()}
            aria-label="Saltar recorrido"
            style={{
              background: 'none',
              border: 'none',
              padding: '2px 6px',
              fontSize: 11,
              color: 'var(--isalwa-slate)',
              cursor: 'pointer',
              borderRadius: 6,
              letterSpacing: '0.04em',
              lineHeight: 1,
              transition: 'color 140ms ease-out',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--isalwa-kiln)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--isalwa-slate)')}
          >
            Saltar ×
          </button>
        </div>

        {/* Title — Newsreader italic (the editorial voice of the machine) */}
        <h2 style={{
          fontFamily:    'var(--isalwa-font-display)',
          fontStyle:     'italic',
          fontWeight:    400,
          fontSize:      20,
          lineHeight:    1.2,
          color:         'var(--isalwa-kiln)',
          letterSpacing: '-0.01em',
          margin:        '0 0 10px',
        }}>
          {step.title}
        </h2>

        {/* Body copy */}
        <p style={{
          fontSize:   13,
          lineHeight: 1.62,
          color:      'var(--isalwa-slate)',
          margin:     '0 0 12px',
        }}>
          {step.body}
        </p>

        {/* Insight callout */}
        <div style={{
          background:   'color-mix(in srgb, var(--isalwa-glaze) 7%, white)',
          border:       '1px solid color-mix(in srgb, var(--isalwa-glaze) 18%, white)',
          borderRadius: 8,
          padding:      '8px 12px',
          marginBottom: navigating ? 10 : 16,
          display:      'flex',
          gap:          8,
          alignItems:   'flex-start',
        }}>
          <span
            aria-hidden
            style={{
              color: 'var(--isalwa-glaze)',
              flexShrink: 0,
              marginTop: 1,
              display: 'inline-flex',
            }}
          >
            <IconSpark size={14} />
          </span>
          <p style={{ fontSize: 12, lineHeight: 1.55, color: 'var(--isalwa-glaze)', margin: 0, fontWeight: 500 }}>
            {step.insight}
          </p>
        </div>

        {/* Navigation loading indicator */}
        {navigating && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <span className="isalwa-loading-dot" style={{ animationDelay: '0ms' }} />
            <span className="isalwa-loading-dot" style={{ animationDelay: '140ms' }} />
            <span className="isalwa-loading-dot" style={{ animationDelay: '280ms' }} />
            <span style={{ fontSize: 11, color: 'var(--isalwa-slate)', marginLeft: 4 }}>
              Navegando…
            </span>
          </div>
        )}

        {/* Progress dots + navigation buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          {/* Progress dots */}
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} aria-hidden>
            {STEPS.map((_, i) => (
              <span
                key={i}
                style={{
                  display:      'block',
                  width:        i === stepIdx ? 16 : 6,
                  height:       6,
                  borderRadius: 100,
                  background:   i === stepIdx
                    ? 'var(--isalwa-glaze)'
                    : i < stepIdx
                      ? 'color-mix(in srgb, var(--isalwa-glaze) 42%, var(--isalwa-mist))'
                      : 'var(--isalwa-mist)',
                  transition: 'width 220ms ease-out, background 220ms ease-out',
                }}
              />
            ))}
          </div>

          {/* Back / Next */}
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {stepIdx > 0 && (
              <button
                onClick={goBack}
                style={{
                  padding:      '7px 13px',
                  fontSize:     12,
                  fontWeight:   600,
                  color:        'var(--isalwa-slate)',
                  background:   'var(--isalwa-porcelain)',
                  border:       '1px solid var(--isalwa-mist)',
                  borderRadius: 8,
                  cursor:       'pointer',
                  transition:   'background 140ms ease-out',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--isalwa-mist)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--isalwa-porcelain)')}
              >
                ← Atrás
              </button>
            )}
            <button
              onClick={advance}
              style={{
                padding:      '7px 15px',
                fontSize:     12,
                fontWeight:   600,
                color:        'white',
                background:   'var(--isalwa-glaze)',
                border:       'none',
                borderRadius: 8,
                cursor:       'pointer',
                transition:   'background 140ms ease-out',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--isalwa-glaze-deep)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--isalwa-glaze)')}
            >
              {isLast ? 'Terminar ✓' : 'Siguiente →'}
            </button>
          </div>
        </div>

        {/* Keyboard hint */}
        <p style={{
          marginTop:     10,
          fontSize:      10,
          color:         'var(--isalwa-slate)',
          opacity:       0.45,
          letterSpacing: '0.03em',
          textAlign:     'center',
          userSelect:    'none',
        }}>
          ← → navegar · Esc saltar
        </p>
      </div>
    </>
  );
}
