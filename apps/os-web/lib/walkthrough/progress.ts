import { GUIDE_CHROME, progressLabel, replayLabel } from './copy';
import {
  JOURNEYS,
  WAVE_PENDING,
  journeyById,
  type Journey,
} from './journeys';

/**
 * Browser-local cursor. Not a tenant record: no organization, customer, or order fields.
 * Version 2 adds first-use intro flow and learning mode.
 */
export type GuideRecord = {
  version: 2;
  /** Legacy journey cursor — kept for backward compat with v1 multi-journey. */
  currentJourneyId: string | null;
  stopIndex: number;
  completedJourneyIds: string[];
  /** Hide the panel. Does not erase progress and does not turn learning off. */
  panelHidden: boolean;
  /** First-use intro: welcome seen (user clicked "Conocer ISALWA" or "Explorar"). */
  welcomeSeen: boolean;
  /** First-use intro completed (reached final step and dismissed). */
  introCompleted: boolean;
  /** First-use intro was skipped via "Explorar por mi cuenta". */
  introSkipped: boolean;
  /** Current step in the first-use intro sequence (0-based). */
  introStepIndex: number;
  /** Learning Mode: show educational helpers while working. */
  learningModeEnabled: boolean;
  /** Page micro-tours that have been seen (key: page id). */
  pageTourSeen: Record<string, boolean>;
};

export type ContinueOutcome = {
  record: GuideRecord;
  href: string | null;
  blocked: 'wave' | 'pattern' | null;
  message: string | null;
};

export function initialGuideRecord(): GuideRecord {
  return {
    version: 2,
    currentJourneyId: JOURNEYS[0]?.id ?? null,
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
export function migrateV1ToV2(v1: Omit<GuideRecord, 'version' | 'welcomeSeen' | 'introCompleted' | 'introSkipped' | 'introStepIndex' | 'learningModeEnabled' | 'pageTourSeen'> & { version: 1 }): GuideRecord {
  return {
    ...initialGuideRecord(),
    currentJourneyId: v1.currentJourneyId,
    stopIndex: v1.stopIndex,
    completedJourneyIds: [...v1.completedJourneyIds],
    panelHidden: v1.panelHidden,
    // If they completed any journeys in v1, assume they've seen the basics
    welcomeSeen: v1.completedJourneyIds.length > 0,
    introCompleted: v1.completedJourneyIds.length > 0,
    introSkipped: false,
  };
}

export function currentJourney(record: GuideRecord, journeys: readonly Journey[] = JOURNEYS): Journey | null {
  const match = journeys.find((journey) => journey.id === record.currentJourneyId);
  if (match) return match;
  return journeyById(record.currentJourneyId);
}

/**
 * Refresh resumes the stored journey. The pathname must not swap in a chapter
 * from another page.
 */
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

export function dismissGuide(record: GuideRecord): GuideRecord {
  return { ...record, panelHidden: true };
}

export function revealGuide(record: GuideRecord): GuideRecord {
  return { ...record, panelHidden: false };
}

/** Only an explicit reset clears progress. */
export function resetGuide(): GuideRecord {
  return initialGuideRecord();
}

/** Replay from Ayuda. Restores the panel without wiping other journeys. */
export function replayFromAyuda(record: GuideRecord, journeyId: string): GuideRecord {
  return {
    ...record,
    currentJourneyId: journeyId,
    stopIndex: 0,
    panelHidden: false,
    completedJourneyIds: record.completedJourneyIds.filter((id) => id !== journeyId),
  };
}

// ---------- First-use intro state transitions ----------

/** User starts the intro ("Conocer ISALWA"). */
export function startIntro(record: GuideRecord): GuideRecord {
  return {
    ...record,
    welcomeSeen: true,
    introSkipped: false,
    introStepIndex: 0,
    panelHidden: false,
  };
}

/** User skips the intro ("Explorar por mi cuenta"). */
export function skipIntro(record: GuideRecord): GuideRecord {
  return {
    ...record,
    welcomeSeen: true,
    introSkipped: true,
    introCompleted: false,
    panelHidden: true,
  };
}

/** Advance to the next intro step. Returns new record and optional href to navigate. */
export function advanceIntro(record: GuideRecord, totalSteps: number): { record: GuideRecord; href: string | null } {
  const nextIndex = record.introStepIndex + 1;
  if (nextIndex >= totalSteps) {
    // Intro completed
    return {
      record: {
        ...record,
        introCompleted: true,
        introStepIndex: totalSteps - 1,
        panelHidden: true,
      },
      href: null,
    };
  }
  return {
    record: {
      ...record,
      introStepIndex: nextIndex,
    },
    href: null,
  };
}

/** Go to a specific intro step (for navigation-driven progression). */
export function setIntroStep(record: GuideRecord, index: number): GuideRecord {
  return {
    ...record,
    introStepIndex: Math.max(0, index),
  };
}

/** Replay the intro from Ayuda. */
export function replayIntro(record: GuideRecord): GuideRecord {
  return {
    ...record,
    welcomeSeen: true,
    introCompleted: false,
    introSkipped: false,
    introStepIndex: 0,
    panelHidden: false,
  };
}

// ---------- Learning Mode ----------

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

// ---------- Page micro-tours ----------

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
  // Also clear readonly sibling for approvals replay
  if (pageId === 'aprobaciones') delete next['aprobaciones-readonly'];
  if (pageId === 'aprobaciones-readonly') delete next['aprobaciones'];
  return {
    ...record,
    pageTourSeen: next,
  };
}

export function continueGuide(
  record: GuideRecord,
  journeys: readonly Journey[] = JOURNEYS,
): ContinueOutcome {
  const sequence = journeys.length > 0 ? journeys : JOURNEYS;
  const current =
    sequence.find((journey) => journey.id === record.currentJourneyId) ??
    journeyById(record.currentJourneyId) ??
    sequence[0];
  if (!current) {
    return { record, href: null, blocked: null, message: null };
  }
  const stop = current.stops[Math.min(Math.max(record.stopIndex, 0), current.stops.length - 1)];
  if (!stop || stop.href == null) {
    return {
      record,
      href: null,
      blocked: stop?.kind === 'pattern' ? 'pattern' : 'wave',
      message: stop?.pending ?? WAVE_PENDING,
    };
  }

  const nextStop = record.stopIndex + 1;
  if (nextStop < current.stops.length) {
    return {
      record: {
        ...record,
        currentJourneyId: current.id,
        stopIndex: nextStop,
        panelHidden: false,
      },
      href: stop.href,
      blocked: null,
      message: null,
    };
  }

  const index = sequence.findIndex((journey) => journey.id === current.id);
  const next = index >= 0 ? sequence[index + 1] ?? null : null;
  const completed = record.completedJourneyIds.includes(current.id)
    ? record.completedJourneyIds
    : [...record.completedJourneyIds, current.id];

  return {
    record: {
      ...record,
      currentJourneyId: next?.id ?? current.id,
      stopIndex: next ? 0 : Math.max(current.stops.length - 1, 0),
      completedJourneyIds: completed,
      panelHidden: false,
    },
    href: stop.href,
    blocked: null,
    message: null,
  };
}

export function collectGuideCopy(): string[] {
  const lines: string[] = [...Object.values(GUIDE_CHROME)];
  for (const journey of JOURNEYS) {
    lines.push(journey.title, journey.summary, replayLabel(journey.title));
    journey.stops.forEach((stop, index) => {
      lines.push(stop.title, stop.body, progressLabel(index, journey.stops.length));
      if (stop.pending) lines.push(stop.pending);
    });
  }
  // Include intro copy for jargon checking
  const { INTRO_COPY, LEARNING_MODE_COPY, PAGE_MICRO_TOURS } = require('./copy');
  lines.push(
    INTRO_COPY.welcome.title,
    INTRO_COPY.welcome.body,
    INTRO_COPY.welcome.secondary,
    INTRO_COPY.welcome.primary,
    INTRO_COPY.welcome.skip,
    INTRO_COPY.welcome.footer,
    INTRO_COPY.inicio.title,
    INTRO_COPY.inicio.body,
    INTRO_COPY.inicio.secondary,
    INTRO_COPY.inicio.cta,
    INTRO_COPY.clientes.title,
    INTRO_COPY.clientes.body,
    INTRO_COPY.clientes.cta,
    INTRO_COPY.cliente360.title,
    INTRO_COPY.cliente360.body,
    INTRO_COPY.cliente360.secondary,
    INTRO_COPY.cliente360.cta,
    INTRO_COPY.nextAction.body,
    INTRO_COPY.nextAction.noAction,
    INTRO_COPY.nextAction.cta,
    INTRO_COPY.mapa.title,
    INTRO_COPY.mapa.bodyFallback,
    INTRO_COPY.mapa.secondary,
    INTRO_COPY.mapa.providerBlocked.title,
    INTRO_COPY.mapa.providerBlocked.body,
    INTRO_COPY.mapa.cta,
    INTRO_COPY.ayuda.title,
    INTRO_COPY.ayuda.body,
    INTRO_COPY.ayuda.final,
    INTRO_COPY.ayuda.finalSecondary,
    INTRO_COPY.ayuda.cta,
    ...INTRO_COPY.ayuda.affordances,
    INTRO_COPY.cliente360.emptySections.opportunities,
    INTRO_COPY.cliente360.emptySections.quotes,
    INTRO_COPY.cliente360.emptySections.orders,
    INTRO_COPY.cliente360.emptySections.work,
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
