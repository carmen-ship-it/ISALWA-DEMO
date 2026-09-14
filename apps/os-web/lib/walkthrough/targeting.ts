import type { TourStep } from './types';

export type StepCursor = {
  stepId: string;
  target?: string;
};

export function selectAvailableStep<T extends StepCursor>(
  steps: readonly T[],
  startIndex: number,
  direction: 1 | -1,
  available: (step: T) => boolean,
): number | null {
  if (steps.length === 0) return null;
  const last = steps.length - 1;
  if (startIndex > last || startIndex < 0) return null;
  for (let index = startIndex; index >= 0 && index <= last; index += direction) {
    const step = steps[index];
    if (step && available(step)) return index;
  }
  return null;
}

export function isStepAvailable(
  step: Pick<TourStep, 'target'>,
  present: (target: string) => boolean,
): boolean {
  if (!step.target) return true;
  return present(step.target);
}

/** A missing target is skipped. An untargeted step is shown. Never throws. */
export function skipMissingTarget<T extends StepCursor>(
  steps: readonly T[],
  index: number,
  direction: 1 | -1,
  present: (target: string) => boolean,
): number | null {
  return selectAvailableStep(steps, index, direction, (step) => isStepAvailable(step, present));
}

export type Box = { width: number; height: number };

export function hasVisibleBox(box: Box | null | undefined, hidden = false): boolean {
  if (hidden || !box) return false;
  return box.width > 0 && box.height > 0;
}

export function routeMatches(pathname: string, nextRoute: string | undefined): boolean {
  if (!nextRoute) return true;
  const path = nextRoute.split(/[?#]/)[0] || '/';
  if (!path.startsWith('/')) return pathname === path;
  if (path === '/') return pathname === '/';
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function prefersReducedMotion(matches: (query: string) => boolean): boolean {
  return matches('(prefers-reduced-motion: reduce)');
}

export function scrollBehavior(reducedMotion: boolean): 'auto' | 'smooth' {
  return reducedMotion ? 'auto' : 'smooth';
}

export type CardPlacement = {
  mode: 'anchored' | 'sheet' | 'center';
  top: number;
  left: number;
};

export function placeTourCard(input: {
  target: { top: number; bottom: number; left: number; width: number } | null;
  viewport: { width: number; height: number };
  cardWidth: number;
  cardHeight: number;
}): CardPlacement {
  const { viewport, cardWidth, cardHeight } = input;
  const margin = 16;
  if (viewport.width < 640) {
    return {
      mode: 'sheet',
      top: Math.max(margin, viewport.height - cardHeight - margin),
      left: margin,
    };
  }
  if (!input.target) {
    return {
      mode: 'center',
      top: Math.max(margin, (viewport.height - cardHeight) / 2),
      left: Math.max(margin, (viewport.width - cardWidth) / 2),
    };
  }
  const gap = 12;
  const spaceBelow = viewport.height - input.target.bottom - gap;
  const top =
    spaceBelow >= cardHeight || spaceBelow >= input.target.top
      ? input.target.bottom + gap
      : Math.max(margin, input.target.top - cardHeight - gap);
  let left = input.target.left + input.target.width / 2 - cardWidth / 2;
  left = Math.max(margin, Math.min(viewport.width - cardWidth - margin, left));
  return { mode: 'anchored', top: Math.max(margin, top), left };
}

export type QueryRoot = {
  querySelector(selector: string): unknown;
};

export function hasBlockingDialog(root: QueryRoot): boolean {
  return Boolean(root.querySelector('dialog[open]') || root.querySelector('[aria-modal="true"]'));
}

export function canOfferTour(input: { surfaceOpen: boolean; blockingDialog: boolean }): boolean {
  return !input.surfaceOpen && !input.blockingDialog;
}
