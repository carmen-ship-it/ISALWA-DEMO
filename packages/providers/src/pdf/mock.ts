import type { PdfProvider } from '../types/index';
import type { QuotePdfRenderInput } from './quote-pdf-document';

export class MockPdfProvider implements PdfProvider {
  readonly info = { name: 'mock-pdf', mode: 'mock' as const };

  async renderQuotePdf(input: QuotePdfRenderInput) {
    const preview =
      input.document?.customerName ??
      input.html?.slice(0, 200) ??
      '';
    const text = `ISALWA OS MOCK PDF\nQuote ${input.quoteNumber}\n${preview}`;
    return new TextEncoder().encode(text);
  }

  async health() {
    return 'up' as const;
  }
}
