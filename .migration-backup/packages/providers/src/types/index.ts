export type ProviderName =
  | 'mock'
  | 'meta'
  | 'google'
  | 'mapbox'
  | 'openai'
  | 'anthropic'
  | 'r2'
  | 'minio'
  | 's3'
  | 'postgres'
  | 'meilisearch'
  | 'playwright'
  | 'reactpdf'
  | 'resend';

export interface ProviderInfo {
  name: string;
  mode: 'mock' | 'live';
}

export interface MessagingProvider {
  readonly info: ProviderInfo;
  sendText(input: {
    channelId: string;
    toE164: string;
    body: string;
  }): Promise<{ providerMessageId: string }>;
  health(): Promise<'up' | 'degraded' | 'down'>;
}

export interface MapsProvider {
  readonly info: ProviderInfo;
  geocode(query: string): Promise<{ lat: number; lng: number; label: string } | null>;
  reverseGeocode(lat: number, lng: number): Promise<{ label: string } | null>;
  health(): Promise<'up' | 'degraded' | 'down'>;
}

export interface AiProvider {
  readonly info: ProviderInfo;
  summarizeAccount(input: {
    accountName: string;
    facts: string[];
  }): Promise<{ summary: string; evidence: string[] }>;
  health(): Promise<'up' | 'degraded' | 'down'>;
}

export interface StorageProvider {
  readonly info: ProviderInfo;
  putObject(input: {
    key: string;
    bytes: Uint8Array;
    contentType: string;
  }): Promise<{ key: string }>;
  getSignedUrl(key: string, expiresSeconds: number): Promise<string>;
  health(): Promise<'up' | 'degraded' | 'down'>;
}

export interface SearchProvider {
  readonly info: ProviderInfo;
  search(query: string, limit?: number): Promise<Array<{ id: string; title: string; type: string }>>;
  health(): Promise<'up' | 'degraded' | 'down'>;
}

export interface PdfProvider {
  readonly info: ProviderInfo;
  renderQuotePdf(input: { quoteNumber: string; html: string }): Promise<Uint8Array>;
  health(): Promise<'up' | 'degraded' | 'down'>;
}

export interface EmailProvider {
  readonly info: ProviderInfo;
  send(input: { to: string; subject: string; html: string }): Promise<{ id: string }>;
  health(): Promise<'up' | 'degraded' | 'down'>;
}

export interface ProviderRegistry {
  messaging: MessagingProvider;
  maps: MapsProvider;
  ai: AiProvider;
  storage: StorageProvider;
  search: SearchProvider;
  pdf: PdfProvider;
  email: EmailProvider;
}
