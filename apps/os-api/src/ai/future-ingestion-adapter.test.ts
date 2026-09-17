/**
 * Future ingestion adapter — type surface only (no Meta/Twilio coupling).
 * Ensures the port stays importable without executing connectors.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type {
  ConversationIngestionAdapter,
  ProviderNeutralInboundEnvelope,
} from './future-ingestion-adapter';

describe('future-ingestion-adapter types', () => {
  it('accepts a provider-neutral envelope without vendor fields', async () => {
    const envelope: ProviderNeutralInboundEnvelope = {
      organizationId: 'org-a',
      channel: 'whatsapp',
      phoneKey: '59170000000',
      text: '¿Cuándo llega el pedido?',
      occurredAt: '2026-09-17T12:00:00.000Z',
      providerMessageId: null,
      conversationId: null,
    };

    const stub: ConversationIngestionAdapter = {
      async ingest(input) {
        assert.equal(input.organizationId, envelope.organizationId);
        assert.equal('wamid' in (input as object), false);
        assert.equal('MessageSid' in (input as object), false);
        return { ok: false, reason: 'unsupported_channel' };
      },
    };

    const result = await stub.ingest(envelope);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, 'unsupported_channel');
  });
});
