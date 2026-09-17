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
import {
  STORY_MODE_STEPS,
  isStoryPdfApiHref,
  storyStepState,
  withStoryDemoDatos,
} from './story-mode-steps';
import { setDemoSeedIdMapForTests, type DemoSeedIdMap } from './owner-demo-registry';

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

  it('builds CTAs from seeded ids when present', () => {
    const map: DemoSeedIdMap = {
      organizationId: '01M2JKF77TXMJNDTKNCYNHH9G5',
      REAL_SEVEN_MUTATED: 'NO',
      storyModePrimaryPartyId: 'party-maderas',
      clients: [
        {
          key: 'maderas_oriente',
          partyId: 'party-maderas',
          opportunityId: 'opp-1',
          quoteId: 'quote-1',
          quoteNumber: 'Q-000010',
          orderId: 'order-1',
          deliveryNoteId: 'note-1',
          finishedGoodsReceiptId: 'fg-1',
          followUpWorkId: 'work-1',
          orderPrepWorkId: 'work-2',
          commitmentId: 'commit-1',
        },
      ],
    };
    setDemoSeedIdMapForTests(map);
    assert.equal(STORY_MODE_STEPS.length, 20);
    for (const step of STORY_MODE_STEPS) {
      const href = step.hrefFor(map);
      assert.ok(href, `step ${step.step} should resolve with seeded ids`);
      if (isStoryPdfApiHref(href)) {
        assert.doesNotMatch(href, /[?&]datos=/);
      } else {
        assert.match(href, /(?:^|[?&])datos=demo(?:&|$)/, `step ${step.step} page href`);
      }
    }
    assert.equal(STORY_MODE_STEPS[5]!.hrefFor(map), '/api/quotes/quote-1/pdf');
    assert.equal(STORY_MODE_STEPS[13]!.hrefFor(map), '/api/delivery-notes/note-1/pdf');
    assert.match(STORY_MODE_STEPS[1]!.hrefFor(map) ?? '', /\/clientes\/party-maderas/);
    assert.match(STORY_MODE_STEPS[1]!.hrefFor(map) ?? '', /[?&]datos=demo(?:&|$)/);
    assert.match(STORY_MODE_STEPS[9]!.hrefFor(map) ?? '', /\/pedidos\/order-1/);
    assert.match(STORY_MODE_STEPS[9]!.hrefFor(map) ?? '', /[?&]datos=demo(?:&|$)/);
    assert.equal(STORY_MODE_STEPS[18]!.hrefFor(map), '/inicio?datos=demo');
    assert.equal(STORY_MODE_STEPS[19]!.hrefFor(map), '/inicio?lente=gerencia&datos=demo');
    setDemoSeedIdMapForTests(null);
  });

  it('keeps datos=demo on page fallbacks when seed ids are missing', () => {
    assert.equal(STORY_MODE_STEPS.length, 20);
    assert.equal(STORY_MODE_STEPS[0]!.hrefFor(null), '/conversaciones?datos=demo');
    assert.equal(STORY_MODE_STEPS[2]!.hrefFor(null), '/oportunidades?datos=demo');
    assert.equal(STORY_MODE_STEPS[7]!.hrefFor(null), '/inicio?datos=demo');
    assert.equal(STORY_MODE_STEPS[5]!.hrefFor(null), null);
    assert.equal(STORY_MODE_STEPS[13]!.hrefFor(null), null);
  });
});
