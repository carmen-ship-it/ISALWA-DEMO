import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { contactPhoneSummary, timelineEventLabel } from '@/lib/commercial/timeline-labels';
import {
  buildChangeContactPhonePayload,
  buildRetireContactPhonePayload,
  CONTACT_PHONE_VERIFICATION_OPTIONS,
} from '@/lib/party/contact-phone';

const base = { partyId: 'p1', contactId: 'c1', expectedVersion: 2, reason: 'number_changed' };

describe('T03 contact phone change and retirement (A2 §58, §66)', () => {
  it('needs a reason, a note for Otro, a new number and a human verification method', () => {
    assert.deepEqual(buildChangeContactPhonePayload({ ...base, reason: '', newPhone: '7', verificationMethod: 'in_person' }), {
      ok: false,
      error: 'Elija el motivo.',
    });
    assert.deepEqual(buildRetireContactPhonePayload({ ...base, reason: 'other' }), { ok: false, error: 'Describa el motivo.' });
    assert.deepEqual(buildChangeContactPhonePayload({ ...base, newPhone: ' ', verificationMethod: 'in_person' }), {
      ok: false,
      error: 'Ingrese el número nuevo.',
    });
    assert.deepEqual(buildChangeContactPhonePayload({ ...base, newPhone: '71111456', verificationMethod: 'new_sender_says_so' }), {
      ok: false,
      error: 'Elija cómo se verificó el número nuevo.',
    });
    assert.equal(CONTACT_PHONE_VERIFICATION_OPTIONS.some((option) => /remitente|soy/i.test(option.label)), false);
  });

  it('builds trimmed payloads without empty optional notes', () => {
    assert.deepEqual(
      buildChangeContactPhonePayload({ ...base, newPhone: ' 71111456 ', verificationMethod: 'in_person', evidenceNote: '  ', reasonNote: '' }),
      { ok: true, payload: { partyId: 'p1', contactId: 'c1', expectedVersion: 2, reason: 'number_changed', newPhone: '71111456', verificationMethod: 'in_person' } },
    );
    assert.deepEqual(buildRetireContactPhonePayload({ ...base, reason: 'other', reasonNote: ' Línea dada de baja ' }), {
      ok: true,
      payload: { partyId: 'p1', contactId: 'c1', expectedVersion: 2, reason: 'other', reasonNote: 'Línea dada de baja' },
    });
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
  });
});
