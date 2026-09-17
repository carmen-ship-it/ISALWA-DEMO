/**
 * Future provider-neutral conversation ingestion port (types / comments only).
 *
 * CT3-H does not implement Meta, Twilio, or any vendor webhook.
 * When inbound messaging is connected later, adapters must:
 * - Accept a provider-neutral envelope (channel + opaque provider ids + text).
 * - Emit NormalizedConversationMessage / evidence shapes from @isalwa/os-contracts.
 * - Never send WhatsApp, never mutate orders/quotes/stock/payments/access.
 * - Never treat a customer message as payment confirmation.
 *
 * Coupling to a specific CPaaS SDK belongs outside this interface.
 */

import type { EvidenceChannel } from '@isalwa/os-contracts';

/** Opaque inbound envelope — no vendor field names (no wamid, MessageSid, etc.). */
export type ProviderNeutralInboundEnvelope = {
  organizationId: string;
  channel: EvidenceChannel;
  /** Digits already normalized by an upstream gate — not a live WA identity lookup. */
  phoneKey: string;
  text: string;
  occurredAt: string;
  /** Vendor-agnostic correlation id; may be null until a connector exists. */
  providerMessageId: string | null;
  conversationId: string | null;
};

export type ConversationIngestionRefusal =
  | 'missing_tenant'
  | 'missing_text'
  | 'missing_phone'
  | 'cross_tenant'
  | 'unsupported_channel';

export type ConversationIngestionResult =
  | {
      ok: true;
      /** Id of the normalized message record — not a send receipt. */
      normalizedMessageId: string;
    }
  | {
      ok: false;
      reason: ConversationIngestionRefusal;
    };

/**
 * Port only. No default implementation in CT3-H.
 * A future connector may implement this without changing Ask ISALWA assist routes.
 */
export type ConversationIngestionAdapter = {
  /**
   * Normalize an inbound envelope into tenant-scoped evidence.
   * Must not call outbound send APIs and must not write canonical commercial truth.
   */
  ingest(envelope: ProviderNeutralInboundEnvelope): Promise<ConversationIngestionResult>;
};
