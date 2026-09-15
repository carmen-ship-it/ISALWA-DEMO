'use client';

import { useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Panel, StatusPill } from '@isalwa/ui';
import { GUIDE_CHROME, progressLabel } from '@/lib/walkthrough/copy';
import { handleGuideEscape, restoreHeadingFocus } from '@/lib/walkthrough/focus';
import { currentJourney } from '@/lib/walkthrough/progress';
import { useGuide } from './guide-provider';

function pillFor(kind: 'route' | 'pattern' | 'wave') {
  if (kind === 'route') return { tone: 'neutral' as const, label: GUIDE_CHROME.routePill };
  if (kind === 'pattern') return { tone: 'demo' as const, label: GUIDE_CHROME.patternPill };
  return { tone: 'demo' as const, label: GUIDE_CHROME.wavePill };
}

export function GuidePanel() {
  const api = useGuide();
  const router = useRouter();
  const titleId = useId();
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!api?.ready || api.record.panelHidden) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      const outcome = handleGuideEscape(document);
      if (outcome === 'ignored') return;
      event.preventDefault();
      api?.dismiss();
      restoreHeadingFocus(document);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [api]);

  if (!api?.ready || api.journeys.length === 0) return null;

  if (api.record.panelHidden) {
    return (
      <div className="pointer-events-none fixed bottom-4 right-4 z-20">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="pointer-events-auto shadow-[var(--isalwa-shadow-soft)]"
          onClick={() => api.reveal()}
        >
          {GUIDE_CHROME.show}
        </Button>
      </div>
    );
  }

  const journey = currentJourney(api.record, api.journeys) ?? api.journeys[0];
  if (!journey) return null;
  const stop = journey.stops[Math.min(api.record.stopIndex, journey.stops.length - 1)] ?? journey.stops[0];
  if (!stop) return null;
  const pill = pillFor(stop.kind);

  function hide() {
    api?.dismiss();
    restoreHeadingFocus(document);
  }

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-20 w-[min(100vw-2rem,22rem)]">
      <Panel
        padded
        data-guide-panel=""
        role="region"
        aria-labelledby={titleId}
        className="pointer-events-auto max-h-[min(70vh,calc(100dvh-5.5rem))] overflow-auto"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="isalwa-kicker">{GUIDE_CHROME.kicker}</p>
            <h2 id={titleId} className="mt-1 font-medium text-[var(--isalwa-kiln)]">
              {GUIDE_CHROME.title}
            </h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={GUIDE_CHROME.closeLabel}
            onClick={hide}
          >
            {GUIDE_CHROME.close}
          </Button>
        </div>
        <p className="mt-3 text-sm font-medium text-[var(--isalwa-kiln)]">{journey.title}</p>
        <p className="mt-1 text-sm leading-relaxed text-[var(--isalwa-slate)]">{journey.summary}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
          <span className="text-xs text-[var(--isalwa-slate)]">
            {progressLabel(api.record.stopIndex, journey.stops.length)}
          </span>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-[var(--isalwa-slate)]">{stop.body}</p>
        {notice ? (
          <p className="mt-2 text-sm leading-relaxed text-[var(--isalwa-slate)]" aria-live="polite">
            {notice}
          </p>
        ) : null}
        <p className="mt-3 text-xs leading-relaxed text-[var(--isalwa-slate)]">{GUIDE_CHROME.localNote}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={() => {
              const outcome = api.continueCurrent();
              if (outcome.href) {
                setNotice(null);
                router.push(outcome.href);
                return;
              }
              setNotice(outcome.message);
            }}
          >
            {GUIDE_CHROME.continue}
          </Button>
          <Link
            href="/ayuda"
            className="text-sm text-[var(--isalwa-slate)] underline-offset-2 hover:text-[var(--isalwa-kiln)] hover:underline"
          >
            {GUIDE_CHROME.ayuda}
          </Link>
        </div>
      </Panel>
    </div>
  );
}
