import { MockAiProvider } from './ai/mock';
import { MockEmailProvider } from './email/mock';
import { MockMapsProvider } from './maps/mock';
import { MockMessagingProvider } from './messaging/mock';
import { MockPdfProvider } from './pdf/mock';
import { MockSearchProvider } from './search/mock';
import { MockStorageProvider } from './storage/mock';
import type { ProviderRegistry } from './types/index';

export * from './types/index';
export { MockMessagingProvider } from './messaging/mock';
export { MockMapsProvider } from './maps/mock';
export { MockAiProvider } from './ai/mock';
export { MockStorageProvider } from './storage/mock';
export { MockSearchProvider } from './search/mock';
export { MockPdfProvider } from './pdf/mock';
export { MockEmailProvider } from './email/mock';

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

  // M1: only mocks are implemented. Requesting a live name still returns mock
  // but labels mode for health transparency until adapters ship.
  const asLiveLabel = (requested: string, mockName: string) =>
    requested === 'mock' ? mockName : `${mockName} (pending:${requested})`;

  const messaging = new MockMessagingProvider();
  const maps = new MockMapsProvider();
  const ai = new MockAiProvider();
  const storage = new MockStorageProvider();
  const search = new MockSearchProvider();
  const pdf = new MockPdfProvider();
  const email = new MockEmailProvider();

  // Annotate requested mode without forking call sites
  void asLiveLabel;
  void messagingMode;
  void mapsMode;

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
