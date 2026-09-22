import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

describe('quote phone progress', () => {
  it('sticky bar picks one primary CTA by stage', () => {
    const sticky = readFileSync(
      resolve(root, 'components/commercial/quote-progress-sticky-bar.tsx'),
      'utf8',
    );
    assert.match(sticky, /Presentar cotización/);
    assert.match(sticky, /#presentar-cotizacion/);
    assert.match(sticky, /focusQuoteEnvioRegister/);
    assert.match(sticky, /QUOTE_MANUAL_SEND_COPY\.action/);
    assert.match(sticky, /#convertir-pedido/);
    assert.match(sticky, /Convertir a Pedido/);
    assert.match(sticky, /effectiveStatus === 'draft'/);
    assert.match(sticky, /!effectiveSend && canRecordSend/);
  });

  it('document actions and helper open Envío register on phone', () => {
    const focus = readFileSync(resolve(root, 'lib/commercial/quote-envio-focus.ts'), 'utf8');
    const actions = readFileSync(
      resolve(root, 'components/commercial/quote-document-actions.tsx'),
      'utf8',
    );
    assert.match(focus, /scrollIntoView/);
    assert.match(focus, /data-quote-register-send="active"/);
    assert.match(actions, /focusQuoteEnvioRegister/);
  });

  it('quantity stepper uses ≥44px hit targets on phone', () => {
    const stepper = readFileSync(
      resolve(root, 'components/commercial/quantity-stepper.tsx'),
      'utf8',
    );
    assert.match(stepper, /h-11 w-11/);
    assert.match(stepper, /sm:h-8 sm:w-8/);
  });
});
