import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('quote PDF UI wiring', () => {
  it('quote detail exposes Descargar cotización action', () => {
    const page = readFileSync(
      join(
        process.cwd(),
        'app/(app)/clientes/[partyId]/cotizaciones/[quoteId]/page.tsx',
      ),
      'utf8',
    );
    assert.match(page, /QuotePdfDownloadButton/);
  });

  it('download button label is Spanish Cotización', () => {
    const button = readFileSync(
      join(process.cwd(), 'components/commercial/quote-pdf-download-button.tsx'),
      'utf8',
    );
    assert.match(button, /Descargar cotización/);
    assert.match(button, /Vista previa/);
    assert.match(button, /\/api\/quotes\//);
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
