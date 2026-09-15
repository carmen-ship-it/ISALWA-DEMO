'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Button, Panel } from '@isalwa/ui';
import {
  canViewMicroTour,
  getMicroTourForPage,
  pageIdFromPathname,
  progressLabel,
  type MicroTourStep,
} from '@/lib/walkthrough/copy';
import { handleGuideEscape, restoreHeadingFocus } from '@/lib/walkthrough/focus';
import { useGuide } from './guide-provider';

function resolveTourPageId(pathname: string): string | null {
  const base = pageIdFromPathname(pathname);
  if (base !== 'aprobaciones') return base;
  // Prefer action tour only when approve/reject affordance is present.
  if (typeof document !== 'undefined' && document.querySelector('[data-tour="approval-actions"]')) {
    return 'aprobaciones';
  }
  return 'aprobaciones-readonly';
}

function filterSteps(steps: readonly MicroTourStep[], pageId: string): MicroTourStep[] {
  return steps.filter((step) => {
    if (typeof document === 'undefined') return true;
    if (step.target && !document.querySelector(`[data-tour="${step.target}"]`)) {
      return false;
    }
    // Never teach convert if the action is absent on the page.
    if (
      pageId === 'cotizaciones' &&
      /Convertir a pedido/i.test(step.body) &&
      !document.querySelector('[data-tour="quote-convert"], [data-action="convert-quote"]')
    ) {
      return false;
    }
    // Never teach approve/reject actions without the action surface.
    if (
      pageId === 'aprobaciones' &&
      /Aprobar/i.test(step.body) &&
      !document.querySelector('[data-tour="approval-actions"]')
    ) {
      return false;
    }
    return true;
  });
}

/**
 * Contextual page micro-tour: first visit only, after intro is done/skipped,
 * only when the page is reachable and steps remain after target checks.
 */
export function MicroTourCoach() {
  const api = useGuide();
  const pathname = usePathname();
  const titleId = useId();
  const [stepIndex, setStepIndex] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [openHrefs, setOpenHrefs] = useState<string[]>([]);

  useEffect(() => {
    const hrefs = [...document.querySelectorAll('nav a[href]')]
      .map((node) => node.getAttribute('href') ?? '')
      .filter((href) => href.startsWith('/'));
    setOpenHrefs(hrefs);
  }, [pathname]);

  const pageId = useMemo(() => resolveTourPageId(pathname), [pathname]);
  const tour = pageId ? getMicroTourForPage(pageId) : null;

  const steps = useMemo(() => {
    if (!tour) return [];
    return filterSteps(tour.steps, tour.pageId);
  }, [tour, pathname]);

  const introBusy =
    !!api?.ready &&
    api.record.welcomeSeen &&
    !api.record.introCompleted &&
    !api.record.introSkipped;

  const eligible =
    !!api?.ready &&
    !introBusy &&
    !!tour &&
    steps.length > 0 &&
    canViewMicroTour(tour, api.viewerRoleKeys, openHrefs) &&
    !api.hasSeenPageTour(tour.pageId);

  useEffect(() => {
    setStepIndex(0);
    setCollapsed(false);
  }, [pageId]);

  useEffect(() => {
    if (!eligible) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      const outcome = handleGuideEscape(document);
      if (outcome === 'ignored') return;
      event.preventDefault();
      if (tour) api?.markPageTourSeen(tour.pageId);
      restoreHeadingFocus(document);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [eligible, tour, api]);

  if (!eligible || !tour) return null;

  const current = steps[Math.min(stepIndex, steps.length - 1)];
  const progress = progressLabel(stepIndex, steps.length);

  if (collapsed) {
    return (
      <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-20 md:bottom-4 md:left-auto md:right-4">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="pointer-events-auto w-full rounded-none md:w-auto md:rounded-[var(--isalwa-radius-control)]"
          onClick={() => setCollapsed(false)}
        >
          Continuar recorrido de página ({progress})
        </Button>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-20 md:bottom-4 md:left-auto md:right-4 md:w-[min(100vw-2rem,22rem)]">
      <div className="pointer-events-auto max-h-[min(40vh,calc(100dvh-7rem))] overflow-auto rounded-t-[var(--isalwa-radius-panel)] shadow-[var(--isalwa-shadow-floating)] md:max-h-[min(50vh,calc(100dvh-5.5rem))] md:rounded-[var(--isalwa-radius-panel)]">
        <Panel padded className="border-0 shadow-none">
          <div className="flex items-start justify-between gap-3">
            <p id={titleId} className="isalwa-kicker">
              Recorrido · {progress}
            </p>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="md:hidden"
                onClick={() => setCollapsed(true)}
                aria-label="Minimizar"
              >
                —
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => api.markPageTourSeen(tour.pageId)}
                aria-label="Cerrar recorrido de página"
              >
                ✕
              </Button>
            </div>
          </div>

          <div className="mt-3" role="region" aria-labelledby={titleId}>
            {current.title ? (
              <h3 className="font-medium text-[var(--isalwa-kiln)]">{current.title}</h3>
            ) : null}
            <p className={`text-sm leading-relaxed text-[var(--isalwa-kiln)] ${current.title ? 'mt-2' : ''}`}>
              {current.body}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {stepIndex < steps.length - 1 ? (
              <Button type="button" onClick={() => setStepIndex((i) => i + 1)}>
                Siguiente
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => {
                  api.markPageTourSeen(tour.pageId);
                }}
              >
                Entendido
              </Button>
            )}
            <button
              type="button"
              onClick={() => api.markPageTourSeen(tour.pageId)}
              className="text-sm text-[var(--isalwa-slate)] underline-offset-2 hover:text-[var(--isalwa-kiln)] hover:underline"
            >
              Omitir
            </button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
