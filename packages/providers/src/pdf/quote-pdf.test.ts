import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import { PdfLibPdfProvider } from './pdflib';
import {
  formatBobCentavos,
  formatQuotePdfDate,
  sanitizeQuotePdfFilename,
  type QuotePdfDocument,
} from './quote-pdf-document';
import { MockPdfProvider } from './mock';

function baseDoc(overrides: Partial<QuotePdfDocument> = {}): QuotePdfDocument {
  return {
    quoteNumber: 'Q-000042',
    documentTitle: 'COTIZACIÓN',
    brandName: 'ISALWA',
    organizationLegalName: 'ISALWA Demo S.R.L.',
    issuedAtLabel: '13/09/2026',
    customerName: 'Cliente Demo',
    currency: 'BOB',
    lines: [
      {
        quantity: 2,
        description: 'Producto de prueba',
        unitPriceLabel: 'Bs. 50,00',
        lineTotalLabel: 'Bs. 100,00',
      },
    ],
    subtotalLabel: 'Bs. 100,00',
    totalLabel: 'Bs. 100,00',
    ...overrides,
  };
}

describe('quote PDF document helpers', () => {
  it('formats BOB centavos', () => {
    assert.equal(formatBobCentavos('10050'), 'Bs. 100,50');
    assert.equal(formatBobCentavos('0'), 'Bs. 0,00');
    assert.equal(formatBobCentavos('1234567'), 'Bs. 12.345,67');
  });

  it('formats dates and filenames', () => {
    assert.match(formatQuotePdfDate('2026-09-13T15:00:00.000Z'), /\d{2}\/\d{2}\/\d{4}/);
    assert.equal(sanitizeQuotePdfFilename('Q-0001'), 'cotizacion-Q-0001.pdf');
    assert.equal(sanitizeQuotePdfFilename('../evil'), 'cotizacion-evil.pdf');
  });
});

describe('PdfLibPdfProvider', () => {
  const provider = new PdfLibPdfProvider();

  it('renders a valid PDF for a quote with lines', async () => {
    const bytes = await provider.renderQuotePdf({
      quoteNumber: 'Q-000042',
      document: baseDoc(),
    });
    assert.ok(bytes.byteLength > 500);
    assert.equal(String.fromCharCode(bytes[0]!, bytes[1]!, bytes[2]!, bytes[3]!), '%PDF');

    const loaded = await PDFDocument.load(bytes);
    assert.equal(loaded.getPageCount(), 1);
  });

  it('renders zero lines without inventing content', async () => {
    const bytes = await provider.renderQuotePdf({
      quoteNumber: 'Q-000001',
      document: baseDoc({
        lines: [],
        subtotalLabel: 'Bs. 0,00',
        totalLabel: 'Bs. 0,00',
        contactName: null,
        contactPhone: null,
        contactEmail: null,
        notes: null,
        organizationLegalName: null,
      }),
    });
    const loaded = await PDFDocument.load(bytes);
    assert.equal(loaded.getPageCount(), 1);
  });

  it('renders multiple lines and notes', async () => {
    const bytes = await provider.renderQuotePdf({
      quoteNumber: 'Q-000099',
      document: baseDoc({
        lines: [
          {
            quantity: 1,
            description: 'Línea una con descripción larga para forzar ajuste de texto en la tabla',
            unitPriceLabel: 'Bs. 10,00',
            lineTotalLabel: 'Bs. 10,00',
          },
          {
            quantity: 3,
            description: 'Línea dos',
            unitPriceLabel: 'Bs. 20,00',
            lineTotalLabel: 'Bs. 60,00',
          },
        ],
        subtotalLabel: 'Bs. 70,00',
        totalLabel: 'Bs. 70,00',
        notes: 'Validez sujeta a disponibilidad.',
        contactName: 'Ana Pérez',
        contactPhone: '+59170000000',
      }),
    });
    assert.ok(bytes.byteLength > 800);
    const loaded = await PDFDocument.load(bytes);
    assert.ok(loaded.getPageCount() >= 1);
  });

  it('omits optional contact cleanly when missing', async () => {
    const bytes = await provider.renderQuotePdf({
      quoteNumber: 'Q-000007',
      document: baseDoc({
        contactName: undefined,
        contactPhone: undefined,
        contactEmail: undefined,
      }),
    });
    assert.equal(String.fromCharCode(bytes[0]!, bytes[1]!, bytes[2]!, bytes[3]!), '%PDF');
  });
});

describe('MockPdfProvider', () => {
  it('returns mock bytes for document or html', async () => {
    const mock = new MockPdfProvider();
    const fromDoc = await mock.renderQuotePdf({
      quoteNumber: 'Q-1',
      document: baseDoc(),
    });
    assert.match(new TextDecoder().decode(fromDoc), /MOCK PDF/);
    const fromHtml = await mock.renderQuotePdf({
      quoteNumber: 'Q-2',
      html: '<p>hola</p>',
    });
    assert.match(new TextDecoder().decode(fromHtml), /hola/);
  });
});
