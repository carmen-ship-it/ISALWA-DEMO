import type { AiAssistInput, AiAssistResult } from '../ai/types';
import type { QuotePdfRenderInput } from '../pdf/quote-pdf-document';
import type { DeliveryNotePdfRenderInput } from '../pdf/delivery-note-pdf-document';

export type {
  QuotePdfDocument,
  QuotePdfLine,
  QuotePdfRenderInput,
} from '../pdf/quote-pdf-document';

export type {
  DeliveryNotePdfDocument,
  DeliveryNotePdfLine,
  DeliveryNotePdfRenderInput,
} from '../pdf/delivery-note-pdf-document';

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
  | 'pdflib'
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

export type { AiAssistInput, AiAssistResult, AiAssistEvidenceRef } from '../ai/types';

export interface AiProvider {
  readonly info: ProviderInfo;
  summarizeAccount(input: {
    accountName: string;
    facts: string[];
  }): Promise<{ summary: string; evidence: string[] }>;
  assist(input: AiAssistInput): Promise<AiAssistResult>;
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
  renderQuotePdf(input: QuotePdfRenderInput): Promise<Uint8Array>;
  renderDeliveryNotePdf(input: DeliveryNotePdfRenderInput): Promise<Uint8Array>;
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
