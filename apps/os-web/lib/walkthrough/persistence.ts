import { initialGuideRecord, migrateV1ToV2, type GuideRecord } from './progress';

/**
 * Browser-local UI state for Modo guiado.
 * Not a tenant record. Do not send this to an API or attach an organization id.
 * Key name stays v1 for storage continuity; version field inside determines schema.
 */
export const GUIDE_STORAGE_KEY = 'isalwa.os-web.guide.v1';

/** Previous tooltip catalog. Never resumed as an overlay. */
export const LEGACY_WALKTHROUGH_STORAGE_KEY = 'isalwa.os-web.walkthrough.v1';

export type KeyValueStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function parseStringRecord(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== 'object') return {};
  const result: Record<string, boolean> = {};
  for (const [key, val] of Object.entries(value)) {
    if (typeof key === 'string' && val === true) {
      result[key] = true;
    }
  }
  return result;
}

export function parseGuideRecord(raw: string | null): GuideRecord {
  if (!raw) return initialGuideRecord();
  try {
    const data = JSON.parse(raw) as Record<string, unknown> | null;
    if (!data) return initialGuideRecord();
    
    // Migrate v1 to v2 preserving existing progress
    if (data.version === 1) {
      return migrateV1ToV2({
        version: 1,
        currentJourneyId: typeof data.currentJourneyId === 'string' ? data.currentJourneyId : null,
        stopIndex: typeof data.stopIndex === 'number' && data.stopIndex >= 0 ? data.stopIndex : 0,
        completedJourneyIds: stringList(data.completedJourneyIds),
        panelHidden: data.panelHidden === true,
      });
    }
    
    // Parse v2 record
    if (data.version !== 2) return initialGuideRecord();
    return {
      version: 2,
      currentJourneyId: typeof data.currentJourneyId === 'string' ? data.currentJourneyId : null,
      stopIndex: typeof data.stopIndex === 'number' && data.stopIndex >= 0 ? data.stopIndex : 0,
      completedJourneyIds: stringList(data.completedJourneyIds),
      panelHidden: data.panelHidden === true,
      welcomeSeen: data.welcomeSeen === true,
      introCompleted: data.introCompleted === true,
      introSkipped: data.introSkipped === true,
      introStepIndex: typeof data.introStepIndex === 'number' && data.introStepIndex >= 0 ? data.introStepIndex : 0,
      learningModeEnabled: data.learningModeEnabled === true,
      pageTourSeen: parseStringRecord(data.pageTourSeen),
    };
  } catch {
    return initialGuideRecord();
  }
}

export function loadGuide(store: KeyValueStore): GuideRecord {
  try {
    return parseGuideRecord(store.getItem(GUIDE_STORAGE_KEY));
  } catch {
    return initialGuideRecord();
  }
}

export function saveGuide(store: KeyValueStore, record: GuideRecord): void {
  const payload: GuideRecord = {
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
  try {
    store.setItem(GUIDE_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Private mode or a full disk. The in-memory record still holds this view.
  }
}

/**
 * Old tooltip JSON is not an overlay to reopen. A dismissed learning flag on
 * that key does not turn Modo guiado off.
 */
export function resumeTooltipOverlay(_legacyRaw: string | null | undefined): null {
  return null;
}
