/**
 * Local UI chrome preferences — device layout only.
 * Persisted in localStorage; never used for grants or identity.
 */

export const UI_PREFS_STORAGE_KEY = 'isalwa.os-web.ui-prefs.v1';

export type UiPreferences = {
  /** Desktop sidebar icon-rail preference. Ignored on mobile drawer. */
  sidebarCollapsed: boolean;
};

export const DEFAULT_UI_PREFERENCES: UiPreferences = {
  sidebarCollapsed: false,
};

export function parseUiPreferences(raw: string | null | undefined): UiPreferences {
  if (!raw) return { ...DEFAULT_UI_PREFERENCES };
  try {
    const parsed = JSON.parse(raw) as Partial<UiPreferences>;
    return {
      sidebarCollapsed: Boolean(parsed.sidebarCollapsed),
    };
  } catch {
    return { ...DEFAULT_UI_PREFERENCES };
  }
}

export function loadUiPreferences(storage: Pick<Storage, 'getItem'>): UiPreferences {
  return parseUiPreferences(storage.getItem(UI_PREFS_STORAGE_KEY));
}

export function saveUiPreferences(
  storage: Pick<Storage, 'setItem'>,
  prefs: UiPreferences,
): void {
  storage.setItem(UI_PREFS_STORAGE_KEY, JSON.stringify(prefs));
}
