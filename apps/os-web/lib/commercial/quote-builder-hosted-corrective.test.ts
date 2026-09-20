
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import { QUOTE_PDF_COPY } from './quote-pdf-ready';
import { QUOTE_MANUAL_SEND_COPY } from './quote-manual-send';

const editor = readFileSync(resolve('components/commercial/quote-editor.tsx'), 'utf8');
const page = readFileSync(
  resolve('app/(app)/clientes/[partyId]/cotizaciones/[quoteId]/page.tsx'),
  'utf8',
);
const docActions = readFileSync(
  resolve('components/commercial/quote-document-actions.tsx'),
  'utf8',
);
const detailActions = readFileSync(
  resolve('components/commercial/quote-detail-actions.tsx'),
  'utf8',
);

describe('Task 8 quote builder hosted corrective', () => {
  it('keeps saved-line text and actions from overlapping', () => {
    assert.match(editor, /data-quote-line="saved"/);
    assert.match(editor, /grid gap-4 md:grid-cols-12/);
    assert.match(editor, /Producto \/ descripción/);
    assert.match(editor, /Cantidad/);
    assert.match(editor, /Unidad/);
    assert.match(editor, /Precio unitario/);
    assert.match(editor, /Subtotal/);
    assert.doesNotMatch(editor, /ListRow/);
    assert.match(editor, /mt-4 flex flex-wrap gap-2 border-t/);
  });

  it('uses explicit edit mode with Guardar cambios and Cancelar', () => {
    assert.match(editor, /const \[editing, setEditing\]/);
    assert.match(editor, /label="Guardar cambios"/);
    assert.match(editor, />\s*Cancelar\s*</);
    assert.match(editor, />\s*Editar\s*</);
  });

  it('draft primary action presents; presented primary downloads PDF', () => {
    assert.match(editor, /Presente la cotización para generar el documento/);
    assert.match(editor, /label="Presentar cotización"/);
    assert.equal(QUOTE_PDF_COPY.notReady, 'Presente la cotización para generar el documento.');
    assert.match(docActions, /downloadVariant="primary"/);
    assert.match(docActions, /QUOTE_PDF_COPY\.download|downloadOnly/);
    assert.match(docActions, /QUOTE_MANUAL_SEND_COPY\.action/);
    assert.equal(QUOTE_MANUAL_SEND_COPY.action, 'Registrar como enviada');
    assert.match(docActions, /StatusPill/);
    assert.match(docActions, />Enviada</);
    assert.match(page, /QuoteDocumentActions/);
    assert.doesNotMatch(detailActions, /QuotePdfDownloadButton/);
  });

  it('does not claim ISALWA sent externally and keeps demo price boundary', () => {
    assert.doesNotMatch(docActions, /enviamos por WhatsApp|ISALWA envió/i);
    assert.match(page, /demoPrices=\{dataMode === 'demo'\}/);
  });
});
