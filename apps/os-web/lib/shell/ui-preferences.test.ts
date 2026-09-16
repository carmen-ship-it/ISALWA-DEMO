import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEFAULT_UI_PREFERENCES,
  UI_PREFS_STORAGE_KEY,
  loadUiPreferences,
  parseUiPreferences,
  saveUiPreferences,
} from './ui-preferences';

describe('ui preferences (local chrome only)', () => {
  it('defaults to expanded sidebar', () => {
    assert.deepEqual(parseUiPreferences(null), DEFAULT_UI_PREFERENCES);
    assert.equal(DEFAULT_UI_PREFERENCES.sidebarCollapsed, false);
  });

  it('round-trips sidebarCollapsed without inventing other keys', () => {
    const store: Record<string, string> = {};
    const storage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
    };
    saveUiPreferences(storage, { sidebarCollapsed: true });
    assert.equal(store[UI_PREFS_STORAGE_KEY], '{"sidebarCollapsed":true}');
    assert.deepEqual(loadUiPreferences(storage), { sidebarCollapsed: true });
  });

  it('tolerates corrupt JSON', () => {
    assert.deepEqual(parseUiPreferences('{nope'), DEFAULT_UI_PREFERENCES);
  });
});
