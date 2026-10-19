import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { contactPhoneSummary, timelineEventLabel } from '@/lib/commercial/timeline-labels';
import {
  buildChangeContactEndpointPayload,
  buildRetireContactEndpointPayload,
  contactNumberFromForm,
  CONTACT_PHONE_VERIFICATION_OPTIONS,
} from '@/lib/party/contact-phone';

const base = { partyId: 'p1', contactId: 'c1', expectedVersion: 2, channel: 'phone', reason: 'number_changed' };

describe('T03 contact phone change and retirement (A2 §58, §66)', () => {
  it('needs a reason, a note for Otro, a new number and a human verification method', () => {
    assert.deepEqual(buildChangeContactEndpointPayload({ ...base, reason: '', newNumber: '7', verificationMethod: 'in_person' }), {
      ok: false,
      error: 'Elija el motivo.',
    });
    assert.deepEqual(buildRetireContactEndpointPayload({ ...base, reason: 'other' }), { ok: false, error: 'Describa el motivo.' });
    assert.deepEqual(buildChangeContactEndpointPayload({ ...base, newNumber: ' ', verificationMethod: 'in_person' }), {
      ok: false,
      error: 'Ingrese el número nuevo.',
    });
    assert.deepEqual(buildChangeContactEndpointPayload({ ...base, newNumber: '71111456', verificationMethod: 'new_sender_says_so' }), {
      ok: false,
      error: 'Elija cómo se verificó el número nuevo.',
    });
    assert.equal(CONTACT_PHONE_VERIFICATION_OPTIONS.some((option) => /remitente|soy/i.test(option.label)), false);
  });

  it('builds trimmed payloads without empty optional notes', () => {
    assert.deepEqual(
      buildChangeContactEndpointPayload({ ...base, newNumber: ' 7111-1456 ', verificationMethod: 'in_person', evidenceNote: '  ', reasonNote: '' }),
      {
        ok: true,
        payload: {
          partyId: 'p1',
          contactId: 'c1',
          expectedVersion: 2,
          channel: 'phone',
          reason: 'number_changed',
          newNumber: { country: 'BO', number: '7111-1456' },
          verificationMethod: 'in_person',
        },
      },
    );
    assert.deepEqual(buildRetireContactEndpointPayload({ ...base, channel: 'whatsapp', reason: 'other', reasonNote: ' Línea dada de baja ' }), {
      ok: true,
      payload: { partyId: 'p1', contactId: 'c1', expectedVersion: 2, channel: 'whatsapp', reason: 'other', reasonNote: 'Línea dada de baja' },
    });
    assert.equal(buildRetireContactEndpointPayload({ ...base, channel: 'sms' }).ok, false);
  });

  it('numbers always name their country and must be valid for it; digits are never re-read as another country', () => {
    assert.deepEqual(contactNumberFromForm('', 'BO'), { ok: true, value: null });
    assert.deepEqual(contactNumberFromForm(' 7000 0123 ', ''), { ok: true, value: { country: 'BO', number: '7000 0123' } });
    for (const [number, country] of [['59170000123', 'BO'], ['+54 11 2345 6789', 'BO'], ['70000123', 'AR'], ['abc', 'BO']]) {
      assert.equal(contactNumberFromForm(number, country).ok, false, `${number} ${country}`);
    }
  });

  it('history shows masked numbers with reason and verification wording', () => {
    assert.equal(
      contactPhoneSummary('contact.phone.changed', {
        previousPhoneMasked: '•••123',
        phoneMasked: '•••456',
        reason: 'entry_error',
        verificationMethod: 'in_person',
      }),
      'Número: •••123 → •••456 · Motivo: Error de registro · Verificación: Confirmación presencial',
    );
    assert.equal(
      contactPhoneSummary('contact.phone.retired', { retiredPhoneMasked: '•••456', reason: 'other', reasonNote: 'Línea de baja' }),
      'Número retirado: •••456 · Motivo: Otro (Línea de baja)',
    );
    assert.equal(timelineEventLabel('contact.phone.retired'), 'Teléfono de contacto retirado');
    assert.equal(
      contactPhoneSummary('contact.endpoint.changed', {
        channel: 'phone',
        whatsappFollows: true,
        previousMasked: '•••123',
        numberMasked: '•••456',
        reason: 'entry_error',
        verificationMethod: 'in_person',
      }),
      'Teléfono y WhatsApp: •••123 → •••456 · Motivo: Error de registro · Verificación: Confirmación presencial',
    );
    assert.equal(
      contactPhoneSummary('contact.endpoint.retired', { channel: 'whatsapp', retiredMasked: '•••789', reason: 'no_longer_belongs' }),
      'WhatsApp retirado: •••789 · Motivo: Número ya no pertenece al contacto',
    );
  });
});
