import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  RETIRED_DATA_MODE_STORAGE_KEY,
  clearRetiredDataModeStorage,
  expireRetiredDataModeCookies,
} from './retired-data-mode';

describe('retired data-mode browser state', () => {
  it('removes a stale localStorage choice and tolerates missing storage', () => {
    const store = new Map<string, string>([
      [RETIRED_DATA_MODE_STORAGE_KEY, 'demo'],
      ['isalwa.os-web.ui-preferences.v1', '{"sidebarCollapsed":true}'],
    ]);
    clearRetiredDataModeStorage({ removeItem: (key: string) => void store.delete(key) });
    assert.equal(store.has(RETIRED_DATA_MODE_STORAGE_KEY), false);
    assert.equal(store.size, 1, 'other preferences stay');
    clearRetiredDataModeStorage(null);
    clearRetiredDataModeStorage({
      removeItem: () => {
        throw new Error('blocked');
      },
    });
  });

  it('expires only the retired cookies the browser sent', () => {
    const deleted: string[] = [];
    expireRetiredDataModeCookies(
      { has: (name) => name === 'isalwa-owner-effective-company' },
      { delete: (name) => deleted.push(name) },
    );
    assert.deepEqual(deleted, ['isalwa-owner-effective-company']);
  });
});
