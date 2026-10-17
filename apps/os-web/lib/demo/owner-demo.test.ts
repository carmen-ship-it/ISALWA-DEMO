/**
 * CT3-E / PF-6 owner demo identity + story mode unit tests.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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
import {
  STORY_MODE_STEPS,
  STORY_MODE_TITLE,
  isStoryPdfApiHref,
  storyStepState,
  withStoryDemoDatos,
} from './story-mode-steps';

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

describe('story mode steps', () => {
  it('defines 20 steps with capability-neutral who-acts copy', () => {
    assert.equal(STORY_MODE_STEPS.length, 20);
    assert.deepEqual(
      STORY_MODE_STEPS.map((s) => s.step),
      Array.from({ length: 20 }, (_, i) => i + 1),
    );
    assert.ok(STORY_MODE_STEPS.some((s) => /Persona autorizada/.test(s.whoNormallyActs)));
    assert.equal(storyStepState(1, 3), 'completed');
    assert.equal(storyStepState(3, 3), 'current');
    assert.equal(storyStepState(5, 3), 'future');
  });

  it('withStoryDemoDatos appends datos=demo only for app pages', () => {
    assert.equal(withStoryDemoDatos(null), null);
    assert.equal(withStoryDemoDatos('/inicio'), '/inicio?datos=demo');
    assert.equal(withStoryDemoDatos('/inicio?lente=gerencia'), '/inicio?lente=gerencia&datos=demo');
    assert.equal(withStoryDemoDatos('/clientes/x?datos=demo'), '/clientes/x?datos=demo');
    assert.equal(withStoryDemoDatos('/api/quotes/q1/pdf'), '/api/quotes/q1/pdf');
    assert.equal(isStoryPdfApiHref('/api/delivery-notes/n1/pdf'), true);
    assert.equal(isStoryPdfApiHref('/clientes/x'), false);
  });

  it('Journey steps link to generic product pages only: no seeded records, PDFs, tenant or data mode (22:29 decision 3)', () => {
    assert.equal(STORY_MODE_STEPS.length, 20);
    for (const step of STORY_MODE_STEPS) {
      assert.match(step.href, /^\/[a-z-]+(\?lente=gerencia)?$/, `step ${step.step} href ${step.href}`);
      assert.doesNotMatch(step.href, /[?&](datos|empresa|org|organizationId)=/, `step ${step.step}`);
      assert.equal(isStoryPdfApiHref(step.href), false, `step ${step.step}`);
      assert.doesNotMatch(`${step.title} ${step.whatHappened} ${step.whatIsalwaRecorded} ${step.ctaLabel}`, /DEMO|MADERAS|demo/);
    }
    assert.equal(STORY_MODE_STEPS[0]!.href, '/conversaciones');
    assert.equal(STORY_MODE_STEPS[5]!.href, '/cotizaciones');
    assert.equal(STORY_MODE_STEPS[13]!.href, '/entregas');
    assert.equal(STORY_MODE_STEPS[19]!.href, '/inicio?lente=gerencia');
  });

  it('the overlay has a neutral heading, no fictitious-data badge and no seed fallback', () => {
    assert.equal(STORY_MODE_TITLE, 'Recorrido de ISALWA');
    const overlay = readFileSync(join(process.cwd(), 'components/demo/owner-story-mode.tsx'), 'utf8');
    assert.doesNotMatch(overlay, /DEMO_FICTITIOUS_BADGE|loadDemoSeedIdMap|seed DEMO|SYNTH/);
    assert.doesNotMatch(overlay, /setDataMode|organizationId|saveDemoDataMode/);
  });
});
