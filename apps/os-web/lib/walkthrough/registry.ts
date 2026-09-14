import { FALLBACK_WELCOME } from './copy';
import { isTourTargetId } from './targets';
import type { TourChapter, TourStateLabel, TourStep, TourWelcome } from './types';
import { TOUR_STATE_LABELS } from './types';

const chapters = new Map<string, TourChapter>();
let welcome: TourWelcome | null = null;

const LABEL_SET = new Set<string>(TOUR_STATE_LABELS);

export function isTourStateLabel(value: unknown): value is TourStateLabel {
  return typeof value === 'string' && LABEL_SET.has(value);
}

export function normalizeStep(input: unknown): TourStep | null {
  if (!input || typeof input !== 'object') return null;
  const step = input as Record<string, unknown>;
  if (typeof step.stepId !== 'string' || step.stepId.trim().length === 0) return null;
  if (typeof step.title !== 'string' || typeof step.body !== 'string') return null;
  if (!isTourStateLabel(step.stateLabel)) return null;
  const rawTarget = typeof step.target === 'string' ? step.target.trim() : '';
  const target = rawTarget && isTourTargetId(rawTarget) ? rawTarget : undefined;
  const nextRoute =
    typeof step.nextRoute === 'string' && step.nextRoute.startsWith('/') ? step.nextRoute : undefined;
  return {
    stepId: step.stepId.trim(),
    title: step.title,
    body: step.body,
    stateLabel: step.stateLabel,
    ...(target ? { target } : {}),
    ...(nextRoute ? { nextRoute } : {}),
  };
}

export function normalizeChapter(input: unknown, fallbackId?: string): TourChapter | null {
  if (!input || typeof input !== 'object') return null;
  const chapter = input as Record<string, unknown>;
  const chapterId =
    typeof chapter.chapterId === 'string' && chapter.chapterId.trim()
      ? chapter.chapterId.trim()
      : typeof chapter.id === 'string' && chapter.id.trim()
        ? chapter.id.trim()
        : fallbackId;
  if (!chapterId || !Array.isArray(chapter.steps)) return null;
  const steps = chapter.steps.map(normalizeStep).filter((step): step is TourStep => step !== null);
  const title = typeof chapter.title === 'string' && chapter.title.trim() ? chapter.title : chapterId;
  const routePrefix = typeof chapter.routePrefix === 'string' ? chapter.routePrefix : undefined;
  const routePrefixes = Array.isArray(chapter.routePrefixes)
    ? chapter.routePrefixes.filter((item): item is string => typeof item === 'string')
    : undefined;
  const roleVisibility = Array.isArray(chapter.roleVisibility)
    ? chapter.roleVisibility.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : undefined;
  return {
    chapterId,
    title,
    steps,
    ...(routePrefix ? { routePrefix } : {}),
    ...(routePrefixes && routePrefixes.length > 0 ? { routePrefixes } : {}),
    ...(roleVisibility && roleVisibility.length > 0 ? { roleVisibility } : {}),
  };
}

export function registerChapter(input: unknown, fallbackId?: string): boolean {
  const chapter = normalizeChapter(input, fallbackId);
  if (!chapter) return false;
  chapters.set(chapter.chapterId, chapter);
  return true;
}

export function registerWelcome(input: unknown): boolean {
  if (!input || typeof input !== 'object') return false;
  const value = input as Record<string, unknown>;
  if (typeof value.title !== 'string' || typeof value.body !== 'string') return false;
  if (!value.title.trim() || !value.body.trim()) return false;
  welcome = {
    title: value.title,
    body: value.body,
    ...(typeof value.kicker === 'string' && value.kicker.trim() ? { kicker: value.kicker } : {}),
  };
  return true;
}

export function getChapters(): readonly TourChapter[] {
  return [...chapters.values()];
}

export function getWelcome(): TourWelcome {
  return welcome ?? FALLBACK_WELCOME;
}

export function resetWalkthroughRegistryForTests(): void {
  chapters.clear();
  welcome = null;
}
