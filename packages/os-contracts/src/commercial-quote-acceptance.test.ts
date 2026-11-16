import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  COMMAND_REQUIRED_SCOPES,
  COMMERCIAL_COMMAND_NAMES,
  COMMERCIAL_COMMAND_PAYLOAD_SCHEMAS,
  OS_COMMERCIAL_EVENT_TYPES,
  OWN_QUOTE_CONVERT_ELIGIBLE_STATUS,
  QUOTE_ACCEPTANCE_CHANNELS,
  RecordQuoteCustomerAcceptancePayloadSchema,
} from './index';

const VALID = {
  quoteId: 'quote-1',
  channel: 'llamada',
  acceptedOn: '2026-11-16',
  evidence: 'Confirmó por teléfono el mismo día',
  expectedRevision: 2,
};

describe('RecordQuoteCustomerAcceptance contract', () => {
  it('is a registered commercial command with a payload schema, scope and event', () => {
    assert.equal((COMMERCIAL_COMMAND_NAMES as readonly string[]).includes('RecordQuoteCustomerAcceptance'), true);
    assert.equal(
      COMMERCIAL_COMMAND_PAYLOAD_SCHEMAS.RecordQuoteCustomerAcceptance,
      RecordQuoteCustomerAcceptancePayloadSchema,
    );
    assert.equal(COMMAND_REQUIRED_SCOPES.RecordQuoteCustomerAcceptance, 'member_active');
    assert.equal(
      (OS_COMMERCIAL_EVENT_TYPES as readonly string[]).includes('quote.customer_acceptance.recorded'),
      true,
    );
  });

  it('lists the human channels, with no provider receipt among them', () => {
    assert.deepEqual([...QUOTE_ACCEPTANCE_CHANNELS], ['whatsapp', 'llamada', 'visita', 'presencial', 'otro']);
  });

  it('accepts a complete payload and rejects missing or malformed fields', () => {
    assert.equal(RecordQuoteCustomerAcceptancePayloadSchema.safeParse(VALID).success, true);
    for (const bad of [
      { evidence: 'corto' },
      { evidence: 'x'.repeat(501) },
      { evidence: ' '.repeat(20) },
      { channel: 'email' },
      { acceptedOn: '16-11-2026' },
      { acceptedOn: undefined },
      { expectedRevision: 0 },
      { expectedRevision: 1.5 },
      { expectedRevision: undefined },
      { quoteId: '' },
    ]) {
      assert.equal(
        RecordQuoteCustomerAcceptancePayloadSchema.safeParse({ ...VALID, ...bad }).success,
        false,
        JSON.stringify(bad),
      );
    }
  });

  it('gates own-quote conversion on an accepted quote', () => {
    assert.equal(OWN_QUOTE_CONVERT_ELIGIBLE_STATUS, 'accepted');
  });
});
