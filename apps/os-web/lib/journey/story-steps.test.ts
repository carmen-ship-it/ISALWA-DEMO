import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { STORY_MODE_STEPS, STORY_MODE_TITLE, isStoryPdfApiHref, storyStepState } from './story-steps';

describe('Journey steps', () => {
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
    assert.equal(isStoryPdfApiHref('/api/delivery-notes/n1/pdf'), true);
    assert.equal(isStoryPdfApiHref('/clientes/x'), false);
  });

  it('link to generic product pages only: no seeded records, PDFs, tenant or data mode', () => {
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
    const overlay = readFileSync(join(process.cwd(), 'components/journey/owner-story-mode.tsx'), 'utf8');
    assert.doesNotMatch(overlay, /DEMO_FICTITIOUS_BADGE|loadDemoSeedIdMap|seed DEMO|SYNTH/);
    assert.doesNotMatch(overlay, /setDataMode|organizationId|saveDemoDataMode/);
    const steps = readFileSync(join(process.cwd(), 'lib/journey/story-steps.ts'), 'utf8');
    assert.doesNotMatch(steps, /withStoryDemoDatos|datos=demo|seeded-ids/);
  });

  it('web PDF routes proxy to os-api (no static sample PDF)', () => {
    const quoteRoute = readFileSync(join(process.cwd(), 'app/api/quotes/[quoteId]/pdf/route.ts'), 'utf8');
    const dnRoute = readFileSync(join(process.cwd(), 'app/api/delivery-notes/[id]/pdf/route.ts'), 'utf8');
    assert.match(quoteRoute, /getQuotePdf/);
    assert.match(dnRoute, /getDeliveryNotePdf/);
    assert.doesNotMatch(quoteRoute, /demo|fixture.*\.pdf|readFileSync.*pdf/);
    assert.doesNotMatch(dnRoute, /demo|fixture.*\.pdf|readFileSync.*pdf/);
  });
});
