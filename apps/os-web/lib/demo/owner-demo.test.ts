/**
 * CT3-E / PF-6 owner demo identity + story mode unit tests.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEMO_DATA_MODE_COOKIE,
  DEMO_DATA_MODE_STORAGE_KEY,
  DEMO_FICTITIOUS_BADGE,
  filterByDemoDataMode,
  isDemoDisplayName,
  isDemoRecord,
  loadDemoDataMode,
  parseDemoDataMode,
  saveDemoDataMode,
} from './owner-demo-identity';

describe('owner-demo identity', () => {
  it('detects DEMO prefix and Q-DEMO numbers', () => {
    assert.equal(isDemoDisplayName('DEMO MADERAS ORIENTE'), true);
    assert.equal(isDemoDisplayName('COMERCIAL ALVAREZ'), false);
    assert.equal(isDemoRecord({ quoteNumber: 'Q-DEMO-001' }), true);
    assert.equal(parseDemoDataMode(undefined), 'real');
    assert.equal(parseDemoDataMode('demo'), 'demo');
    assert.match(DEMO_FICTITIOUS_BADGE, /DEMO · DATOS FICTICIOS/);
  });

  it('keeps real and demo counts separate', () => {
    const rows = [{ name: 'DEMO MADERAS ORIENTE' }, { name: 'Cliente Real' }];
    assert.deepEqual(
      filterByDemoDataMode(rows, 'real', (r) => isDemoDisplayName(r.name)).map((r) => r.name),
      ['Cliente Real'],
    );
    assert.deepEqual(
      filterByDemoDataMode(rows, 'demo', (r) => isDemoDisplayName(r.name)).map((r) => r.name),
      ['DEMO MADERAS ORIENTE'],
    );
  });

  it('defaults to Datos reales and syncs cookie with localStorage', () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    };
    assert.equal(loadDemoDataMode(storage), 'real');

    const cookies: string[] = [];
    const previousDocument = (globalThis as { document?: unknown }).document;
    (globalThis as { document: { cookie: string } }).document = {
      get cookie() {
        return cookies[cookies.length - 1] ?? '';
      },
      set cookie(value: string) {
        cookies.push(value);
      },
    };
    try {
      saveDemoDataMode(storage, 'demo');
      assert.equal(store.get(DEMO_DATA_MODE_STORAGE_KEY), 'demo');
      assert.ok(cookies.some((c) => c.startsWith(`${DEMO_DATA_MODE_COOKIE}=demo`)));
      saveDemoDataMode(storage, 'real');
      assert.equal(store.get(DEMO_DATA_MODE_STORAGE_KEY), 'real');
      assert.ok(cookies.some((c) => c.startsWith(`${DEMO_DATA_MODE_COOKIE}=real`)));
    } finally {
      if (previousDocument === undefined) {
        delete (globalThis as { document?: unknown }).document;
      } else {
        (globalThis as { document: unknown }).document = previousDocument;
      }
    }
  });
  it('explicit datos= wins over sticky cookie (RC4 data-mode honesty)', async () => {
    const { resolveDemoDataModeFromParts } = await import('./resolve-demo-data-mode');
    assert.equal(resolveDemoDataModeFromParts({ datos: 'real', cookie: 'demo' }), 'real');
    assert.equal(resolveDemoDataModeFromParts({ datos: 'demo', cookie: 'real' }), 'demo');
    assert.equal(resolveDemoDataModeFromParts({ datos: null, cookie: 'demo' }), 'demo');
    assert.equal(resolveDemoDataModeFromParts({ datos: undefined, cookie: 'real' }), 'real');
    assert.equal(resolveDemoDataModeFromParts({}), 'real');
  });
});
