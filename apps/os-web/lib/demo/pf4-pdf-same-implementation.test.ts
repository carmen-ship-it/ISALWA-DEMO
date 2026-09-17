/**
 * PF-4 — DEMO MADERAS ORIENTE uses the same PDF implementation as normal product.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import seededIds from '@/lib/demo/seeded-ids.json';
import { STORY_MODE_STEPS } from '@/lib/demo/story-mode-steps';
import { setDemoSeedIdMapForTests, type DemoSeedIdMap } from '@/lib/demo/owner-demo-registry';

describe('PF-4 demo uses same PDF implementation', () => {
  it('seeded hrefHints point at product /api/quotes|delivery-notes/.../pdf routes', () => {
    const hints = (seededIds as { hrefHints?: Record<string, string | null> }).hrefHints;
    assert.ok(hints);
    assert.equal(
      hints.quotePdf,
      '/api/quotes/01M2PM9KSJXN1K4CF45FT0H299/pdf',
    );
    assert.equal(
      hints.deliveryNotePdf,
      '/api/delivery-notes/01M2PMCSNXH644P1C4F832BGKQ/pdf',
    );
    assert.match(hints.documents ?? '', /\?tab=documentos/);
    assert.doesNotMatch(hints.quotePdf ?? '', /demo-only|static|\.pdf\.html/);
    assert.doesNotMatch(hints.deliveryNotePdf ?? '', /demo-only|static|\.pdf\.html/);
  });

  it('Story Mode PDF CTAs resolve to the same route family', () => {
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
          quoteNumber: 'Q-000002',
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

  it('web PDF routes proxy to os-api client (no static demo PDF)', () => {
    const quoteRoute = readFileSync(
      join(process.cwd(), 'app/api/quotes/[quoteId]/pdf/route.ts'),
      'utf8',
    );
    const dnRoute = readFileSync(
      join(process.cwd(), 'app/api/delivery-notes/[id]/pdf/route.ts'),
      'utf8',
    );
    assert.match(quoteRoute, /getQuotePdf/);
    assert.match(dnRoute, /getDeliveryNotePdf/);
    assert.doesNotMatch(quoteRoute, /demo|fixture.*\.pdf|readFileSync.*pdf/);
    assert.doesNotMatch(dnRoute, /demo|fixture.*\.pdf|readFileSync.*pdf/);
  });
});
