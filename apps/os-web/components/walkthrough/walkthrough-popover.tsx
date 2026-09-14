'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button, Panel, StatusPill } from '@isalwa/ui';
import { SHELL_CONTROLS, STATE_LABEL_TEXT } from '@/lib/walkthrough/copy';
import { placeTourCard, prefersReducedMotion } from '@/lib/walkthrough/targeting';
import type { TourStateLabel } from '@/lib/walkthrough/types';
import { useWalkthrough } from './walkthrough-provider';

const FALLBACK_KICKER = 'Primer paso';

const CARD_WIDTH = 344;
const CARD_HEIGHT = 280;

function toneFor(label: TourStateLabel): 'success' | 'manual' | 'warning' | 'info' | 'neutral' | 'demo' {
  switch (label) {
    case 'disponible':
      return 'success';
    case 'manual':
      return 'manual';
    case 'parcial':
    case 'validacion':
      return 'warning';
    case 'preparacion':
      return 'info';
    case 'vista-demo':
      return 'demo';
    default:
      return 'neutral';
  }
}

function useCardPosition(target: string | undefined, active: boolean) {
  const [box, setBox] = useState<{ top: number; left: number; width: string } | null>(null);
  const [ring, setRing] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  useLayoutEffect(() => {
    if (!active) {
      setBox(null);
      setRing(null);
      return;
    }
    const reduced = prefersReducedMotion((query) => window.matchMedia(query).matches);
    const measure = () => {
      const node = target ? document.querySelector(`[data-tour="${target}"]`) : null;
      const element = node instanceof HTMLElement ? node : null;
      const rect = element?.getBoundingClientRect() ?? null;
      const visible = rect && rect.width > 0 && rect.height > 0 ? rect : null;
      const placement = placeTourCard({
        target: visible
          ? { top: visible.top, bottom: visible.bottom, left: visible.left, width: visible.width }
          : null,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        cardWidth: Math.min(CARD_WIDTH, window.innerWidth - 32),
        cardHeight: CARD_HEIGHT,
      });
      setBox({
        top: placement.top,
        left: placement.mode === 'sheet' ? 16 : placement.left,
        width: placement.mode === 'sheet' ? 'calc(100vw - 32px)' : `${Math.min(CARD_WIDTH, window.innerWidth - 32)}px`,
      });
      setRing(
        visible
          ? { top: visible.top - 6, left: visible.left - 6, width: visible.width + 12, height: visible.height + 12 }
          : null,
      );
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    const timer = window.setTimeout(measure, reduced ? 0 : 180);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
      window.clearTimeout(timer);
    };
  }, [active, target]);

  return { box, ring };
}

function ShellCard({
  titleId,
  label,
  children,
  style,
}: {
  titleId: string;
  label: string;
  children: ReactNode;
  style?: { top: number; left: number; width: string };
}) {
  return (
    <Panel
      padded
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      aria-label={label}
      className="pointer-events-auto max-h-[min(70vh,32rem)] overflow-y-auto motion-reduce:transition-none"
      style={{
        position: 'fixed',
        top: style?.top ?? 16,
        left: style?.left ?? 16,
        width: style?.width ?? `min(${CARD_WIDTH}px, calc(100vw - 32px))`,
        zIndex: 30,
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
      }}
    >
      {children}
    </Panel>
  );
}

export function WalkthroughPopover() {
  const api = useWalkthrough();
  const titleId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const target = api.anchor === 'ready' ? api.step?.target : undefined;
  const { box, ring } = useCardPosition(target, api.surface !== 'closed' && api.anchor !== 'pending');

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (api.surface === 'closed' || api.anchor === 'pending') return;
    const button = rootRef.current?.querySelector<HTMLButtonElement>('button:not([disabled])');
    button?.focus();
  }, [api.anchor, api.step?.stepId, api.surface]);

  if (!mounted || api.surface === 'closed') return null;
  if (api.surface === 'step' && api.anchor === 'pending') return null;

  const progress =
    api.surface === 'step' && api.stepCount > 0 ? `${api.stepIndex + 1} / ${api.stepCount}` : null;

  return createPortal(
    <div ref={rootRef} className="pointer-events-none" data-walkthrough-root="">
      {ring ? (
        <div
          aria-hidden
          className="pointer-events-none rounded-[var(--isalwa-radius-control)] border-2 border-[var(--isalwa-glaze)] motion-reduce:transition-none"
          style={{ position: 'fixed', zIndex: 29, top: ring.top, left: ring.left, width: ring.width, height: ring.height }}
        />
      ) : null}
      <ShellCard titleId={titleId} label="Recorrido" style={box ?? undefined}>
        {api.surface === 'page-offer' ? (
          <>
            <p className="isalwa-kicker">{SHELL_CONTROLS.pageOfferTitle}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" className="w-full sm:w-auto" onClick={api.acceptPageOffer}>
                {SHELL_CONTROLS.viewTour}
              </Button>
              <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={api.dismissPageOffer}>
                {SHELL_CONTROLS.notNow}
              </Button>
            </div>
          </>
        ) : null}

        {api.surface === 'welcome' ? (
          <>
            <p className="isalwa-kicker">{api.welcome.kicker ?? FALLBACK_KICKER}</p>
            <h2
              id={titleId}
              className="mt-2 font-[family-name:var(--isalwa-font-display)] text-2xl italic leading-tight text-[var(--isalwa-kiln)]"
            >
              {api.welcome.title}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--isalwa-slate)]">{api.welcome.body}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" className="w-full sm:w-auto" onClick={api.startFromWelcome}>
                {SHELL_CONTROLS.start}
              </Button>
              <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={api.exploreAlone}>
                {SHELL_CONTROLS.explore}
              </Button>
              <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={api.closeTour}>
                {SHELL_CONTROLS.close}
              </Button>
            </div>
          </>
        ) : null}

        {api.surface === 'step' && api.step ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="isalwa-kicker">Recorrido{progress ? ` · ${progress}` : ''}</p>
              <StatusPill tone={toneFor(api.step.stateLabel)}>{STATE_LABEL_TEXT[api.step.stateLabel]}</StatusPill>
            </div>
            <h2
              id={titleId}
              className="mt-2 font-[family-name:var(--isalwa-font-display)] text-2xl italic leading-tight text-[var(--isalwa-kiln)]"
            >
              {api.step.title}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--isalwa-slate)]">{api.step.body}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" variant="secondary" disabled={!api.canGoBack} onClick={api.previous}>
                {SHELL_CONTROLS.previous}
              </Button>
              <Button type="button" onClick={api.next}>
                {SHELL_CONTROLS.next}
              </Button>
              <Button type="button" variant="ghost" onClick={api.continueLater}>
                {SHELL_CONTROLS.later}
              </Button>
              <Button type="button" variant="ghost" onClick={api.closeTour}>
                {SHELL_CONTROLS.close}
              </Button>
              <Button type="button" variant="ghost" onClick={api.goHome}>
                {SHELL_CONTROLS.home}
              </Button>
            </div>
          </>
        ) : null}
      </ShellCard>
    </div>,
    document.body,
  );
}
