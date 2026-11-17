'use client';

import { Button, Panel } from '@isalwa/ui';
import { GUIDE_CHROME, INTRO_COPY } from '@/lib/walkthrough/copy';
import { TOUR_TARGET } from '@/lib/walkthrough/targets';
import { useJourney } from '@/components/journey/journey-provider';
import { useGuide } from './guide-provider';

/**
 * Ayuda affordances: welcome replay + Recorrido completo.
 * Recorrido completo is the only multi-step guided walkthrough.
 */
export function WalkthroughHelpPanel() {
  const api = useGuide();
  const { canOpenJourney, openStory } = useJourney();

  return (
    <Panel padded className="mb-8 space-y-6" data-guide-replay="ayuda">
      <div data-tour={TOUR_TARGET.helpReplay}>
        <p className="isalwa-kicker">{GUIDE_CHROME.kicker}</p>
        <h2 className="mt-1 text-lg font-medium text-[var(--isalwa-kiln)]">
          Orientación
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
          La bienvenida corta explica qué es ISALWA. El recorrido guiado completo de evaluación
          es Recorrido completo. No hay un segundo recorrido paso a paso en el producto.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => api?.replayIntro()}>
            {INTRO_COPY.ayuda.affordances[0]}
          </Button>
        </div>
      </div>

      {canOpenJourney ? (
        <div className="border-t border-[var(--isalwa-mist)] pt-6">
          <h3 className="text-sm font-medium text-[var(--isalwa-kiln)]">
            Recorrido completo de evaluación
          </h3>
          <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
            Único recorrido guiado multi-paso (Recorrido guiado). Muestra lo disponible hoy y las
            vistas de propuesta de las siguientes etapas; no cambia de empresa ni de datos.
          </p>
          <div className="mt-4">
            <Button type="button" variant="primary" size="sm" onClick={openStory}>
              Ver recorrido completo
            </Button>
          </div>
        </div>
      ) : null}
    </Panel>
  );
}
