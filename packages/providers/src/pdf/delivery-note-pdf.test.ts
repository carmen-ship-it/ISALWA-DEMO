import assert from 'node:assert/strict';
import { inflateSync } from 'node:zlib';
import { describe, it } from 'node:test';
import { PdfLibPdfProvider } from './pdflib';
import {
  deliveryNotePdfVisibleReference,
  sanitizeDeliveryNotePdfFilename,
  type DeliveryNotePdfDocument,
} from './delivery-note-pdf-document';

function paintedPdfText(bytes: Uint8Array): string {
  const raw = Buffer.from(bytes).toString('latin1');
  const streams = [...raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)];
  let text = '';
  for (const match of streams) {
    const body = Buffer.from(match[1] ?? '', 'latin1');
    try {
      text += `${inflateSync(body).toString('latin1')}\n`;
    } catch {
      text += `${match[1]}\n`;
    }
  }
  return [...text.matchAll(/<([0-9A-Fa-f]+)> Tj/g)]
    .map((hit) => Buffer.from(hit[1] ?? '', 'hex').toString('latin1'))
    .join('\n');
}

describe('PdfLibPdfProvider delivery note', () => {
  const provider = new PdfLibPdfProvider();

  it('renders nota de entrega PDF bytes without the pilot ref', async () => {
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
    assert.equal(document.internalDocumentRef, 'NE-PILOT-test-note');
    assert.equal(deliveryNotePdfVisibleReference(document), 'Nota de entrega · Pedido PED-1');
    assert.equal(sanitizeDeliveryNotePdfFilename(document.internalDocumentRef), 'Nota-Entrega-documento.pdf');
    assert.doesNotMatch(sanitizeDeliveryNotePdfFilename(document.internalDocumentRef), /NE-PILOT|NE-0001/);

    const bytes = await provider.renderDeliveryNotePdf({
      internalDocumentRef: document.internalDocumentRef,
      document,
    });
    assert.ok(bytes.byteLength > 100);
    assert.equal(bytes[0], 0x25); // %
    assert.equal(bytes[1], 0x50); // P
    assert.equal(bytes[2], 0x44); // D
    assert.equal(bytes[3], 0x46); // F
    const painted = paintedPdfText(bytes);
    assert.match(painted, /Nota de entrega · Pedido PED-1/);
    assert.doesNotMatch(painted, /NE-PILOT|NE-0001/);
  });

  it('keeps a non-pilot ref in the payload and the visible reference', () => {
    const visible = deliveryNotePdfVisibleReference({
      internalDocumentRef: 'NE-DEMO-MADERAS',
      orderRef: 'O-000002',
    });
    assert.equal(visible, 'NE-DEMO-MADERAS');
  });
});
