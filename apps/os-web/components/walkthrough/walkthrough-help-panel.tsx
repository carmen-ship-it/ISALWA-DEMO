'use client';

import { usePathname } from 'next/navigation';
import { Button, Panel } from '@isalwa/ui';
import { FALLBACK_WELCOME, SHELL_CONTROLS } from '@/lib/walkthrough/copy';
import {
  extraExplanationLines,
  replayControlLabels,
  resolveReplayableChapters,
  startGeneralReplay,
  startListedChapter,
  type ReplayRunnerFields,
} from '@/lib/walkthrough/learning-replay';
import { TOUR_TARGET } from '@/lib/walkthrough/targets';
import { useWalkthrough } from './walkthrough-provider';

function useWalkthroughWithReplay() {
  return useWalkthrough() as ReturnType<typeof useWalkthrough> & ReplayRunnerFields;
}

export function LearningModeControl() {
  const api = useWalkthroughWithReplay();
  const enabled = api.record.learningMode;
  const extra = extraExplanationLines(enabled);

  return (
    <div data-tour={TOUR_TARGET.learningMode}>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant={enabled ? 'secondary' : 'ghost'}
          aria-pressed={enabled}
          aria-describedby="learning-mode-description"
          onClick={() => api.setLearningMode(!enabled)}
        >
          Modo aprendizaje
        </Button>
      </div>
      <p
        id="learning-mode-description"
        className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]"
      >
        {enabled
          ? 'Actívalo si quieres ver explicaciones extra mientras trabajas.'
          : 'Puedes apagarlo cuando ya te sientas cómodo.'}
      </p>
      {enabled
        ? extra.map((line) => (
            <p key={line} className="mt-1 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
              {line}
            </p>
          ))
        : null}
    </div>
  );
}

export function WalkthroughHelpPanel() {
  const api = useWalkthroughWithReplay();
  const pathname = usePathname() || '/';
  const chapters = resolveReplayableChapters(api.replayableChapters);
  const labels = replayControlLabels();
  const notStarted = api.record.runState === 'NOT_STARTED';
  const actions = {
    startChapter: api.startChapter,
    replay: api.replay,
    startPageTour: api.startPageTour,
    pageChapter: api.pageChapter,
  };

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
        <Button
          type="button"
          variant="secondary"
          onClick={() => startGeneralReplay(actions, chapters, api.chapterStates, pathname)}
        >
          {labels.general}
        </Button>
        <Button type="button" variant="secondary" onClick={api.startPageTour} disabled={!api.pageChapter}>
          {labels.page}
        </Button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {chapters.map((chapter) => (
          <Button
            key={chapter.chapterId}
            type="button"
            variant="secondary"
            onClick={() => startListedChapter(actions, chapter.chapterId, pathname)}
          >
            {chapter.label}
          </Button>
        ))}
      </div>
      <div className="mt-4">
        <LearningModeControl />
      </div>
    </Panel>
  );
}
