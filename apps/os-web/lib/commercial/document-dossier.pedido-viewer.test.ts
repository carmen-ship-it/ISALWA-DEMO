/**
 * Pedido commercial viewer: notes returned by the authorized delivery-notes
 * list must appear in the dossier even without delivery.record.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { composeDocumentDossier } from './document-dossier';

describe('document dossier for Pedido viewers', () => {
  it('includes issued nota PDF when notes were authorized by the API', () => {
    const items = composeDocumentDossier({
      partyId: 'party-1',
      deliveryNotes: [
        {
          id: 'note-1',
          internalDocumentRef: 'NE-PILOT-1',
          bornAt: '2026-11-25T12:00:00.000Z',
          status: 'issued',
        },
      ],
    });
    assert.equal(items.some((row) => row.kind === 'nota_pdf' && row.id === 'nota-pdf:note-1'), true);
    assert.match(items.find((row) => row.kind === 'nota_pdf')!.href, /delivery-notes\/note-1\/pdf/);
  });

  it('omits reversed notes', () => {
    const items = composeDocumentDossier({
      partyId: 'party-1',
      deliveryNotes: [
        {
          id: 'note-r',
          internalDocumentRef: 'NE-REV',
          bornAt: '2026-11-25T12:00:00.000Z',
          status: 'reversed',
        },
      ],
    });
    assert.equal(items.some((row) => row.kind === 'nota_pdf'), false);
  });
});
