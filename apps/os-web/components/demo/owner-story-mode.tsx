'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, cx } from '@isalwa/ui';
import { useOwnerDemo } from '@/components/demo/owner-demo-provider';
import { DEMO_FICTITIOUS_BADGE } from '@/lib/demo/owner-demo-identity';
import { samePathQueryNavigation } from '@/lib/demo/preserve-data-mode';
import { loadDemoSeedIdMap } from '@/lib/demo/owner-demo-registry';
import {
  STORY_MODE_STEPS,
  STORY_MODE_TITLE,
  storyStepState,
} from '@/lib/demo/story-mode-steps';

const STEP_TONES = {
  completed: {
    bg: 'bg-[color-mix(in_srgb,#E7F4EC_90%,white)]',
    border: 'border-[color-mix(in_srgb,#2C8C88_40%,#E7F4EC)]',
    text: 'text-[color-mix(in_srgb,#1F6B4A_80%,var(--isalwa-kiln))]',
  },
  current: {
    bg: 'bg-[color-mix(in_srgb,#EAF6F4_95%,white)]',
    border: 'border-[#2C8C88]',
    text: 'text-[#2C8C88]',
  },
  future: {
    bg: 'bg-[var(--isalwa-porcelain)]',
    border: 'border-[var(--isalwa-mist)]',
    text: 'text-[var(--isalwa-slate)]',
  },
} as const;

/** Full-screen Story Mode overlay — Recorrido completo de ISALWA. */
export function OwnerStoryMode() {
  const { storyOpen, closeStory, canUseOwnerDemo } = useOwnerDemo();
  const router = useRouter();
  const [current, setCurrent] = useState(1);
  const ids = loadDemoSeedIdMap();

  useEffect(() => {
    if (!storyOpen) setCurrent(1);
  }, [storyOpen]);

  useEffect(() => {
    if (!storyOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') closeStory();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [storyOpen, closeStory]);

  if (!canUseOwnerDemo || !storyOpen) return null;

  const step = STORY_MODE_STEPS[current - 1];
  const href = step?.hrefFor(ids) ?? null;

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-[color-mix(in_srgb,var(--isalwa-kiln)_45%,transparent)] p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={STORY_MODE_TITLE}
    >
      <div className="mx-auto flex h-full w-full max-w-3xl flex-col overflow-hidden rounded-[var(--isalwa-radius-panel)] bg-[var(--isalwa-white)] shadow-[var(--isalwa-shadow-elevated)]">
        <header className="border-b border-[var(--isalwa-mist)] px-4 py-3 sm:px-6">
          <p className="text-[10px] font-bold tracking-[0.14em] text-[#2C8C88] uppercase">
            {DEMO_FICTITIOUS_BADGE}
          </p>
          <h2 className="mt-1 font-[family-name:var(--isalwa-font-display)] text-xl text-[var(--isalwa-kiln)] italic sm:text-2xl">
            {STORY_MODE_TITLE}
          </h2>
          <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
            Paso {current} de {STORY_MODE_STEPS.length}
          </p>
        </header>

        <div className="flex gap-1 overflow-x-auto px-4 py-3 sm:px-6" aria-hidden>
          {STORY_MODE_STEPS.map((s) => {
            const state = storyStepState(s.step, current);
            const tone = STEP_TONES[state];
            return (
              <button
                key={s.step}
                type="button"
                title={s.title}
                onClick={() => setCurrent(s.step)}
                className={cx(
                  'h-2 min-w-3 flex-1 rounded-full border',
                  tone.bg,
                  tone.border,
                )}
              />
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2 sm:px-6">
          {step ? (
            <div className="space-y-4">
              <div
                className={cx(
                  'rounded-[var(--isalwa-radius-panel)] border px-4 py-3',
                  STEP_TONES.current.bg,
                  STEP_TONES.current.border,
                )}
              >
                <p className="text-[10px] font-bold tracking-[0.12em] text-[#2C8C88] uppercase">
                  Paso {step.step}
                </p>
                <h3 className="mt-1 text-lg font-medium text-[var(--isalwa-kiln)]">{step.title}</h3>
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-[0.12em] text-[var(--isalwa-slate)] uppercase">
                  Qué ocurrió
                </p>
                <p className="mt-1 text-sm text-[var(--isalwa-kiln)]">{step.whatHappened}</p>
              </div>
              <div className="rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-porcelain)] px-4 py-3">
                <p className="text-[10px] font-bold tracking-[0.12em] text-[var(--isalwa-slate)] uppercase">
                  Quién normalmente lo hace
                </p>
                <p className="mt-1 text-sm font-medium text-[var(--isalwa-kiln)]">
                  {step.whoNormallyActs}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-[0.12em] text-[var(--isalwa-slate)] uppercase">
                  Qué registró ISALWA
                </p>
                <p className="mt-1 text-sm text-[var(--isalwa-kiln)]">{step.whatIsalwaRecorded}</p>
              </div>
              {href ? (
                <Link
                  href={href}
                  className="inline-flex"
                  onClick={(event) => {
                    if (
                      event.metaKey ||
                      event.ctrlKey ||
                      event.shiftKey ||
                      event.altKey ||
                      event.button !== 0
                    ) {
                      return;
                    }
                    event.preventDefault();
                    closeStory({ navigateTo: href });
                    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
                    const decision = samePathQueryNavigation(current, href);
                    if (decision.kind === 'assign') {
                      window.location.assign(decision.href);
                      return;
                    }
                    if (decision.kind === 'push') router.push(href);
                  }}
                >
                  <Button type="button" variant="primary" size="sm">
                    {step.ctaLabel}
                  </Button>
                </Link>
              ) : (
                <p className="text-sm text-[var(--isalwa-slate)]">
                  Aplique el seed DEMO en SYNTH para vincular este paso a un registro real.
                </p>
              )}
            </div>
          ) : null}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--isalwa-mist)] px-4 py-3 sm:px-6">
          <Button type="button" variant="tertiary" size="sm" onClick={() => closeStory()}>
            Salir del recorrido
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={current <= 1}
              onClick={() => setCurrent((n) => Math.max(1, n - 1))}
            >
              Anterior
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={current >= STORY_MODE_STEPS.length}
              onClick={() => setCurrent((n) => Math.min(STORY_MODE_STEPS.length, n + 1))}
            >
              Siguiente
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
