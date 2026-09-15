'use client';

import { useEffect, useId, useState, useCallback, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Button, Panel } from '@isalwa/ui';
import { INTRO_COPY, progressLabel } from '@/lib/walkthrough/copy';
import { handleGuideEscape, restoreHeadingFocus } from '@/lib/walkthrough/focus';
import { TOUR_TARGET } from '@/lib/walkthrough/targets';
import { useGuide, INTRO_TOTAL_STEPS } from './guide-provider';

/** Step definitions with route expectations and detection. */
const INTRO_STEPS = [
  { index: 0, route: null, id: 'welcome' }, // Welcome is handled by IntroWelcome
  { index: 1, route: '/inicio', id: 'inicio' },
  { index: 2, route: '/clientes', id: 'clientes' },
  { index: 3, route: '/clientes/', id: 'cliente360', pattern: /^\/clientes\/[^/]+$/ },
  { index: 4, route: '/clientes/', id: 'nextAction', pattern: /^\/clientes\/[^/]+$/ },
  { index: 5, route: '/mapa', id: 'mapa' },
  { index: 6, route: '/ayuda', id: 'ayuda' },
] as const;

type IntroStepId = (typeof INTRO_STEPS)[number]['id'];

function getStepForRoute(pathname: string): number | null {
  // Check pattern matches first (more specific)
  for (const step of INTRO_STEPS) {
    if ('pattern' in step && step.pattern?.test(pathname)) {
      return step.index;
    }
  }
  // Then exact matches
  for (const step of INTRO_STEPS) {
    if (step.route && pathname === step.route) {
      return step.index;
    }
  }
  return null;
}

function findPreferredCustomerLink(): string | null {
  // Look for customer links in the list, prefer ALVAREZ
  const links = document.querySelectorAll<HTMLAnchorElement>('[data-tour="clientes-list"] a[href^="/clientes/"]');
  if (links.length === 0) {
    // Fallback: any customer link in the page
    const anyLinks = document.querySelectorAll<HTMLAnchorElement>('a[href^="/clientes/"][href*="/"]');
    for (const link of anyLinks) {
      const href = link.getAttribute('href');
      if (href && /^\/clientes\/[^/]+$/.test(href)) {
        return href;
      }
    }
    return null;
  }

  // Prefer ALVAREZ
  for (const link of links) {
    const text = link.textContent?.toUpperCase() ?? '';
    if (text.includes('ALVAREZ')) {
      return link.getAttribute('href');
    }
  }

  // First active customer
  const firstLink = links[0];
  return firstLink?.getAttribute('href') ?? null;
}

function getMapCoverage(): { withCoords: number; total: number } | null {
  const el = document.querySelector('[data-tour="map-coverage"]');
  if (!el) return null;
  const text = el.textContent ?? '';
  // Parse "X de Y clientes" pattern
  const match = text.match(/(\d+)\s*de\s*(\d+)/);
  if (match) {
    return { withCoords: parseInt(match[1], 10), total: parseInt(match[2], 10) };
  }
  return null;
}

function StepContent({ stepId }: { stepId: IntroStepId }) {
  const coverage = stepId === 'mapa' ? getMapCoverage() : null;

  switch (stepId) {
    case 'inicio':
      return (
        <>
          <h3 className="font-medium text-[var(--isalwa-kiln)]">{INTRO_COPY.inicio.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--isalwa-kiln)]">
            {INTRO_COPY.inicio.body}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--isalwa-slate)]">
            {INTRO_COPY.inicio.secondary}
          </p>
        </>
      );

    case 'clientes':
      return (
        <>
          <h3 className="font-medium text-[var(--isalwa-kiln)]">{INTRO_COPY.clientes.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--isalwa-kiln)]">
            {INTRO_COPY.clientes.body}
          </p>
        </>
      );

    case 'cliente360':
      return (
        <>
          <h3 className="font-medium text-[var(--isalwa-kiln)]">{INTRO_COPY.cliente360.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--isalwa-kiln)]">
            {INTRO_COPY.cliente360.body}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--isalwa-slate)]">
            {INTRO_COPY.cliente360.secondary}
          </p>
        </>
      );

    case 'nextAction':
      return (
        <>
          <h3 className="font-medium text-[var(--isalwa-kiln)]">{INTRO_COPY.nextAction.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--isalwa-kiln)]">
            {INTRO_COPY.nextAction.body}
          </p>
          {!document.querySelector('[data-tour="cliente360-next-action"]') && (
            <p className="mt-2 text-sm leading-relaxed text-[var(--isalwa-slate)]">
              {INTRO_COPY.nextAction.noAction}
            </p>
          )}
        </>
      );

    case 'mapa': {
      const coverageText = coverage
        ? INTRO_COPY.mapa.bodyTemplate(coverage.withCoords, coverage.total)
        : INTRO_COPY.mapa.bodyFallback;
      return (
        <>
          <h3 className="font-medium text-[var(--isalwa-kiln)]">{INTRO_COPY.mapa.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--isalwa-kiln)]">{coverageText}</p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--isalwa-slate)]">
            {INTRO_COPY.mapa.secondary}
          </p>
          <h4 className="mt-4 font-medium text-[var(--isalwa-kiln)]">
            {INTRO_COPY.mapa.providerBlocked.title}
          </h4>
          <p className="mt-2 text-sm leading-relaxed text-[var(--isalwa-slate)]">
            {INTRO_COPY.mapa.providerBlocked.body}
          </p>
        </>
      );
    }

    case 'ayuda':
      return (
        <>
          <h3 className="font-medium text-[var(--isalwa-kiln)]">{INTRO_COPY.ayuda.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--isalwa-kiln)]">
            {INTRO_COPY.ayuda.body}
          </p>
          <ul className="mt-3 space-y-1 text-sm text-[var(--isalwa-slate)]">
            {INTRO_COPY.ayuda.affordances.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-[var(--isalwa-glaze)]" />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-4 font-medium text-[var(--isalwa-kiln)]">{INTRO_COPY.ayuda.final}</p>
          <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
            {INTRO_COPY.ayuda.finalSecondary}
          </p>
        </>
      );

    default:
      return null;
  }
}

function getCtaLabel(stepId: IntroStepId): string {
  switch (stepId) {
    case 'inicio':
      return INTRO_COPY.inicio.cta;
    case 'clientes':
      return INTRO_COPY.clientes.cta;
    case 'cliente360':
      return INTRO_COPY.cliente360.cta;
    case 'nextAction':
      return INTRO_COPY.nextAction.cta;
    case 'mapa':
      return INTRO_COPY.mapa.cta;
    case 'ayuda':
      return INTRO_COPY.ayuda.cta;
    default:
      return 'Continuar';
  }
}

function getNextRoute(stepId: IntroStepId): string | null {
  switch (stepId) {
    case 'inicio':
      return '/clientes';
    case 'clientes':
      return findPreferredCustomerLink();
    case 'cliente360':
      return null; // Stay on same page, just advance step
    case 'nextAction':
      return '/mapa';
    case 'mapa':
      return '/ayuda';
    case 'ayuda':
      return '/inicio'; // Final - go to inicio
    default:
      return null;
  }
}

/**
 * Compact coach panel for the first-use intro sequence.
 * Desktop: fixed bottom-right. Mobile: docked bottom sheet with collapse.
 */
export function IntroCoach() {
  const api = useGuide();
  const router = useRouter();
  const pathname = usePathname();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);

  // Sync step with current route
  useEffect(() => {
    if (!api?.ready) return;
    if (!api.record.welcomeSeen || api.record.introCompleted || api.record.introSkipped) return;

    const expectedStep = getStepForRoute(pathname);
    if (expectedStep !== null && expectedStep !== api.record.introStepIndex) {
      api.setIntroStep(expectedStep);
    }
  }, [api, pathname]);

  // Handle Escape to dismiss
  useEffect(() => {
    if (!api?.ready) return;
    if (!api.record.welcomeSeen || api.record.introCompleted || api.record.introSkipped) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      const outcome = handleGuideEscape(document);
      if (outcome === 'ignored') return;
      event.preventDefault();
      api?.skipIntro();
      restoreHeadingFocus(document);
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [api]);

  const handleCta = useCallback(() => {
    if (!api) return;

    const stepDef = INTRO_STEPS[api.record.introStepIndex];
    if (!stepDef) return;

    const stepId = stepDef.id as IntroStepId;

    // Final step: complete intro and navigate home
    if (stepId === 'ayuda') {
      api.advanceIntro();
      router.push('/inicio');
      return;
    }

    // Get next route
    const nextRoute = getNextRoute(stepId);

    // Advance step
    api.advanceIntro();

    // Navigate if needed
    if (nextRoute && nextRoute !== pathname) {
      router.push(nextRoute);
    }
  }, [api, pathname, router]);

  if (!api?.ready) return null;

  // Don't show if welcome not seen, or intro completed/skipped
  if (!api.record.welcomeSeen || api.record.introCompleted || api.record.introSkipped) {
    return null;
  }

  // Don't show step 0 (welcome) - that's IntroWelcome
  if (api.record.introStepIndex === 0) {
    return null;
  }

  const stepDef = INTRO_STEPS[api.record.introStepIndex];
  if (!stepDef) return null;

  const stepId = stepDef.id as IntroStepId;
  const progress = progressLabel(api.record.introStepIndex, INTRO_TOTAL_STEPS);

  if (collapsed) {
    return (
      <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-30 md:bottom-4 md:left-auto md:right-4 md:w-auto">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="pointer-events-auto w-full rounded-none shadow-[var(--isalwa-shadow-soft)] md:w-auto md:rounded-[var(--isalwa-radius-control)]"
          onClick={() => setCollapsed(false)}
        >
          Continuar recorrido ({progress})
        </Button>
      </div>
    );
  }

  return (
    <div
      className="pointer-events-none fixed bottom-0 left-0 right-0 z-30 md:bottom-4 md:left-auto md:right-4 md:w-[min(100vw-2rem,22rem)]"
      data-tour={TOUR_TARGET.introCoach}
    >
      <div
        ref={panelRef}
        role="region"
        aria-labelledby={titleId}
        className="pointer-events-auto max-h-[min(50vh,calc(100dvh-6rem))] overflow-auto rounded-t-[var(--isalwa-radius-panel)] rounded-b-none shadow-[var(--isalwa-shadow-floating)] md:max-h-[min(70vh,calc(100dvh-5.5rem))] md:rounded-[var(--isalwa-radius-panel)]"
      >
      <Panel
        padded
        className="rounded-inherit border-0 shadow-none"
      >
        <div className="flex items-start justify-between gap-3">
          <p id={titleId} className="isalwa-kicker">
            {progress}
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
              onClick={() => api.skipIntro()}
              aria-label="Cerrar recorrido"
            >
              ✕
            </Button>
          </div>
        </div>

        <div className="mt-3">
          <StepContent stepId={stepId} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button type="button" onClick={handleCta}>
            {getCtaLabel(stepId)}
          </Button>
          <button
            type="button"
            onClick={() => api.skipIntro()}
            className="text-sm text-[var(--isalwa-slate)] underline-offset-2 hover:text-[var(--isalwa-kiln)] hover:underline"
          >
            Salir del recorrido
          </button>
        </div>
      </Panel>
      </div>
    </div>
  );
}
