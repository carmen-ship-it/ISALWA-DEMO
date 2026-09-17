import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('quote PDF UI wiring', () => {
  it('quote detail exposes Descargar PDF action', () => {
    const page = readFileSync(
      join(
        process.cwd(),
        'app/(app)/clientes/[partyId]/cotizaciones/[quoteId]/page.tsx',
      ),
      'utf8',
    );
    assert.match(page, /QuotePdfDownloadButton|QuoteDetailActions|QuoteDocumentoCard/);
  });

  it('download button label is Spanish PDF vocabulary', () => {
    const button = readFileSync(
      join(process.cwd(), 'components/commercial/quote-pdf-download-button.tsx'),
      'utf8',
    );
    const copy = readFileSync(
      join(process.cwd(), 'lib/commercial/quote-pdf-ready.ts'),
      'utf8',
    );
    assert.match(button, /QUOTE_PDF_COPY\.download/);
    assert.match(button, /QUOTE_PDF_COPY\.view/);
    assert.match(button, /\/api\/quotes\//);
    assert.match(button, /quotePdfDownloadFilename|Cotizacion-/);
    assert.match(copy, /Descargar PDF/);
    assert.match(copy, /Ver PDF/);
    assert.match(copy, /Cotizacion-/);
  });

  it('API proxy route streams PDF path', () => {
    const route = readFileSync(
      join(process.cwd(), 'app/api/quotes/[quoteId]/pdf/route.ts'),
      'utf8',
    );
    assert.match(route, /getQuotePdf/);
    assert.match(route, /Content-Type/);
    assert.match(route, /pdf\.contentType/);
  });
});
