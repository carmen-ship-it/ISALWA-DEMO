import { MockAiProvider } from './ai/mock';
import { MockEmailProvider } from './email/mock';
import { MockMapsProvider } from './maps/mock';
import { MockMessagingProvider } from './messaging/mock';
import { MockPdfProvider } from './pdf/mock';
import { PdfLibPdfProvider } from './pdf/pdflib';
import { MockSearchProvider } from './search/mock';
import { MockStorageProvider } from './storage/mock';
import type { PdfProvider, ProviderRegistry } from './types/index';

export * from './types/index';
export { MockMessagingProvider } from './messaging/mock';
export { MockMapsProvider } from './maps/mock';
export {
  createMapProvider,
  MockMapProvider,
  MapboxMapProvider,
  SANTA_CRUZ_CENTER,
  SANTA_CRUZ_MAX_BOUNDS,
} from './maps/index';
export type {
  MapProvider,
  MapViewConfig,
  MapEngine,
  TerritoryLayerId,
  CreateMapProviderInput,
} from './maps/index';
export { MockAiProvider } from './ai/mock';
export { MockStorageProvider } from './storage/mock';
export { MockSearchProvider } from './search/mock';
export { MockPdfProvider } from './pdf/mock';
export { PdfLibPdfProvider } from './pdf/pdflib';
export { MockEmailProvider } from './email/mock';
export {
  formatBobCentavos,
  formatQuotePdfDate,
  sanitizeQuotePdfFilename,
} from './pdf/quote-pdf-document';
export type {
  QuotePdfDocument,
  QuotePdfLine,
  QuotePdfRenderInput,
} from './pdf/quote-pdf-document';

export type ProviderEnv = {
  MESSAGING_PROVIDER?: string;
  MAPS_PROVIDER?: string;
  AI_PROVIDER?: string;
  STORAGE_PROVIDER?: string;
  SEARCH_PROVIDER?: string;
  PDF_PROVIDER?: string;
  EMAIL_PROVIDER?: string;
  NODE_ENV?: string;
  ALLOW_MOCK_PROVIDERS?: string;
};

/**
 * Create the live Quote PDF provider without requiring the full registry.
 * Default is pdf-lib (portable server-side). Use mock only when explicitly requested.
 */
export function createPdfProvider(env: ProviderEnv = process.env): PdfProvider {
  const mode = (env.PDF_PROVIDER ?? 'pdflib').toLowerCase();
  if (mode === 'mock') {
    return new MockPdfProvider();
  }
  // playwright / reactpdf reserved names map to pdf-lib until dedicated adapters ship
  return new PdfLibPdfProvider();
}

/**
 * Boot-time registry. Live adapters will be added in later milestones.
 * Production refuses mocks unless ALLOW_MOCK_PROVIDERS=1 (break-glass).
 */
export function createProviderRegistry(env: ProviderEnv = process.env): ProviderRegistry {
  const isProd = env.NODE_ENV === 'production';
  const allowMock = env.ALLOW_MOCK_PROVIDERS === '1';

  const pick = (value: string | undefined, fallback: string) =>
    (value ?? fallback).toLowerCase();

  const messagingMode = pick(env.MESSAGING_PROVIDER, 'mock');
  const mapsMode = pick(env.MAPS_PROVIDER, 'mock');
  const aiMode = pick(env.AI_PROVIDER, 'mock');
  const storageMode = pick(env.STORAGE_PROVIDER, 'mock');
  const searchMode = pick(env.SEARCH_PROVIDER, 'mock');
  const pdfMode = pick(env.PDF_PROVIDER, 'mock');
  const emailMode = pick(env.EMAIL_PROVIDER, 'mock');

  const modes = [messagingMode, mapsMode, aiMode, storageMode, searchMode, pdfMode, emailMode];
  if (isProd && !allowMock && modes.some((m) => m === 'mock')) {
    throw new Error(
      'Mock providers are blocked in production. Set live providers or ALLOW_MOCK_PROVIDERS=1 (audited).',
    );
  }

  const messaging = new MockMessagingProvider();
  const maps = new MockMapsProvider();
  const ai = new MockAiProvider();
  const storage = new MockStorageProvider();
  const search = new MockSearchProvider();
  const pdf =
    pdfMode === 'mock' ? new MockPdfProvider() : new PdfLibPdfProvider();
  const email = new MockEmailProvider();

  void messagingMode;
  void mapsMode;
  void aiMode;
  void storageMode;
  void searchMode;
  void emailMode;

  return { messaging, maps, ai, storage, search, pdf, email };
}

export function providerStatus(registry: ProviderRegistry) {
  return {
    messaging: registry.messaging.info.name,
    maps: registry.maps.info.name,
    ai: registry.ai.info.name,
    storage: registry.storage.info.name,
    search: registry.search.info.name,
    pdf: registry.pdf.info.name,
    email: registry.email.info.name,
  };
}
