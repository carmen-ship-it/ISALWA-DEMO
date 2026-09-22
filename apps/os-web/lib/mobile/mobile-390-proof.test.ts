/**
 * Core V1 mobile floor contracts (390px).
 * Source tests prove IMPLEMENTATION; hosted 390 screenshots are required for BROWSER-VERIFIED.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { VIEWPORT_MAX_PX, VIEWPORT_MIN_PX } from '../a11y/breakpoints.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function read(rel: string) {
  return readFileSync(resolve(root, rel), 'utf8');
}

describe('mobile 390 proof contracts', () => {
  it('QA floor stays 390×844 band with 1440 ceiling', () => {
    assert.equal(VIEWPORT_MIN_PX, 390);
    assert.equal(VIEWPORT_MAX_PX, 1440);
  });

  it('Asesor quote present/send/convert: one status-aware primary + ≥44px stepper', () => {
    const sticky = read('components/commercial/quote-progress-sticky-bar.tsx');
    const stepper = read('components/commercial/quantity-stepper.tsx');
    const page = read('app/(app)/clientes/[partyId]/cotizaciones/[quoteId]/page.tsx');
    assert.match(page, /QuoteProgressStickyBar/);
    assert.match(sticky, /Presentar cotización/);
    assert.match(sticky, /focusQuoteEnvioRegister/);
    assert.match(sticky, /Convertir a Pedido/);
    assert.match(stepper, /h-11 w-11/);
    assert.match(stepper, /sm:h-8 sm:w-8/);
  });

  it('Asesor Cliente360 sticky uses shell-measured offset, not top-14', () => {
    const sticky = read('components/cliente/cliente-360-sticky.tsx');
    const commercial = read('components/commercial/commercial-sticky-bar.tsx');
    assert.match(sticky, /isalwa-sticky-under-shell/);
    assert.doesNotMatch(sticky, /sticky top-14/);
    assert.match(commercial, /isalwa-sticky-under-shell/);
    assert.doesNotMatch(commercial, /sticky top-14/);
  });

  it('Producción: card scan rows below md + sticky Guardar', () => {
    const table = read('components/production/production-ops-table.tsx');
    const desk = read('components/production/production-postsale-desk.tsx');
    const surface = read('components/production/ops-desk-surface.tsx');
    assert.match(table, /OperatingScanRow/);
    assert.match(table, /overflow-hidden/);
    assert.match(table, /md:overflow-x-auto/);
    assert.match(table, /hideOnMobile: true/);
    assert.match(surface, /OPS_STICKY_ACTION_CLASS/);
    assert.match(desk, /OPS_STICKY_ACTION_CLASS/);
    assert.match(desk, /Guardar actualización/);
  });

  it('Almacén: scan-row cards, no phone-only H-scroll queue', () => {
    const page = read('app/(app)/almacen/page.tsx');
    assert.match(page, /OperatingScanRow/);
    assert.match(page, /overflow-hidden/);
    assert.match(page, /hideOnMobile: true/);
  });

  it('Compras: OperatingScanRow with hideOnMobile secondary columns', () => {
    const page = read('app/(app)/compras/page.tsx');
    assert.match(page, /OperatingScanRow/);
    assert.match(page, /overflow-hidden/);
    assert.match(page, /hideOnMobile: true/);
  });

  it('Coordinación Entregas: one primary CTA + stacked quantities + gate copy', () => {
    const docs = read('components/delivery/delivery-documents-panel.tsx');
    const nav = read('components/delivery/entrega-section-nav.tsx');
    assert.match(nav, /isalwa-sticky-under-shell/);
    assert.match(docs, /data-entrega-quantity-row/);
    assert.match(docs, /data-entrega-primary-actions/);
    assert.match(docs, /data-entrega-gate="needs-salida"/);
    assert.match(docs, /data-entrega-gate="needs-received-by"/);
    assert.match(docs, /data-entrega-cta="salida"/);
    assert.match(docs, /data-entrega-cta="entrega"/);
    assert.match(docs, /data-entrega-cta="nota"/);
  });

  it('shared OperatingScanRow keeps ≥44px open CTA on phone', () => {
    const scan = read('components/lists/operating-scan-row.tsx');
    assert.match(scan, /flex flex-col gap-2 md:grid/);
    assert.match(scan, /h-11/);
    assert.match(scan, /sm:h-8/);
  });
});
