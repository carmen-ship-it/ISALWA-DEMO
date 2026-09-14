import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { createEmployeeCommitment } from '@isalwa/os-contracts';
import { COMMITMENT_COPY, commitmentErrorCopy, commitmentStateLabel } from './copy';
import { buildCommitmentDraft, dueDateInputToIso, isSavedCommitment } from './draft';
import { commitmentPersistence } from './persistence';
import { sortCommitmentRows } from './view';

const createdAt = '2026-09-13T16:00:00.000Z';

describe('commitment presentation', () => {
  it('names the five states in Spanish and does not add another', () => {
    assert.deepEqual(
      ['pending', 'due_today', 'overdue', 'fulfilled', 'cancelled'].map((state) =>
        commitmentStateLabel(state as 'pending'),
      ),
      ['Pendiente', 'Vence hoy', 'Vencido', 'Cumplido', 'Cancelado'],
    );
    assert.match(COMMITMENT_COPY.notSaved, /No se guardó/);
    assert.equal(commitmentErrorCopy('text_required'), 'Escriba el compromiso.');
  });

  it('stores a calendar date as Bolivia midnight and rejects an impossible day', () => {
    assert.equal(dueDateInputToIso('2026-09-14'), '2026-09-14T04:00:00.000Z');
    assert.equal(dueDateInputToIso(''), null);
    assert.equal(dueDateInputToIso('2026-02-31'), 'invalid');
  });

  it('builds an open draft and does not claim it was saved', () => {
    const draft = buildCommitmentDraft({
      id: 'c1',
      organizationId: 'org-a',
      ownerMemberId: 'mem-1',
      createdByMemberId: 'mem-1',
      text: ' Confirmar despacho ',
      dueDate: '2026-09-14',
      partyId: 'party-1',
      createdAt,
    });
    assert.equal(draft.ok, true);
    if (!draft.ok) return;
    assert.equal(draft.commitment.text, 'Confirmar despacho');
    assert.equal(draft.commitment.lifecycle, 'open');
    assert.equal(isSavedCommitment(draft.commitment), false);
  });

  it('orders overdue before due today and does not persist', async () => {
    const overdue = createEmployeeCommitment({
      id: 'late',
      organizationId: 'org-a',
      ownerMemberId: 'mem-1',
      createdByMemberId: 'mem-1',
      text: 'Atrasado',
      dueAt: '2026-09-13T04:00:00.000Z',
      createdAt,
    });
    const today = createEmployeeCommitment({
      id: 'today',
      organizationId: 'org-a',
      ownerMemberId: 'mem-1',
      createdByMemberId: 'mem-1',
      text: 'Hoy',
      dueAt: '2026-09-14T04:00:00.000Z',
      createdAt,
    });
    assert.equal(overdue.ok && today.ok, true);
    if (!overdue.ok || !today.ok) return;
    const rows = sortCommitmentRows([today.commitment, overdue.commitment], new Date('2026-09-14T16:00:00.000Z'));
    assert.deepEqual(
      rows.map((row) => [row.id, row.stateLabel]),
      [
        ['late', 'Vencido'],
        ['today', 'Vence hoy'],
      ],
    );

    const saved = await commitmentPersistence().save(today.commitment);
    const listed = await commitmentPersistence().list({ organizationId: 'org-a' });
    assert.deepEqual(saved, { ok: false, persisted: false, reason: 'schema_not_available' });
    assert.equal('items' in listed, false);
    assert.equal(listed.persisted, false);
  });

  it('does not reach prisma', () => {
    const source = readFileSync(new URL('./persistence.ts', import.meta.url), 'utf8');
    assert.doesNotMatch(source, /prisma|email|push/i);
  });
});
