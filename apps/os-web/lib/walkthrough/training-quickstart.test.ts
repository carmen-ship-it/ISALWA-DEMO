import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { quickstartForRole, ROLE_QUICKSTARTS } from './quickstart';
import { microTipForTrigger, CONTEXTUAL_MICRO_TIPS } from './micro-tips';

const here = dirname(fileURLToPath(import.meta.url));

describe('training quickstart and micro-tips', () => {
  it('exposes role quickstarts without auto-creating records', () => {
    assert.equal(ROLE_QUICKSTARTS.asesor.steps.length, 6);
    const prod = quickstartForRole('produccion');
    assert.ok(prod);
    assert.match(prod!.title, /Producción/);
    const source = readFileSync(join(here, 'quickstart.ts'), 'utf8');
    assert.doesNotMatch(source, /CreateWorkItem|executeCommand|prisma/i);
  });

  it('micro-tips are dismissible and contextual', () => {
    const tip = microTipForTrigger('quote_sent');
    assert.match(tip.body, /contactar al cliente/i);
    assert.equal(tip.secondary.label, 'Ahora no');
    assert.equal(Object.keys(CONTEXTUAL_MICRO_TIPS).length >= 4, true);
  });
});
