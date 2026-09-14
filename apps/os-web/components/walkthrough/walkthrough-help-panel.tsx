'use client';

import { Button, Panel } from '@isalwa/ui';
import { GUIDE_CHROME, replayLabel } from '@/lib/walkthrough/copy';
import { useGuide } from './guide-provider';

export { replayFromAyuda } from '@/lib/walkthrough/progress';

export function WalkthroughHelpPanel() {
  const api = useGuide();
  const journeys = api?.journeys ?? [];

  return (
    <Panel padded className="mb-8" data-guide-replay="ayuda">
      <p className="isalwa-kicker">{GUIDE_CHROME.kicker}</p>
      <h2 className="mt-1 text-lg font-medium text-[var(--isalwa-kiln)]">{GUIDE_CHROME.title}</h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
        {GUIDE_CHROME.localNote}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {journeys.map((journey) => (
          <Button
            key={journey.id}
            type="button"
            variant="secondary"
            onClick={() => api?.replay(journey.id)}
          >
            {replayLabel(journey.title)}
          </Button>
        ))}
        <Button type="button" variant="ghost" onClick={() => api?.reset()}>
          {GUIDE_CHROME.reset}
        </Button>
      </div>
    </Panel>
  );
}
