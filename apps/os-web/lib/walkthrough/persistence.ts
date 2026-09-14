import { initialWalkthroughRecord, isTourRunState } from './state';
import type { TourRunState, WalkthroughRecord } from './types';
import { WALKTHROUGH_RECORD_VERSION } from './types';

/** Browser-local key. The record version inside the JSON is independent of this name. */
export const WALKTHROUGH_STORAGE_KEY = 'isalwa.os-web.walkthrough.v1';

export type KeyValueStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function chapterStateMap(value: unknown): Record<string, TourRunState> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const states: Record<string, TourRunState> = {};
  for (const [chapterId, runState] of Object.entries(value as Record<string, unknown>)) {
    if (chapterId.trim() && isTourRunState(runState)) states[chapterId] = runState;
  }
  return states;
}

/**
 * A v1 record had one runState for the whole catalog. DISMISSED/COMPLETED on
 * that record applies only to global. A v1 terminal flag must not leave
 * learning mode forced off for every page. Other chapters start fresh.
 */
function migrateV1(data: Partial<WalkthroughRecord>): WalkthroughRecord {
  const runState = isTourRunState(data.runState) ? data.runState : 'NOT_STARTED';
  const completedChapterIds = stringList(data.completedChapterIds);
  const chapterStates: Record<string, TourRunState> = {};
  for (const chapterId of completedChapterIds) {
    chapterStates[chapterId] = 'COMPLETED';
  }
  if (runState === 'DISMISSED') {
    chapterStates.global = 'DISMISSED';
  } else if (runState === 'COMPLETED' && completedChapterIds.length === 0) {
    chapterStates.global = 'COMPLETED';
  } else if (runState === 'IN_PROGRESS') {
    const active =
      typeof data.scopeChapterId === 'string'
        ? data.scopeChapterId
        : typeof data.chapterId === 'string'
          ? data.chapterId
          : 'global';
    chapterStates[active] = 'IN_PROGRESS';
  }
  const scopeChapterId =
    typeof data.scopeChapterId === 'string'
      ? data.scopeChapterId
      : runState === 'IN_PROGRESS'
        ? typeof data.chapterId === 'string'
          ? data.chapterId
          : 'global'
        : null;
  return {
    version: WALKTHROUGH_RECORD_VERSION,
    runState,
    chapterId: typeof data.chapterId === 'string' ? data.chapterId : null,
    scopeChapterId,
    stepId: typeof data.stepId === 'string' ? data.stepId : null,
    learningMode: runState === 'DISMISSED' || runState === 'COMPLETED' ? true : data.learningMode !== false,
    dismissedPageKeys: stringList(data.dismissedPageKeys),
    offeredPageKeys: stringList(data.offeredPageKeys),
    completedChapterIds,
    welcomeClosed: data.welcomeClosed === true,
    chapterStates,
  };
}

export function parseWalkthroughRecord(raw: string | null): WalkthroughRecord {
  if (!raw) return initialWalkthroughRecord();
  try {
    const data = JSON.parse(raw) as (Partial<WalkthroughRecord> & { version?: number }) | null;
    if (!data || !isTourRunState(data.runState)) return initialWalkthroughRecord();
    const version = (data as { version?: number }).version;
    if (version === 1) return migrateV1(data);
    if (data.version !== WALKTHROUGH_RECORD_VERSION) return initialWalkthroughRecord();
    return {
      version: WALKTHROUGH_RECORD_VERSION,
      runState: data.runState,
      chapterId: typeof data.chapterId === 'string' ? data.chapterId : null,
      scopeChapterId: typeof data.scopeChapterId === 'string' ? data.scopeChapterId : null,
      stepId: typeof data.stepId === 'string' ? data.stepId : null,
      learningMode: data.learningMode !== false,
      dismissedPageKeys: stringList(data.dismissedPageKeys),
      offeredPageKeys: stringList(data.offeredPageKeys),
      completedChapterIds: stringList(data.completedChapterIds),
      welcomeClosed: data.welcomeClosed === true,
      chapterStates: chapterStateMap(data.chapterStates),
    };
  } catch {
    return initialWalkthroughRecord();
  }
}

export function loadWalkthrough(store: KeyValueStore): WalkthroughRecord {
  try {
    return parseWalkthroughRecord(store.getItem(WALKTHROUGH_STORAGE_KEY));
  } catch {
    return initialWalkthroughRecord();
  }
}

export function saveWalkthrough(store: KeyValueStore, record: WalkthroughRecord): void {
  try {
    store.setItem(WALKTHROUGH_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Private mode or a full disk. The in-memory record still holds this view.
  }
}

export type ResumeTarget = {
  chapterId: string;
  stepId: string;
};

function nonEmpty(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Saved step to reopen after hydration.
 *
 * Returns `{ chapterId, stepId }` only for a real in-progress step.
 * `chapterId` is `scopeChapterId` when that is set, otherwise `chapterId`.
 * Null when the session is not `IN_PROGRESS`, the step is missing, or that
 * chapter is already `COMPLETED` or `DISMISSED`. Never throws and never
 * mutates the record, so a missing step does not dismiss or complete any
 * other chapter. Load does not clear a completed chapter. Replay is not
 * started here.
 *
 * Agent A can ignore this if `shouldOpenTourOnLoad` plus the saved
 * `stepId` is enough. Import from this module; the barrel does not re-export it.
 */
export function resumeTarget(record: WalkthroughRecord | null | undefined): ResumeTarget | null {
  if (!record || record.runState !== 'IN_PROGRESS') return null;
  const stepId = nonEmpty(record.stepId);
  const chapterId = nonEmpty(record.scopeChapterId) ?? nonEmpty(record.chapterId);
  if (!stepId || !chapterId) return null;
  const chapterState = record.chapterStates?.[chapterId];
  if (chapterState === 'COMPLETED' || chapterState === 'DISMISSED') return null;
  return { chapterId, stepId };
}

/**
 * True only when a real in-progress step is stored.
 * After hydration, Agent A should call this and, if true, open the overlay
 * on the saved step. Do not resume with a timeout. A completed-only record
 * returns false and stays closed.
 */
export function shouldOpenTourOnLoad(record: WalkthroughRecord): boolean {
  return resumeTarget(record) !== null;
}
