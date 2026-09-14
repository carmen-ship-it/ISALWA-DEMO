'use client';

import { Button, Panel } from '@isalwa/ui';
import { FALLBACK_WELCOME, LEARNING_MODE_LABEL, SHELL_CONTROLS } from '@/lib/walkthrough/copy';
import { TOUR_TARGET } from '@/lib/walkthrough/targets';
import { useWalkthrough } from './walkthrough-provider';

export function LearningModeControl() {
  const { record, setLearningMode } = useWalkthrough();
  return (
    <div data-tour={TOUR_TARGET.learningMode} className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        variant={record.learningMode ? 'secondary' : 'ghost'}
        aria-pressed={record.learningMode}
        onClick={() => setLearningMode(!record.learningMode)}
      >
        {LEARNING_MODE_LABEL}
      </Button>
      <p className="text-sm text-[var(--isalwa-slate)]">{record.learningMode ? 'Activo' : 'Inactivo'}</p>
    </div>
  );
}

export function WalkthroughHelpPanel() {
  const api = useWalkthrough();
  const notStarted = api.record.runState === 'NOT_STARTED';

  return (
    <Panel padded className="mb-8">
      <p className="isalwa-kicker">Recorrido</p>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">{FALLBACK_WELCOME.body}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {notStarted ? (
          <Button type="button" onClick={api.openWelcome}>
            {SHELL_CONTROLS.start}
          </Button>
        ) : null}
        {api.record.runState === 'IN_PROGRESS' ? (
          <Button type="button" onClick={api.resume}>
            {SHELL_CONTROLS.next}
          </Button>
        ) : null}
        <Button type="button" variant="secondary" onClick={api.replay}>
          {SHELL_CONTROLS.replay}
        </Button>
        <Button type="button" variant="secondary" onClick={api.startPageTour} disabled={!api.pageChapter}>
          {SHELL_CONTROLS.pageTour}
        </Button>
      </div>
      <div className="mt-4">
        <LearningModeControl />
      </div>
    </Panel>
  );
}
