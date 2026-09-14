import type { TourRunState, WalkthroughEvent, WalkthroughRecord } from './types';
import { TOUR_RUN_STATES } from './types';

export function initialWalkthroughRecord(): WalkthroughRecord {
  return {
    version: 1,
    runState: 'NOT_STARTED',
    chapterId: null,
    scopeChapterId: null,
    stepId: null,
    learningMode: true,
    dismissedPageKeys: [],
    offeredPageKeys: [],
    completedChapterIds: [],
    welcomeClosed: false,
  };
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

export function isTourRunState(value: unknown): value is TourRunState {
  return typeof value === 'string' && (TOUR_RUN_STATES as readonly string[]).includes(value);
}

export function reduceWalkthrough(record: WalkthroughRecord, event: WalkthroughEvent): WalkthroughRecord {
  switch (event.type) {
    case 'START':
    case 'REPLAY':
      return {
        ...record,
        runState: 'IN_PROGRESS',
        chapterId: event.chapterId,
        scopeChapterId: event.scopeChapterId,
        stepId: event.stepId,
        welcomeClosed: true,
      };
    case 'ADVANCE':
      if (event.stepId === null) {
        return {
          ...record,
          runState: 'COMPLETED',
          chapterId: event.chapterId ?? record.chapterId,
          stepId: null,
          welcomeClosed: true,
          completedChapterIds: event.chapterId
            ? unique([...record.completedChapterIds, event.chapterId])
            : record.completedChapterIds,
        };
      }
      return {
        ...record,
        runState: 'IN_PROGRESS',
        chapterId: event.chapterId ?? record.chapterId,
        stepId: event.stepId,
      };
    case 'BACK':
      return {
        ...record,
        runState: 'IN_PROGRESS',
        chapterId: event.chapterId ?? record.chapterId,
        stepId: event.stepId,
      };
    case 'PAUSE':
    case 'CLOSE':
      if (record.runState === 'NOT_STARTED') {
        return { ...record, welcomeClosed: true };
      }
      return record;
    case 'DISMISS':
      return {
        ...record,
        runState: 'DISMISSED',
        chapterId: null,
        scopeChapterId: null,
        stepId: null,
        learningMode: false,
        welcomeClosed: true,
      };
    case 'COMPLETE':
      return {
        ...record,
        runState: 'COMPLETED',
        stepId: null,
        welcomeClosed: true,
        completedChapterIds: event.chapterId
          ? unique([...record.completedChapterIds, event.chapterId])
          : record.completedChapterIds,
      };
    case 'DISMISS_PAGE':
      return {
        ...record,
        dismissedPageKeys: unique([...record.dismissedPageKeys, event.pageKey]),
        offeredPageKeys: unique([...record.offeredPageKeys, event.pageKey]),
        welcomeClosed: event.pageKey === 'inicio' ? true : record.welcomeClosed,
      };
    case 'MARK_PAGE_OFFERED':
      return {
        ...record,
        offeredPageKeys: unique([...record.offeredPageKeys, event.pageKey]),
      };
    case 'SET_LEARNING_MODE':
      return { ...record, learningMode: event.enabled };
    case 'MARK_WELCOME_CLOSED':
      return { ...record, welcomeClosed: true };
    default:
      return record;
  }
}
