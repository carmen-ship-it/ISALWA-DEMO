import type { PdfProvider } from '../types/index';

export class MockPdfProvider implements PdfProvider {
  readonly info = { name: 'mock-pdf', mode: 'mock' as const };

  async renderQuotePdf(input: { quoteNumber: string; html: string }) {
    const text = `ISALWA OS MOCK PDF\nQuote ${input.quoteNumber}\n${input.html.slice(0, 200)}`;
    return new TextEncoder().encode(text);
  }

  async health() {
    return 'up' as const;
  }
}
