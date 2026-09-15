'use client';

import { Button, Panel } from '@isalwa/ui';
import { GUIDE_CHROME, INTRO_COPY, replayLabel } from '@/lib/walkthrough/copy';
import { TOUR_TARGET } from '@/lib/walkthrough/targets';
import { useGuide } from './guide-provider';
import { LearningModeToggle } from './learning-mode-toggle';

export { replayFromAyuda } from '@/lib/walkthrough/progress';

export function WalkthroughHelpPanel() {
  const api = useGuide();
  const journeys = api?.journeys ?? [];

  return (
    <Panel padded className="mb-8 space-y-6" data-guide-replay="ayuda">
      {/* Intro replay section */}
      <div data-tour={TOUR_TARGET.helpReplay}>
        <p className="isalwa-kicker">{GUIDE_CHROME.kicker}</p>
        <h2 className="mt-1 text-lg font-medium text-[var(--isalwa-kiln)]">
          {INTRO_COPY.ayuda.affordances[0]}
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
          {INTRO_COPY.welcome.footer}
        </p>
        <div className="mt-4">
          <Button type="button" variant="secondary" onClick={() => api?.replayIntro()}>
            {INTRO_COPY.ayuda.affordances[0]}
          </Button>
        </div>
      </div>

      {/* Learning mode toggle */}
      <div className="border-t border-[var(--isalwa-mist)] pt-6">
        <LearningModeToggle />
      </div>

      {/* Legacy journey replay */}
      {journeys.length > 0 && (
        <div className="border-t border-[var(--isalwa-mist)] pt-6">
          <h3 className="text-sm font-medium text-[var(--isalwa-kiln)]">
            {GUIDE_CHROME.title}
          </h3>
          <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
            {GUIDE_CHROME.localNote}
          </p>
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
      )}
    </Panel>
  );
}
