'use client';

import { useEffect, useRef } from 'react';
import { Button, Panel } from '@isalwa/ui';
import { INTRO_COPY } from '@/lib/walkthrough/copy';
import { useGuide } from './guide-provider';

/**
 * Welcome card shown on first eligible login.
 * Not modal-trapping: Escape dismisses, keyboard accessible, mobile safe.
 */
export function IntroWelcome() {
  const api = useGuide();
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus the panel when it mounts for keyboard accessibility
  useEffect(() => {
    if (api?.ready && !api.record.welcomeSeen) {
      panelRef.current?.focus();
    }
  }, [api?.ready, api?.record.welcomeSeen]);

  // Handle Escape to skip
  useEffect(() => {
    if (!api?.ready || api.record.welcomeSeen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        api?.skipIntro();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [api]);

  if (!api?.ready) return null;
  if (api.record.welcomeSeen) return null;

  const copy = INTRO_COPY.welcome;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--isalwa-kiln)]/20 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="false"
      aria-labelledby="intro-welcome-title"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="w-full max-w-md focus:outline-none"
      >
        <Panel
          padded
          className="animate-[fadeIn_var(--isalwa-motion-base)_var(--isalwa-ease-out)] bg-white shadow-[var(--isalwa-shadow-floating)]"
        >
          <h1
            id="intro-welcome-title"
            className="font-[var(--isalwa-font-display)] text-xl font-medium italic text-[var(--isalwa-kiln)]"
          >
            {copy.title}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-[var(--isalwa-kiln)]">
            {copy.body}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-[var(--isalwa-slate)]">
            {copy.secondary}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button type="button" onClick={() => api.startIntro()}>
              {copy.primary}
            </Button>
            <Button type="button" variant="secondary" onClick={() => api.skipIntro()}>
              {copy.skip}
            </Button>
          </div>
          <p className="mt-4 text-xs text-[var(--isalwa-slate)]">{copy.footer}</p>
        </Panel>
      </div>
    </div>
  );
}
