'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Panel } from '@isalwa/ui';
import { useRouter } from 'next/navigation';
import {
  GUIDE_CHROME,
  INTRO_COPY,
  PAGE_TOUR_ROUTES,
  canViewMicroTour,
  getMicroTourForPage,
  replayLabel,
} from '@/lib/walkthrough/copy';
import { TOUR_TARGET } from '@/lib/walkthrough/targets';
import { useGuide } from './guide-provider';
import { LearningModeToggle } from './learning-mode-toggle';

export { replayFromAyuda } from '@/lib/walkthrough/progress';

const PAGE_LABELS: Record<string, string> = {
  produccion: 'Producción',
  almacen: 'Almacén',
  compras: 'Compras',
  coordinacion: 'Coordinación',
  finanzas: 'Finanzas',
  aprobaciones: 'Aprobaciones',
  entregas: 'Entregas',
  productos: 'Productos',
  trabajo: 'Trabajo',
  oportunidades: 'Oportunidades',
  cotizaciones: 'Cotizaciones',
  pedidos: 'Pedidos',
};

export function WalkthroughHelpPanel() {
  const api = useGuide();
  const router = useRouter();
  const journeys = api?.journeys ?? [];
  const [navHrefs, setNavHrefs] = useState<string[]>([]);

  useEffect(() => {
    const hrefs = [...document.querySelectorAll('nav a[href]')]
      .map((node) => node.getAttribute('href') ?? '')
      .filter((href) => href.startsWith('/'));
    setNavHrefs(hrefs);
  }, []);

  const sectionTours = useMemo(() => {
    if (!api?.ready) return [];
    return PAGE_TOUR_ROUTES.filter((entry) => {
      const tour = getMicroTourForPage(entry.pageId);
      if (!tour) return false;
      return canViewMicroTour(tour, api.viewerRoleKeys, navHrefs);
    });
  }, [api, navHrefs]);

  return (
    <Panel padded className="mb-8 space-y-6" data-guide-replay="ayuda">
      <div data-tour={TOUR_TARGET.helpReplay}>
        <p className="isalwa-kicker">{GUIDE_CHROME.kicker}</p>
        <h2 className="mt-1 text-lg font-medium text-[var(--isalwa-kiln)]">
          {INTRO_COPY.ayuda.affordances[0]}
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
          {INTRO_COPY.welcome.footer}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => api?.replayIntro()}>
            {INTRO_COPY.ayuda.affordances[0]}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled
            title="Ayuda no tiene un recorrido propio de página."
          >
            {INTRO_COPY.ayuda.affordances[1]}
          </Button>
        </div>
        <p className="mt-2 text-xs text-[var(--isalwa-slate)]">
          Ayuda no tiene un recorrido propio. Usa la introducción o elige una sección abajo.
        </p>
      </div>

      {sectionTours.length > 0 ? (
        <div className="border-t border-[var(--isalwa-mist)] pt-6">
          <h3 className="text-sm font-medium text-[var(--isalwa-kiln)]">Recorridos de sección</h3>
          <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
            Abre el recorrido corto de una sección a la que ya tienes acceso.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {sectionTours.map((entry) => (
              <Button
                key={entry.pageId}
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  api?.clearPageTourSeen(entry.pageId);
                  router.push(entry.prefix);
                }}
              >
                {PAGE_LABELS[entry.pageId] ?? entry.pageId}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="border-t border-[var(--isalwa-mist)] pt-6">
        <LearningModeToggle />
      </div>

      {journeys.length > 0 ? (
        <div className="border-t border-[var(--isalwa-mist)] pt-6">
          <h3 className="text-sm font-medium text-[var(--isalwa-kiln)]">{GUIDE_CHROME.title}</h3>
          <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{GUIDE_CHROME.localNote}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {journeys.map((journey) => (
              <Button
                key={journey.id}
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => api?.replay(journey.id)}
              >
                {replayLabel(journey.title)}
              </Button>
            ))}
            <Button type="button" variant="ghost" size="sm" onClick={() => api?.reset()}>
              {GUIDE_CHROME.reset}
            </Button>
          </div>
        </div>
      ) : null}
    </Panel>
  );
}
