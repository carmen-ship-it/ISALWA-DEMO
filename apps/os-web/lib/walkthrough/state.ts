import type { TourRunState, WalkthroughEvent, WalkthroughRecord } from './types';
import { TOUR_RUN_STATES, WALKTHROUGH_RECORD_VERSION } from './types';

export function initialWalkthroughRecord(): WalkthroughRecord {
  return {
    version: WALKTHROUGH_RECORD_VERSION,
    runState: 'NOT_STARTED',
    chapterId: null,
    scopeChapterId: null,
    stepId: null,
    learningMode: true,
    dismissedPageKeys: [],
    offeredPageKeys: [],
    completedChapterIds: [],
    welcomeClosed: false,
    chapterStates: {},
  };
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

export function isTourRunState(value: unknown): value is TourRunState {
  return typeof value === 'string' && (TOUR_RUN_STATES as readonly string[]).includes(value);
}

function withChapterState(
  record: WalkthroughRecord,
  chapterId: string | null | undefined,
  runState: TourRunState,
): Record<string, TourRunState> {
  if (!chapterId) return record.chapterStates;
  return { ...record.chapterStates, [chapterId]: runState };
}

export function reduceWalkthrough(record: WalkthroughRecord, event: WalkthroughEvent): WalkthroughRecord {
  switch (event.type) {
    case 'START':
    case 'REPLAY': {
      const scopeChapterId = event.scopeChapterId ?? event.chapterId;
      return {
        ...record,
        runState: 'IN_PROGRESS',
        chapterId: event.chapterId,
        scopeChapterId,
        stepId: event.stepId,
        welcomeClosed: true,
        chapterStates: withChapterState(record, event.chapterId, 'IN_PROGRESS'),
      };
    }
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
          chapterStates: withChapterState(record, event.chapterId, 'COMPLETED'),
        };
      }
      return {
        ...record,
        runState: 'IN_PROGRESS',
        chapterId: event.chapterId ?? record.chapterId,
        stepId: event.stepId,
        chapterStates: withChapterState(record, event.chapterId ?? record.chapterId, 'IN_PROGRESS'),
      };
    case 'BACK':
      return {
        ...record,
        runState: 'IN_PROGRESS',
        chapterId: event.chapterId ?? record.chapterId,
        stepId: event.stepId,
        chapterStates: withChapterState(record, event.chapterId ?? record.chapterId, 'IN_PROGRESS'),
      };
    case 'PAUSE':
    case 'CLOSE':
      if (record.runState === 'NOT_STARTED') {
        return { ...record, welcomeClosed: true };
      }
      return record;
    case 'DISMISS': {
      const chapterId = event.chapterId ?? record.scopeChapterId ?? record.chapterId ?? 'global';
      return {
        ...record,
        runState: 'DISMISSED',
        chapterId: null,
        scopeChapterId: null,
        stepId: null,
        learningMode: false,
        welcomeClosed: true,
        chapterStates: withChapterState(record, chapterId, 'DISMISSED'),
      };
    }
    case 'COMPLETE':
      return {
        ...record,
        runState: 'COMPLETED',
        stepId: null,
        welcomeClosed: true,
        completedChapterIds: event.chapterId
          ? unique([...record.completedChapterIds, event.chapterId])
          : record.completedChapterIds,
        chapterStates: withChapterState(record, event.chapterId, 'COMPLETED'),
      };
    case 'DISMISS_PAGE':
      return {
        ...record,
        dismissedPageKeys: unique([...record.dismissedPageKeys, event.pageKey]),
        offeredPageKeys: unique([...record.offeredPageKeys, event.pageKey]),
        welcomeClosed: event.pageKey === 'inicio' ? true : record.welcomeClosed,
        chapterStates: withChapterState(record, event.chapterId, 'DISMISSED'),
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
