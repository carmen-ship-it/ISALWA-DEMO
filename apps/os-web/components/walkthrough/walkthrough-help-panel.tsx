'use client';

import { Button, Panel } from '@isalwa/ui';
import { GUIDE_CHROME, INTRO_COPY } from '@/lib/walkthrough/copy';
import { TOUR_TARGET } from '@/lib/walkthrough/targets';
import { useOwnerDemo } from '@/components/demo/owner-demo-provider';
import { useGuide } from './guide-provider';
import { LearningModeToggle } from './learning-mode-toggle';

/**
 * Ayuda affordances: welcome replay + Story Mode + learning mode.
 * Story Mode is the only multi-step guided walkthrough.
 */
export function WalkthroughHelpPanel() {
  const api = useGuide();
  const { canUseOwnerDemo, openStory } = useOwnerDemo();

  return (
    <Panel padded className="mb-8 space-y-6" data-guide-replay="ayuda">
      <div data-tour={TOUR_TARGET.helpReplay}>
        <p className="isalwa-kicker">{GUIDE_CHROME.kicker}</p>
        <h2 className="mt-1 text-lg font-medium text-[var(--isalwa-kiln)]">
          Orientación
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
          La bienvenida corta explica qué es ISALWA. El recorrido guiado completo de evaluación
          es Story Mode. No hay un segundo recorrido paso a paso en el producto.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => api?.replayIntro()}>
            {INTRO_COPY.ayuda.affordances[0]}
          </Button>
        </div>
      </div>

      {canUseOwnerDemo ? (
        <div className="border-t border-[var(--isalwa-mist)] pt-6">
          <h3 className="text-sm font-medium text-[var(--isalwa-kiln)]">
            Recorrido completo de evaluación
          </h3>
          <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
            Único recorrido guiado multi-paso. Usa Story Mode con datos DEMO · ficticios y rutas
            normales del producto.
          </p>
          <div className="mt-4">
            <Button type="button" variant="primary" size="sm" onClick={openStory}>
              Ver recorrido completo
            </Button>
          </div>
        </div>
      ) : null}

      <div className="border-t border-[var(--isalwa-mist)] pt-6">
        <LearningModeToggle />
      </div>
    </Panel>
  );
}
