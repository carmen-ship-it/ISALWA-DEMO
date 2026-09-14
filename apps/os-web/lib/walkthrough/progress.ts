import { GUIDE_CHROME, progressLabel, replayLabel } from './copy';
import {
  JOURNEYS,
  MISSING_ROUTE,
  continueHref,
  journeyById,
  type GuideStop,
  type Journey,
} from './journeys';

/** Browser-local cursor. Not a tenant record: no organization, customer, or order fields. */
export type GuideRecord = {
  version: 1;
  currentJourneyId: string | null;
  stopIndex: number;
  completedJourneyIds: string[];
  /** Hide the panel. Does not erase progress and does not turn learning off. */
  panelHidden: boolean;
};

export type ContinueOutcome = {
  record: GuideRecord;
  href: string | null;
  blocked: 'missing' | 'pattern' | null;
  message: string | null;
};

export function initialGuideRecord(): GuideRecord {
  return {
    version: 1,
    currentJourneyId: JOURNEYS[0]?.id ?? null,
    stopIndex: 0,
    completedJourneyIds: [],
    panelHidden: false,
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
    version: 1,
    currentJourneyId: record.currentJourneyId,
    stopIndex: record.stopIndex,
    completedJourneyIds: [...record.completedJourneyIds],
    panelHidden: record.panelHidden,
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
  const href = continueHref(stop?.href);
  if (!stop || !href) {
    return {
      record,
      href: null,
      blocked: stop?.kind === 'pattern' ? 'pattern' : 'missing',
      message: stop?.pending ?? stop?.now ?? MISSING_ROUTE,
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
      href,
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
    href,
    blocked: null,
    message: null,
  };
}

function stopCopy(stop: GuideStop): string[] {
  const lines = [stop.title, stop.body, stop.now];
  if (stop.nowByLens) lines.push(...Object.values(stop.nowByLens));
  if (stop.pending) lines.push(stop.pending);
  return lines;
}

export function collectGuideCopy(): string[] {
  const lines: string[] = [...Object.values(GUIDE_CHROME), MISSING_ROUTE];
  for (const journey of JOURNEYS) {
    lines.push(journey.title, journey.summary, replayLabel(journey.title));
    journey.stops.forEach((stop, index) => {
      lines.push(...stopCopy(stop), progressLabel(index, journey.stops.length));
    });
  }
  return lines;
}
