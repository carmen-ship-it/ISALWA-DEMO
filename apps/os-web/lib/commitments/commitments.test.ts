import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { createEmployeeCommitment } from '@isalwa/os-contracts';
import { COMMITMENT_COPY, commitmentErrorCopy, commitmentStateLabel } from './copy';
import { buildCommitmentDraft, commitmentDueInputToIso, dueDateInputToIso, isSavedCommitment } from './draft';
import { commitmentChangeLine, commitmentChangeMemberIds } from './history';
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
    assert.match(COMMITMENT_COPY.saveFailed, /No se pudo guardar/);
    assert.equal(commitmentErrorCopy('text_required'), 'Escriba el compromiso.');
  });

  it('stores a calendar date as Bolivia midnight and rejects an impossible day', () => {
    assert.equal(dueDateInputToIso('2026-09-14'), '2026-09-14T04:00:00.000Z');
    assert.equal(dueDateInputToIso(''), null);
    assert.equal(dueDateInputToIso('2026-02-31'), 'invalid');
  });

  it('a commitment date alone means noon in Bolivia; a time is read on the Bolivia clock; impossible values are invalid', () => {
    assert.equal(commitmentDueInputToIso('2026-09-14'), '2026-09-14T16:00:00.000Z');
    assert.equal(commitmentDueInputToIso('2026-09-14', ''), '2026-09-14T16:00:00.000Z');
    assert.equal(commitmentDueInputToIso('2026-09-14', '08:30'), '2026-09-14T12:30:00.000Z');
    assert.equal(commitmentDueInputToIso('2026-09-14', '23:30'), '2026-09-15T03:30:00.000Z');
    assert.equal(commitmentDueInputToIso(''), null);
    assert.equal(commitmentDueInputToIso(null, '08:00'), null);
    assert.equal(commitmentDueInputToIso('2026-02-31'), 'invalid');
    assert.equal(commitmentDueInputToIso('2026-09-14', '25:00'), 'invalid');
    const draft = buildCommitmentDraft({
      id: 'c2',
      organizationId: 'org-a',
      ownerMemberId: 'mem-2',
      createdByMemberId: 'mem-1',
      text: 'Llevar muestra',
      dueDate: '2026-09-14',
      dueTime: '09:00',
      createdAt,
    });
    assert.equal(draft.ok, true);
    if (!draft.ok) return;
    assert.equal(draft.commitment.dueAt, '2026-09-14T13:00:00.000Z');
    assert.equal(draft.commitment.ownerMemberId, 'mem-2');
    assert.equal(draft.commitment.createdByMemberId, 'mem-1');
    assert.deepEqual(
      buildCommitmentDraft({ id: 'c3', organizationId: 'o', ownerMemberId: 'm', createdByMemberId: 'm', text: 'x', dueDate: '2026-02-31', createdAt }),
      { ok: false, reason: 'invalid_due' },
    );
  });

  it('history lines keep the previous deadline, owners, actor and reason', () => {
    const labels = new Map([
      ['m1', 'Ana'],
      ['m2', 'Beto'],
    ]);
    const base = { commitmentId: 'c', actorMemberId: 'm1', changedAt: '2026-09-14T15:00:00.000Z' };
    const rescheduled = commitmentChangeLine(
      { ...base, id: 'h1', kind: 'rescheduled', reason: 'El cliente pidió esperar', previousDueAt: '2026-09-14T16:00:00.000Z', newDueAt: '2026-09-20T16:00:00.000Z', previousOwnerMemberId: null, newOwnerMemberId: null },
      labels,
    );
    assert.match(rescheduled.title, /Ana · Cambió la fecha/);
    assert.match(rescheduled.detail, /Antes: .*14.*/);
    assert.match(rescheduled.detail, /Nueva fecha: .*20.*/);
    assert.match(rescheduled.detail, /Motivo: El cliente pidió esperar/);
    const reassigned = commitmentChangeLine(
      { ...base, id: 'h2', kind: 'reassigned', reason: 'Vacaciones', previousDueAt: null, newDueAt: null, previousOwnerMemberId: 'm1', newOwnerMemberId: 'm2' },
      labels,
    );
    assert.match(reassigned.detail, /Antes responsable: Ana · Nuevo responsable: Beto · Motivo: Vacaciones/);
    const cancelled = commitmentChangeLine(
      { ...base, id: 'h3', kind: 'cancelled', reason: 'Ya no se necesita', previousDueAt: null, newDueAt: null, previousOwnerMemberId: null, newOwnerMemberId: null },
      labels,
    );
    assert.match(cancelled.title, /Canceló/);
    assert.equal(commitmentChangeMemberIds([{ ...base, id: 'h2', kind: 'reassigned', reason: 'x', previousDueAt: null, newDueAt: null, previousOwnerMemberId: 'm1', newOwnerMemberId: 'm2' }]).sort().join(), 'm1,m1,m2');
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

  it('orders overdue before due today', () => {
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
  });

  it('persistence uses server actions and does not reach prisma directly', () => {
    const source = readFileSync(new URL('./persistence.ts', import.meta.url), 'utf8');
    assert.doesNotMatch(source, /prisma/i);
    assert.match(source, /use server/);
  });
});
