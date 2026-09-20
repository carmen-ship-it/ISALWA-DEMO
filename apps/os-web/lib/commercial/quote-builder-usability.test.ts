import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import {
  STARTER_PRODUCT_CATEGORIES,
  activeStarterQuoteProducts,
  prefillFromStarterProduct,
  starterProductByKey,
} from './starter-quote-products';
import { demoUnitPriceForMode } from './demo-starter-prices';
import { quoteNextStep } from './next-step';

const editor = readFileSync(resolve('components/commercial/quote-editor.tsx'), 'utf8');
const picker = readFileSync(resolve('components/commercial/quote-product-picker.tsx'), 'utf8');
const page = readFileSync(
  resolve('app/(app)/clientes/[partyId]/cotizaciones/[quoteId]/page.tsx'),
  'utf8',
);
const actions = readFileSync(resolve('lib/commercial/actions.ts'), 'utf8');
const builderUi = readFileSync(resolve('components/commercial/quote-builder-ui.tsx'), 'utf8');

describe('Task 8 quote builder usability', () => {
  it('keeps product search and category filters', () => {
    assert.match(picker, /Buscar producto/);
    assert.match(picker, /SearchField/);
    assert.match(picker, /STARTER_PRODUCT_CATEGORIES\.map/);
    assert.match(picker, /Todas/);
    assert.deepEqual([...STARTER_PRODUCT_CATEGORIES], [
      'Sanitarios',
      'Lavamanos',
      'Tanques',
      'Urinarios',
    ]);
    assert.equal(activeStarterQuoteProducts().some((row) => /Capri/i.test(row.name)), true);
  });

  it('Agregar opens one draft editor and guards double-click duplicates', () => {
    assert.match(picker, />\s*Agregar\s*</);
    assert.match(picker, /addLockRef/);
    assert.match(picker, /productKey === key && editorOpen/);
    assert.match(picker, /focusLineEditor/);
    assert.match(picker, /id=\{LINE_EDITOR_ID\}|id=\{LINE_EDITOR_ID\}|quote-line-editor/);
    assert.match(picker, /Agregar artículo especial/);
    assert.match(editor, /label="Guardar línea"/);
    assert.doesNotMatch(editor, /label="\+ Agregar línea"|label="Agregar a la cotización"/);
  });

  it('does not invent quantity or unit on known-product prefill; demo price stays demo-scoped', () => {
    const capri = starterProductByKey('sanitario-capri');
    assert.ok(capri);
    const realPrefill = prefillFromStarterProduct(capri);
    assert.equal(realPrefill.quantity, '');
    assert.equal(realPrefill.unit, '');
    assert.equal(realPrefill.unitPrice, '');
    assert.equal(demoUnitPriceForMode('sanitario-capri', 'real'), null);
    assert.equal(demoUnitPriceForMode('sanitario-capri', 'demo'), 850);
    assert.match(picker, /demoPrices \? getDemoUnitPrice\(key\) : null/);
    assert.match(page, /demoPrices=\{dataMode === 'demo'\}/);
    assert.match(editor, /demoPrices = false/);
  });

  it('requires valid inputs before save and uses idempotent command keys', () => {
    assert.match(picker, /parseQuantityInput\(entry\.quantity\)/);
    assert.match(picker, /entry\.unit\.trim\(\)\.length > 0/);
    assert.match(picker, /parseBobInputToCentavos\(entry\.unitPrice\)/);
    assert.match(editor, /disabled=\{!addReady\}/);
    assert.match(editor, /name="idempotencyKey"/);
    assert.match(actions, /formData\.get\('idempotencyKey'\)/);
    assert.match(actions, /executeCommand\('AddQuoteLine', payload, idempotencyKey\)/);
    assert.match(actions, /executeCommand\('SubmitQuote', \{ quoteId \}, idempotencyKey\)/);
    assert.match(editor, /CommandSubmitButton/);
    assert.match(editor, /pendingLabel="Guardando…"/);
  });

  it('exposes saved-line fields and one running total near the builder', () => {
    assert.match(editor, /Producto \/ descripción/);
    assert.match(editor, /Cantidad/);
    assert.match(editor, /Unidad/);
    assert.match(editor, /Subtotal/);
    assert.match(editor, />\s*Editar\s*</);
    assert.match(editor, /label="Quitar"/);
    assert.match(editor, /aria-label="Líneas guardadas"/);
    assert.match(editor, /formatCentavos\(quote\.totalCentavos/);
    assert.match(editor, /headerDiscountCentavos/);
    assert.match(page, /!isDraft \? \(/);
  });

  it('keeps next action state-aware and removes duplicated instruction blocks', () => {
    assert.match(builderUi, /Agregue productos a la cotización/);
    assert.match(builderUi, /Complete cantidad, unidad y precio y guarde la línea/);
    assert.match(builderUi, /Revise la cotización y preséntela/);
    assert.match(page, /QuotePageNextStep/);
    assert.match(editor, /note\.kind === 'regla'/);
    assert.match(editor, /GuidanceCompactDisclosure/);
    assert.equal((editor.match(/ISALWA no envía WhatsApp ni correo/g) ?? []).length, 0);
    assert.equal((editor.match(/Antes de presentar/g) ?? []).length, 0);
    assert.equal((editor.match(/Agregue el ítem/g) ?? []).length, 0);

    const empty = quoteNextStep({
      status: 'draft',
      partyId: 'p',
      quoteId: 'q',
      canConvertToOrder: false,
      relatedOrderHref: null,
      relatedOrderLabel: null,
      hasPendingApproval: false,
      canRegisterFollowUp: false,
      followUpHref: null,
      lineCount: 0,
    });
    assert.equal(empty?.statement, 'Agregue productos a la cotización.');
  });

  it('presents without claiming external send and surfaces PDF after present', () => {
    assert.match(editor, /label="Presentar cotización"/);
    assert.match(editor, /disabled=\{quote\.lines\.length === 0\}/);
    assert.match(editor, /Descargue la cotización y envíela por su canal habitual/);
    assert.doesNotMatch(editor, /enviamos por WhatsApp|ISALWA envió|mensaje enviado automáticamente/i);
    assert.match(page, /QuoteDocumentActions/);
    assert.match(page, /canRecordSend=\{manualSendAllowed\}/);
  });
});

describe('Task 8 hosted corrective layout', () => {
  it('renders saved lines as non-overlapping cards with view/edit modes', () => {
    assert.match(editor, /data-quote-line="saved"/);
    assert.match(editor, /data-quote-line="editing"/);
    assert.match(editor, /data-saved-lines="cards"/);
    assert.doesNotMatch(editor, /ListRow/);
    assert.match(editor, /label="Guardar cambios"/);
    assert.match(editor, />\s*Cancelar\s*</);
    assert.match(editor, /label="Quitar"/);
  });

  it('exposes one primary draft action path and explains PDF unavailable', () => {
    assert.match(editor, /data-quote-total="primary"/);
    assert.match(editor, /Presente la cotización para generar el documento/);
    assert.match(editor, /label="Presentar cotización"/);
    assert.equal((editor.match(/data-quote-total=/g) ?? []).length, 1);
  });
});
