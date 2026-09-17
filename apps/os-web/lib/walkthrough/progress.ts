import { GUIDE_CHROME, INTRO_COPY, LEARNING_MODE_COPY, PAGE_MICRO_TOURS } from './copy';

/**
 * Browser-local onboarding cursor. Not a tenant record: no organization, customer, or order fields.
 * Version 2 adds first-use intro welcome and learning mode.
 */
export type GuideRecord = {
  version: 2;
  /** Legacy journey cursor — retained for migration only. */
  currentJourneyId: string | null;
  stopIndex: number;
  completedJourneyIds: string[];
  panelHidden: boolean;
  /** First-use intro: welcome seen (user clicked "Conocer ISALWA" or "Explorar"). */
  welcomeSeen: boolean;
  introCompleted: boolean;
  introSkipped: boolean;
  introStepIndex: number;
  learningModeEnabled: boolean;
  pageTourSeen: Record<string, boolean>;
};

export function initialGuideRecord(): GuideRecord {
  return {
    version: 2,
    currentJourneyId: null,
    stopIndex: 0,
    completedJourneyIds: [],
    panelHidden: true,
    welcomeSeen: false,
    introCompleted: false,
    introSkipped: false,
    introStepIndex: 0,
    learningModeEnabled: false,
    pageTourSeen: {},
  };
}

/** Migrate a v1 record to v2 without wiping existing progress. */
export function migrateV1ToV2(
  v1: Omit<
    GuideRecord,
    | 'version'
    | 'welcomeSeen'
    | 'introCompleted'
    | 'introSkipped'
    | 'introStepIndex'
    | 'learningModeEnabled'
    | 'pageTourSeen'
  > & { version: 1 },
): GuideRecord {
  return {
    ...initialGuideRecord(),
    currentJourneyId: v1.currentJourneyId,
    stopIndex: v1.stopIndex,
    completedJourneyIds: [...v1.completedJourneyIds],
    panelHidden: v1.panelHidden,
    welcomeSeen: v1.completedJourneyIds.length > 0,
    introCompleted: v1.completedJourneyIds.length > 0,
    introSkipped: false,
  };
}

export function resumeGuide(record: GuideRecord, _pathname: string): GuideRecord {
  return {
    version: 2,
    currentJourneyId: record.currentJourneyId,
    stopIndex: record.stopIndex,
    completedJourneyIds: [...record.completedJourneyIds],
    panelHidden: record.panelHidden,
    welcomeSeen: record.welcomeSeen,
    introCompleted: record.introCompleted,
    introSkipped: record.introSkipped,
    introStepIndex: record.introStepIndex,
    learningModeEnabled: record.learningModeEnabled,
    pageTourSeen: { ...record.pageTourSeen },
  };
}

export function resetGuide(): GuideRecord {
  return initialGuideRecord();
}

/** User acknowledges the welcome ("Conocer ISALWA") — no multi-step tour. */
export function startIntro(record: GuideRecord): GuideRecord {
  return {
    ...record,
    welcomeSeen: true,
    introSkipped: false,
    introCompleted: true,
    introStepIndex: 0,
    panelHidden: true,
  };
}

/** User skips the welcome ("Explorar por mi cuenta"). */
export function skipIntro(record: GuideRecord): GuideRecord {
  return {
    ...record,
    welcomeSeen: true,
    introSkipped: true,
    introCompleted: false,
    panelHidden: true,
  };
}

/** Replay first-use welcome from Ayuda. */
export function replayIntro(record: GuideRecord): GuideRecord {
  return {
    ...record,
    welcomeSeen: false,
    introCompleted: false,
    introSkipped: false,
    introStepIndex: 0,
    panelHidden: true,
  };
}

export function toggleLearningMode(record: GuideRecord): GuideRecord {
  return {
    ...record,
    learningModeEnabled: !record.learningModeEnabled,
  };
}

export function setLearningMode(record: GuideRecord, enabled: boolean): GuideRecord {
  return {
    ...record,
    learningModeEnabled: enabled,
  };
}

export function markPageTourSeen(record: GuideRecord, pageId: string): GuideRecord {
  return {
    ...record,
    pageTourSeen: {
      ...record.pageTourSeen,
      [pageId]: true,
    },
  };
}

export function hasSeenPageTour(record: GuideRecord, pageId: string): boolean {
  return record.pageTourSeen[pageId] === true;
}

export function clearPageTourSeen(record: GuideRecord, pageId: string): GuideRecord {
  const next = { ...record.pageTourSeen };
  delete next[pageId];
  return {
    ...record,
    pageTourSeen: next,
  };
}

export function collectGuideCopy(): string[] {
  const lines: string[] = [...Object.values(GUIDE_CHROME)];
  lines.push(
    INTRO_COPY.welcome.title,
    INTRO_COPY.welcome.body,
    INTRO_COPY.welcome.secondary,
    INTRO_COPY.welcome.primary,
    INTRO_COPY.welcome.skip,
    INTRO_COPY.welcome.footer,
    INTRO_COPY.ayuda.title,
    INTRO_COPY.ayuda.body,
    INTRO_COPY.ayuda.final,
    INTRO_COPY.ayuda.finalSecondary,
    INTRO_COPY.ayuda.cta,
    ...INTRO_COPY.ayuda.affordances,
    LEARNING_MODE_COPY.label,
    LEARNING_MODE_COPY.description,
    LEARNING_MODE_COPY.secondary,
  );
  for (const tour of PAGE_MICRO_TOURS) {
    for (const step of tour.steps) {
      if (step.title) lines.push(step.title);
      lines.push(step.body);
    }
  }
  return lines;
}
