/**
 * CT3-E owner demo identity + story mode unit tests.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEMO_FICTITIOUS_BADGE,
  filterByDemoDataMode,
  isDemoDisplayName,
  isDemoRecord,
  parseDemoDataMode,
} from './owner-demo-identity';
import { STORY_MODE_STEPS, storyStepState } from './story-mode-steps';
import { setDemoSeedIdMapForTests, type DemoSeedIdMap } from './owner-demo-registry';

describe('owner-demo identity', () => {
  it('detects DEMO prefix and Q-DEMO numbers', () => {
    assert.equal(isDemoDisplayName('DEMO MADERAS ORIENTE'), true);
    assert.equal(isDemoDisplayName('COMERCIAL ALVAREZ'), false);
    assert.equal(isDemoRecord({ quoteNumber: 'Q-DEMO-001' }), true);
    assert.equal(parseDemoDataMode(undefined), 'real');
    assert.equal(parseDemoDataMode('demo'), 'demo');
    assert.match(DEMO_FICTITIOUS_BADGE, /DEMO/);
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
    assert.equal(STORY_MODE_STEPS[5]!.hrefFor(map), '/api/quotes/quote-1/pdf');
    assert.equal(STORY_MODE_STEPS[13]!.hrefFor(map), '/api/delivery-notes/note-1/pdf');
    setDemoSeedIdMapForTests(null);
  });
});
