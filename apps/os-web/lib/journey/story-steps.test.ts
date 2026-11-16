import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { STORY_MODE_STEPS, STORY_MODE_TITLE, isStoryPdfApiHref, storyStepState } from './story-steps';

describe('Journey steps', () => {
  it('numbers its steps consecutively and keeps who-acts copy capability-neutral', () => {
    assert.ok(STORY_MODE_STEPS.length >= 10);
    assert.deepEqual(
      STORY_MODE_STEPS.map((s) => s.step),
      Array.from({ length: STORY_MODE_STEPS.length }, (_, i) => i + 1),
    );
    assert.ok(STORY_MODE_STEPS.some((s) => /autorizad/i.test(s.whoNormallyActs)));
    assert.equal(storyStepState(1, 3), 'completed');
    assert.equal(storyStepState(3, 3), 'current');
    assert.equal(storyStepState(5, 3), 'future');
    assert.equal(isStoryPdfApiHref('/api/delivery-notes/n1/pdf'), true);
    assert.equal(isStoryPdfApiHref('/clientes/x'), false);
  });

  it('link to generic product pages only: no seeded records, PDFs, tenant or data mode', () => {
    for (const step of STORY_MODE_STEPS) {
      assert.match(step.href, /^\/[a-z-]+$/, `step ${step.step} href ${step.href}`);
      assert.doesNotMatch(step.href, /[?&](datos|empresa|org|organizationId)=/, `step ${step.step}`);
      assert.equal(isStoryPdfApiHref(step.href), false, `step ${step.step}`);
      assert.doesNotMatch(`${step.title} ${step.whatHappened} ${step.whatIsalwaRecorded} ${step.ctaLabel}`, /DEMO|MADERAS|demo/);
    }
    assert.equal(STORY_MODE_STEPS[0]!.href, '/conversaciones');
  });

  it('only narrates behavior that exists: every route is a real desk and the real labels appear', () => {
    const here = process.cwd();
    for (const step of STORY_MODE_STEPS) {
      const pageFile = join(here, 'app/(app)', step.href.slice(1), 'page.tsx');
      assert.ok(existsSync(pageFile), `step ${step.step} points to a missing page ${step.href}`);
    }
    const text = STORY_MODE_STEPS.map((s) => `${s.title} ${s.whatHappened} ${s.whatIsalwaRecorded}`).join(' ');
    // Claims the earlier script made without any demonstrated behavior behind them.
    assert.doesNotMatch(text, /Oportunidad sugerida|Sugerencia determin|Seguimiento programado/);
    assert.doesNotMatch(text, /Producto terminado|Nota de entrega|Salida de almac|Recepción de productos|Métricas de gerencia/);
    assert.doesNotMatch(text, /envía WhatsApp|se envía el mensaje|respuesta automática enviada/i);
    // The honest limits are stated.
    assert.match(text, /WhatsApp no está conectado/);
    assert.match(text, /Pendiente de ubicación/);
    assert.match(text, /no confirma fondos/);
    assert.ok(STORY_MODE_STEPS.at(-1)!.title.startsWith('Lo que todavía no está conectado'));
  });

  it('opening the Journey is presentation only: no API client, server action or storage in its files', () => {
    for (const file of [
      'components/journey/journey-provider.tsx',
      'components/journey/owner-story-mode.tsx',
      'components/journey/ver-ejemplo-completo-button.tsx',
      'lib/journey/story-steps.ts',
    ]) {
      const source = readFileSync(join(process.cwd(), file), 'utf8');
      assert.doesNotMatch(source, /'use server'|os-api-client|createOsApiClient|\bfetch\(|lib\/.*actions'|seed|sample/i, file);
    }
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
