import { initialWalkthroughRecord, isTourRunState } from './state';
import type { WalkthroughRecord } from './types';

export const WALKTHROUGH_STORAGE_KEY = 'isalwa.os-web.walkthrough.v1';

export type KeyValueStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

export function parseWalkthroughRecord(raw: string | null): WalkthroughRecord {
  if (!raw) return initialWalkthroughRecord();
  try {
    const data = JSON.parse(raw) as Partial<WalkthroughRecord> | null;
    if (!data || data.version !== 1 || !isTourRunState(data.runState)) {
      return initialWalkthroughRecord();
    }
    return {
      version: 1,
      runState: data.runState,
      chapterId: typeof data.chapterId === 'string' ? data.chapterId : null,
      scopeChapterId: typeof data.scopeChapterId === 'string' ? data.scopeChapterId : null,
      stepId: typeof data.stepId === 'string' ? data.stepId : null,
      learningMode: data.learningMode !== false,
      dismissedPageKeys: stringList(data.dismissedPageKeys),
      offeredPageKeys: stringList(data.offeredPageKeys),
      completedChapterIds: stringList(data.completedChapterIds),
      welcomeClosed: data.welcomeClosed === true,
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

/** The runner never auto-opens a tour from persisted state. Refresh keeps progress only. */
export function shouldOpenTourOnLoad(_record: WalkthroughRecord): false {
  return false;
}
