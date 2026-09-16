import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PdfLibPdfProvider } from './pdflib';
import type { DeliveryNotePdfDocument } from './delivery-note-pdf-document';

describe('PdfLibPdfProvider delivery note', () => {
  const provider = new PdfLibPdfProvider();

  it('renders nota de entrega PDF bytes', async () => {
    const document: DeliveryNotePdfDocument = {
      documentTitle: 'NOTA DE ENTREGA',
      brandName: 'ISALWA',
      organizationLegalName: 'ISALWA Pilot',
      internalDocumentRef: 'NE-PILOT-test-note',
      displayDocumentNumber: null,
      issuedAtLabel: '14/09/2026',
      customerName: 'Cliente Synth',
      orderRef: 'PED-1',
      recipient: 'Encargado',
      deliveredBy: 'Chofer',
      receivedBy: null,
      observations: 'Parcial',
      lines: [{ quantity: 2, description: 'Mermelada 500g', unitLabel: 'unidades' }],
      numberingDisclaimer:
        'Referencia provisional de piloto. No es numeración oficial. La política de numeración oficial no está definida.',
    };
    const bytes = await provider.renderDeliveryNotePdf({
      internalDocumentRef: document.internalDocumentRef,
      document,
    });
    assert.ok(bytes.byteLength > 100);
    assert.equal(bytes[0], 0x25); // %
    assert.equal(bytes[1], 0x50); // P
    assert.equal(bytes[2], 0x44); // D
    assert.equal(bytes[3], 0x46); // F
  });
});
