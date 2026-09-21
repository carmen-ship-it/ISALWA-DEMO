import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MemoryDeliveryStore } from './memory-store';
import { DELIVERY_NOTES_LIST_LIMIT } from './list-limits';
import type { DeliveryNoteRecord } from './store-types';

function note(index: number, organizationId = 'org-a'): DeliveryNoteRecord {
  const bornAt = new Date(Date.UTC(2026, 8, 1, 0, index)).toISOString();
  return {
    id: `note-${index}`,
    organizationId,
    deliveryId: null,
    orderId: 'order-1',
    partyId: 'party-1',
    documentKind: 'nota_de_entrega',
    numberingPolicy: 'provisional_internal',
    noteNumber: null,
    internalDocumentRef: `internal-${index}`,
    displayDocumentNumber: null,
    externalDocumentNumber: null,
    status: 'issued',
    recipient: 'Recepción',
    deliveredBy: 'Almacén',
    receivedBy: null,
    observations: null,
    locationId: null,
    createdByMemberId: 'member-1',
    correctsNoteId: null,
    supersedesNoteId: null,
    correctionReason: null,
    deliveredAt: null,
    bornAt,
    claimsInvoice: false,
    claimsTax: false,
    createdAt: bornAt,
  };
}

describe('delivery note list bound', () => {
  it('returns only the newest 25 tenant notes', async () => {
    const store = new MemoryDeliveryStore();
    for (let index = 0; index < DELIVERY_NOTES_LIST_LIMIT + 3; index += 1) {
      await store.insertDeliveryNote(note(index));
    }
    await store.insertDeliveryNote(note(99, 'org-b'));

    const notes = await store.listDeliveryNotes('org-a', 'order-1');

    assert.equal(notes.length, DELIVERY_NOTES_LIST_LIMIT);
    assert.equal(notes[0]?.id, 'note-27');
    assert.equal(notes.at(-1)?.id, 'note-3');
    assert.equal(
      notes.some((row) => row.organizationId !== 'org-a'),
      false,
    );
  });
});
