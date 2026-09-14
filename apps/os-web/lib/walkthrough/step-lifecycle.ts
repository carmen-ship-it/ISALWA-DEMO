import { startRun, type PlannedStep } from './plan';
import type { WalkthroughRecord } from './types';

export type AuthoredStep = {
  stepId: string;
  title?: string;
  body?: string;
  target?: string;
  nextRoute?: string;
  chapterId?: string;
};

/**
 * A teaching step with title and body stays in the chapter even when its
 * data-tour selector is absent. Missing targets are optional presentation.
 */
export function keepsAuthoredStep(step: { title?: string; body?: string } | null | undefined): boolean {
  if (!step) return false;
  return Boolean(step.title?.trim() && step.body?.trim());
}

/** Next authored teaching step at or after fromIndex. Never skips for a missing target. */
export function authoredStepIndex(
  steps: readonly { title?: string; body?: string }[],
  fromIndex: number,
): number | null {
  if (steps.length === 0 || fromIndex >= steps.length) return null;
  const start = fromIndex < 0 ? 0 : fromIndex;
  for (let cursor = start; cursor < steps.length; cursor += 1) {
    if (keepsAuthoredStep(steps[cursor])) return cursor;
  }
  return null;
}

export function decideNext(input: {
  steps: readonly AuthoredStep[];
  stepId: string | null;
  scopeChapterId: string | null;
  chapterId: string | null;
}): { type: 'advance'; index: number } | { type: 'complete'; chapterId: string | null } | { type: 'hold' } {
  const index = input.steps.findIndex((item) => item.stepId === input.stepId);
  if (index < 0) return { type: 'hold' };
  const following = authoredStepIndex(input.steps, index + 1);
  if (following === null) {
    return { type: 'complete', chapterId: input.scopeChapterId ?? input.chapterId };
  }
  return { type: 'advance', index: following };
}

/**
 * A missing selector does not complete or dismiss this chapter, and it does
 * not touch any other chapter. Authored copy still shows on an untargeted card.
 */
export function missingTargetDecision(step: { title?: string; body?: string } | null | undefined): {
  show: boolean;
  anchor: 'untargeted';
  complete: false;
  dismiss: false;
} {
  return {
    show: keepsAuthoredStep(step),
    anchor: 'untargeted',
    complete: false,
    dismiss: false,
  };
}

/**
 * Pending means the ring is not placed yet. The teaching card stays mounted
 * so Siguiente can land. Only a closed or unmounted surface hides it.
 */
export function cardStaysMounted(input: { mounted: boolean; surface: string; anchor: string }): boolean {
  if (!input.mounted || input.surface === 'closed') return false;
  return input.anchor !== 'closed';
}

function pathOnly(value: string): string {
  const path = (value.split(/[?#]/)[0] || '/').replace(/\/+$/, '');
  return path || '/';
}

/**
 * Same-page nextRoute must not router.push. A query-only change is the same
 * path and can remount the page, which drops the card.
 */
export function shouldPushNextRoute(pathname: string, nextRoute: string | undefined): boolean {
  if (!nextRoute || !nextRoute.startsWith('/')) return false;
  return pathOnly(pathname) !== pathOnly(nextRoute);
}

export function replayOpensSurface(started: { runState: string; stepId: string | null }): boolean {
  return started.runState === 'IN_PROGRESS' && Boolean(started.stepId);
}

/** Replay is intentional. A previously completed chapter starts again and opens. */
export function replayChapter(
  record: WalkthroughRecord,
  steps: readonly PlannedStep[],
  chapterId: string,
): { record: WalkthroughRecord; surface: 'step' | 'closed' } {
  const started = startRun(record, steps, chapterId);
  return {
    record: started,
    surface: replayOpensSurface(started) ? 'step' : 'closed',
  };
}

/**
 * After hydration, open only when the persistence gate says so, on the saved
 * step. This does not reset the chapter. A false gate stays closed, including
 * a completed chapter that must not auto-open by itself.
 */
export function resumeSurface(record: { stepId: string | null }, shouldOpen: boolean): 'step' | 'closed' {
  if (!shouldOpen || !record.stepId) return 'closed';
  return 'step';
}

/** Do not replace the external opener with a control inside the tour card. */
export function shouldKeepExternalOpener(active: unknown): boolean {
  if (!active || typeof active !== 'object') return false;
  const closest = (active as { closest?: unknown }).closest;
  if (typeof closest !== 'function') return false;
  try {
    return Boolean(closest.call(active, '[data-walkthrough-root]'));
  } catch {
    return false;
  }
}
