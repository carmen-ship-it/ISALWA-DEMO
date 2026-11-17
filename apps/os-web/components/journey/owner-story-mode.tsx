'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, cx } from '@isalwa/ui';
import { useJourney } from '@/components/journey/journey-provider';
import { samePathQueryNavigation } from '@/lib/navigation/same-path-navigation';
import {
  EVALUATION_OPERATIONAL_BUILT_NOTICE,
  EVALUATION_POST_LOGIN,
  EVALUATION_WALKTHROUGH_INTRO,
  EVALUATION_WALKTHROUGH_NOTICE,
  EVALUATION_WALKTHROUGH_TITLE,
} from '@/lib/evaluation/walkthrough-config';
import {
  STORY_DECISION_HEADING,
  STORY_END_BODY,
  STORY_END_BUTTON,
  STORY_END_FOOTNOTE,
  STORY_END_HREF,
  STORY_END_TITLE,
  STORY_EXTERNAL_HEADING,
  STORY_FEEDBACK_PROMPT,
  STORY_INTRO,
  STORY_MODE_STEPS,
  STORY_MODE_TITLE,
  STORY_PROPOSAL_NOTICE,
  STORY_STATUS_LABELS,
  storyStepState,
  type StoryModeStep,
  type StoryPanelView,
  type StoryStepStatus,
} from '@/lib/journey/story-steps';

/** Product overlay (shell) vs protected evaluation page (no operational CTAs). */
export type StoryPresentation = 'product-overlay' | 'evaluation-page';

const STEP_TONES = {
  completed: {
    bg: 'bg-[color-mix(in_srgb,#E7F4EC_90%,white)]',
    border: 'border-[color-mix(in_srgb,#2C8C88_40%,#E7F4EC)]',
  },
  current: {
    bg: 'bg-[color-mix(in_srgb,#EAF6F4_95%,white)]',
    border: 'border-[#2C8C88]',
  },
  future: {
    bg: 'bg-[var(--isalwa-porcelain)]',
    border: 'border-[var(--isalwa-mist)]',
  },
} as const;

const STATUS_SURFACE: Record<
  StoryStepStatus,
  { panel: string; text: string; label: string }
> = {
  available: {
    panel: 'border-[#3A7A52]/35 bg-[#E7F4EC]',
    text: 'text-[#3A7A52]',
    label: STORY_STATUS_LABELS.available,
  },
  partial: {
    panel: 'border-[#B8872E]/40 bg-[#FFF5DB]',
    text: 'text-[var(--isalwa-kiln)]',
    label: STORY_STATUS_LABELS.partial,
  },
  proposal: {
    panel: 'border-[color-mix(in_srgb,var(--isalwa-glaze)_35%,#EDF5F8)] bg-[#EDF5F8]',
    text: 'text-[var(--isalwa-kiln)]',
    label: STORY_STATUS_LABELS.proposal,
  },
  decision: {
    panel: 'border-[#B8872E]/40 bg-[#FFF5DB]',
    text: 'text-[var(--isalwa-kiln)]',
    label: STORY_STATUS_LABELS.decision,
  },
  external: {
    panel: 'border-[var(--isalwa-kiln)]/25 bg-[var(--isalwa-white)]',
    text: 'text-[#4A5D73]',
    label: STORY_STATUS_LABELS.external,
  },
};

function navigateAfterClose(
  href: string,
  closeStory: (options?: { navigateTo?: string | null }) => void,
  router: ReturnType<typeof useRouter>,
) {
  closeStory({ navigateTo: href });
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const decision = samePathQueryNavigation(current, href);
  if (decision.kind === 'assign') {
    window.location.assign(decision.href);
    return;
  }
  if (decision.kind === 'push') router.push(href);
}

function StatusPill({ status }: { status: StoryStepStatus }) {
  const surface = STATUS_SURFACE[status];
  return (
    <p
      className={cx(
        'inline-flex items-center rounded-[var(--isalwa-radius-control)] border px-2.5 py-1 text-xs font-medium',
        surface.panel,
        surface.text,
      )}
      data-story-status={status}
    >
      {surface.label}
    </p>
  );
}

function ProposalNotice() {
  return (
    <p
      className="rounded-[var(--isalwa-radius-control)] border border-[color-mix(in_srgb,var(--isalwa-glaze)_35%,#EDF5F8)] bg-[#EDF5F8] px-3 py-2 text-xs leading-relaxed text-[var(--isalwa-kiln)]"
      data-story-proposal-notice=""
    >
      {STORY_PROPOSAL_NOTICE}
    </p>
  );
}

function FeedbackPrompt() {
  return (
    <div
      className="rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-porcelain)] px-3 py-2"
      data-story-feedback-prompt=""
    >
      <p className="whitespace-pre-line text-xs leading-relaxed text-[var(--isalwa-kiln)]">
        {STORY_FEEDBACK_PROMPT}
      </p>
    </div>
  );
}

function LayerBlock({
  kicker,
  body,
  tone,
}: {
  kicker: string;
  body: string;
  tone: 'now' | 'proposal' | 'decision' | 'external' | 'notice';
}) {
  const classes =
    tone === 'now'
      ? 'border-[var(--isalwa-mist)] bg-[var(--isalwa-white)]'
      : tone === 'proposal'
        ? 'border-[color-mix(in_srgb,var(--isalwa-glaze)_35%,#EDF5F8)] bg-[#EDF5F8]'
        : tone === 'decision'
          ? 'border-[#B8872E]/40 bg-[#FFF5DB]'
          : tone === 'notice'
            ? 'border-[var(--isalwa-mist)] bg-[var(--isalwa-porcelain)]'
            : 'border-[var(--isalwa-kiln)]/25 bg-[var(--isalwa-white)]';
  return (
    <div className={cx('rounded-[var(--isalwa-radius-panel)] border px-4 py-3', classes)}>
      <p className="text-[10px] font-bold tracking-[0.12em] text-[var(--isalwa-slate)] uppercase">
        {kicker}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-[var(--isalwa-kiln)]">{body}</p>
    </div>
  );
}

function StepBody({
  step,
  view,
  walkthroughOnly,
  onOpenWorking,
  setView,
}: {
  step: StoryModeStep;
  view: StoryPanelView;
  walkthroughOnly: boolean;
  onOpenWorking: (href: string) => void;
  setView: (view: StoryPanelView) => void;
}) {
  if (view === 'proposal') {
    return (
      <div className="space-y-3" data-story-panel="proposal">
        <ProposalNotice />
        <LayerBlock kicker="Así funcionará esta etapa" body={step.proposalText} tone="proposal" />
        <FeedbackPrompt />
        <Button type="button" variant="secondary" size="sm" onClick={() => setView('step')}>
          Volver al paso
        </Button>
      </div>
    );
  }
  if (view === 'decision' && step.decisionText) {
    return (
      <div className="space-y-3" data-story-panel="decision">
        <ProposalNotice />
        <LayerBlock kicker={STORY_DECISION_HEADING} body={step.decisionText} tone="decision" />
        <FeedbackPrompt />
        <Button type="button" variant="secondary" size="sm" onClick={() => setView('step')}>
          Volver al paso
        </Button>
      </div>
    );
  }
  if (view === 'external' && step.externalRequirement) {
    return (
      <div className="space-y-3" data-story-panel="external">
        <ProposalNotice />
        <LayerBlock
          kicker={STORY_EXTERNAL_HEADING}
          body={step.externalRequirement}
          tone="external"
        />
        <FeedbackPrompt />
        <Button type="button" variant="secondary" size="sm" onClick={() => setView('step')}>
          Volver al paso
        </Button>
      </div>
    );
  }

  const showProposalActions =
    step.status === 'proposal' ||
    step.status === 'decision' ||
    step.status === 'external' ||
    Boolean(step.proposalText);

  const hasWorkingCta = Boolean(step.href && step.workingActionLabel);
  const showOperationalBuiltNotice =
    walkthroughOnly && hasWorkingCta && (step.status === 'available' || step.status === 'partial');

  return (
    <div className="space-y-4" data-story-panel="step">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill status={step.status} />
        <p className="text-xs text-[var(--isalwa-slate)]">{step.role}</p>
      </div>
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

      <LayerBlock kicker="Lo que puedes probar ahora" body={step.currentStateText} tone="now" />

      {showOperationalBuiltNotice ? (
        <LayerBlock
          kicker="En esta evaluación"
          body={EVALUATION_OPERATIONAL_BUILT_NOTICE}
          tone="notice"
        />
      ) : null}

      <div className="space-y-2">
        <ProposalNotice />
        <LayerBlock kicker="Así funcionará esta etapa" body={step.proposalText} tone="proposal" />
      </div>

      {step.decisionText ? (
        <LayerBlock kicker={STORY_DECISION_HEADING} body={step.decisionText} tone="decision" />
      ) : null}

      {step.externalRequirement ? (
        <LayerBlock
          kicker={STORY_EXTERNAL_HEADING}
          body={step.externalRequirement}
          tone="external"
        />
      ) : null}

      {(step.status === 'proposal' ||
        step.status === 'decision' ||
        step.status === 'external' ||
        walkthroughOnly) && <FeedbackPrompt />}

      <div className="flex flex-wrap gap-2">
        {!walkthroughOnly && step.href && step.workingActionLabel ? (
          <Link
            href={step.href}
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
              onOpenWorking(step.href!);
            }}
          >
            <Button type="button" variant="primary" size="sm">
              {step.workingActionLabel}
            </Button>
          </Link>
        ) : null}

        {walkthroughOnly && showOperationalBuiltNotice ? (
          <Button type="button" variant="secondary" size="sm" onClick={() => setView('proposal')}>
            Ver propuesta
          </Button>
        ) : null}

        {!walkthroughOnly &&
        (step.status === 'proposal' || step.status === 'partial') &&
        showProposalActions ? (
          <Button type="button" variant="secondary" size="sm" onClick={() => setView('proposal')}>
            Ver propuesta
          </Button>
        ) : null}

        {step.decisionText ? (
          <Button type="button" variant="secondary" size="sm" onClick={() => setView('decision')}>
            Ver qué necesitamos decidir
          </Button>
        ) : null}

        {step.externalRequirement ? (
          <Button type="button" variant="secondary" size="sm" onClick={() => setView('external')}>
            Ver requisito
          </Button>
        ) : null}
      </div>
    </div>
  );
}

type OwnerStoryModeProps = {
  presentation?: StoryPresentation;
};

/** Full-screen guided presentation — Recorrido guiado (product) or Evaluación guiada. */
export function OwnerStoryMode({ presentation = 'product-overlay' }: OwnerStoryModeProps) {
  const walkthroughOnly = presentation === 'evaluation-page';
  const { storyOpen, closeStory, canOpenJourney } = useJourney();
  const router = useRouter();
  const [current, setCurrent] = useState(1);
  const [view, setView] = useState<StoryPanelView>('step');
  const atEnd = view === 'end';

  const panelOpen = walkthroughOnly ? true : storyOpen;
  const panelAllowed = walkthroughOnly ? true : canOpenJourney;

  const chromeTitle = walkthroughOnly ? EVALUATION_WALKTHROUGH_TITLE : STORY_MODE_TITLE;
  const chromeIntro = walkthroughOnly ? EVALUATION_WALKTHROUGH_INTRO : STORY_INTRO;
  const endHref = walkthroughOnly ? EVALUATION_POST_LOGIN : STORY_END_HREF;
  const endButton = walkthroughOnly ? 'Volver al inicio del recorrido' : STORY_END_BUTTON;

  useEffect(() => {
    if (!panelOpen && !walkthroughOnly) {
      setCurrent(1);
      setView('step');
    }
  }, [panelOpen, walkthroughOnly]);

  useEffect(() => {
    setView('step');
  }, [current]);

  useEffect(() => {
    if (!panelOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      if (walkthroughOnly) {
        setView('step');
        setCurrent(1);
        return;
      }
      closeStory();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panelOpen, closeStory, walkthroughOnly]);

  if (!panelAllowed || !panelOpen) return null;

  const step = STORY_MODE_STEPS[current - 1];

  return (
    <div
      className={cx(
        walkthroughOnly
          ? 'flex min-h-[70vh] flex-col'
          : 'fixed inset-0 z-[60] flex flex-col bg-[color-mix(in_srgb,var(--isalwa-kiln)_45%,transparent)] p-3 sm:p-6',
      )}
      role="dialog"
      aria-modal="true"
      aria-label={chromeTitle}
      data-story-recorrido=""
      data-story-presentation={presentation}
    >
      <div
        className={cx(
          'mx-auto flex w-full max-w-3xl flex-col overflow-hidden rounded-[var(--isalwa-radius-panel)] bg-[var(--isalwa-white)] shadow-[var(--isalwa-shadow-elevated)]',
          walkthroughOnly ? 'min-h-[70vh]' : 'h-full',
        )}
      >
        <header className="border-b border-[var(--isalwa-mist)] px-4 py-3 sm:px-6">
          <p className="text-[10px] font-bold tracking-[0.14em] text-[#2C8C88] uppercase">
            {chromeTitle}
          </p>
          <h2 className="mt-1 font-[family-name:var(--isalwa-font-display)] text-xl text-[var(--isalwa-kiln)] italic sm:text-2xl">
            {atEnd ? STORY_END_TITLE : chromeTitle}
          </h2>
          {!atEnd ? (
            <>
              <p className="mt-2 text-sm leading-relaxed text-[var(--isalwa-slate)]">{chromeIntro}</p>
              {walkthroughOnly ? (
                <p
                  className="mt-3 rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-porcelain)] px-3 py-2 text-xs leading-relaxed text-[var(--isalwa-kiln)]"
                  data-evaluation-walkthrough-notice=""
                >
                  {EVALUATION_WALKTHROUGH_NOTICE}
                </p>
              ) : null}
              <p className="mt-2 text-sm text-[var(--isalwa-slate)]">
                Paso {current} de {STORY_MODE_STEPS.length}
              </p>
            </>
          ) : null}
        </header>

        {!atEnd ? (
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
                  className={cx('h-2 min-w-3 flex-1 rounded-full border', tone.bg, tone.border)}
                />
              );
            })}
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto px-4 py-2 sm:px-6">
          {atEnd ? (
            <div className="space-y-4" data-story-panel="end">
              <p className="text-sm leading-relaxed text-[var(--isalwa-kiln)]">{STORY_END_BODY}</p>
              <FeedbackPrompt />
              {walkthroughOnly ? (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setView('step');
                    setCurrent(1);
                  }}
                >
                  {endButton}
                </Button>
              ) : (
                <Link
                  href={endHref}
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
                    navigateAfterClose(STORY_END_HREF, closeStory, router);
                  }}
                >
                  <Button type="button" variant="primary" size="sm">
                    {STORY_END_BUTTON}
                  </Button>
                </Link>
              )}
              <p className="text-xs leading-relaxed text-[var(--isalwa-slate)]">{STORY_END_FOOTNOTE}</p>
            </div>
          ) : step ? (
            <StepBody
              step={step}
              view={view}
              walkthroughOnly={walkthroughOnly}
              setView={setView}
              onOpenWorking={(href) => navigateAfterClose(href, closeStory, router)}
            />
          ) : null}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--isalwa-mist)] px-4 py-3 sm:px-6">
          <Button
            type="button"
            variant="tertiary"
            size="sm"
            onClick={() => {
              if (walkthroughOnly) {
                setView('step');
                setCurrent(1);
                return;
              }
              closeStory();
            }}
          >
            Cerrar recorrido
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={atEnd ? false : current <= 1}
              onClick={() => {
                if (atEnd) {
                  setView('step');
                  setCurrent(STORY_MODE_STEPS.length);
                  return;
                }
                setCurrent((n) => Math.max(1, n - 1));
              }}
            >
              Anterior
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={atEnd}
              onClick={() => {
                if (current >= STORY_MODE_STEPS.length) {
                  setView('end');
                  return;
                }
                setCurrent((n) => Math.min(STORY_MODE_STEPS.length, n + 1));
              }}
            >
              Siguiente
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
