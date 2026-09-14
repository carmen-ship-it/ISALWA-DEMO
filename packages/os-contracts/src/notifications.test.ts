import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createEmployeeCommitment, deriveCommitmentState } from './commitments';
import {
  admitNotification,
  commitmentNoticeKind,
  createInternalNotification,
  markNotificationRead,
  notificationDeliversExternally,
  notificationReadState,
  notificationResolution,
  notificationsInOrganization,
  resolveGoneCommitmentNotices,
  resolveIfSourceConditionGone,
  type InternalNotification,
} from './notifications';

const at = '2026-09-14T16:00:00.000Z';

function notice(overrides: Partial<Parameters<typeof createInternalNotification>[0]> = {}): InternalNotification {
  const created = createInternalNotification({
    id: 'n1',
    organizationId: 'org-a',
    recipientMemberId: 'mem-1',
    kind: 'commitment_due',
    title: 'Compromiso para hoy',
    body: 'Confirmar despacho',
    source: { recordType: 'commitment', recordId: 'c1', partyId: 'party-1' },
    createdAt: at,
    ...overrides,
  });
  assert.equal(created.ok, true);
  if (!created.ok) throw new Error('expected notice');
  return created.notification;
}

describe('internal notifications', () => {
  it('stays internal and does not deliver outside the product', () => {
    const item = notice();
    assert.equal(item.channel, 'internal');
    assert.equal(notificationDeliversExternally(), false);
    assert.equal(notificationReadState(item), 'unread');
    assert.equal(notificationResolution(item), 'open');
  });

  it('does not create a second open notice for the same issue and recipient', () => {
    const first = notice();
    const read = markNotificationRead(first, '2026-09-14T17:00:00.000Z');
    assert.equal(read.ok, true);
    if (!read.ok) return;
    const again = notice({ id: 'n2', title: 'Otro título' });
    const admitted = admitNotification([read.notification], again);
    assert.equal(admitted.outcome, 'duplicate');
    assert.equal(admitted.inbox.length, 1);
    assert.equal(admitted.notification.id, 'n1');
    assert.equal(notificationReadState(admitted.notification), 'read');
  });

  it('keeps read and resolved separate', () => {
    const item = notice();
    const resolved = resolveIfSourceConditionGone(item, false, '2026-09-15T04:00:00.000Z');
    assert.equal(resolved.ok, true);
    if (!resolved.ok) return;
    assert.equal(notificationResolution(resolved.notification), 'resolved');
    assert.equal(notificationReadState(resolved.notification), 'unread');
    assert.equal(resolved.notification.resolvedBecause, 'source_condition_gone');
    assert.equal(item.resolvedAt, null);
  });

  it('does not resolve while the source condition is still present', () => {
    const item = notice();
    const kept = resolveIfSourceConditionGone(item, true, '2026-09-15T04:00:00.000Z');
    assert.equal(kept.ok, true);
    if (!kept.ok) return;
    assert.equal(kept.notification, item);
    assert.equal(notificationResolution(kept.notification), 'open');
  });

  it('allows a new notice after the previous one was resolved', () => {
    const first = notice();
    const resolved = resolveIfSourceConditionGone(first, false, '2026-09-15T04:00:00.000Z');
    assert.equal(resolved.ok, true);
    if (!resolved.ok) return;
    const next = notice({ id: 'n2' });
    const admitted = admitNotification([resolved.notification], next);
    assert.equal(admitted.outcome, 'created');
    assert.equal(admitted.inbox.length, 2);
  });

  it('resolves a commitment notice only when that day-state is gone', () => {
    const created = createEmployeeCommitment({
      id: 'c1',
      organizationId: 'org-a',
      ownerMemberId: 'mem-1',
      createdByMemberId: 'mem-1',
      text: 'Confirmar despacho',
      dueAt: '2026-09-14T04:00:00.000Z',
      partyId: 'party-1',
      createdAt: '2026-09-13T16:00:00.000Z',
    });
    assert.equal(created.ok, true);
    if (!created.ok) return;
    const dueToday = notice();
    const overdue = notice({ id: 'n-over', kind: 'commitment_overdue', title: 'Compromiso vencido' });
    const other = notice({
      id: 'n-other',
      kind: 'work_due',
      source: { recordType: 'work_item', recordId: 'w1', partyId: null },
    });

    const stillDue = deriveCommitmentState(created.commitment, new Date('2026-09-14T16:00:00.000Z'));
    assert.equal(commitmentNoticeKind(stillDue), 'commitment_due');
    const whileDue = resolveGoneCommitmentNotices([dueToday, overdue, other], {
      commitmentId: 'c1',
      state: stillDue,
      at: '2026-09-14T16:00:00.000Z',
    });
    assert.equal(whileDue.ok, true);
    if (!whileDue.ok) return;
    assert.equal(whileDue.inbox[0]?.resolvedAt, null);
    assert.notEqual(whileDue.inbox[1]?.resolvedAt, null);
    assert.equal(whileDue.inbox[2]?.resolvedAt, null);

    const later = deriveCommitmentState(created.commitment, new Date('2026-09-15T04:00:00.000Z'));
    assert.equal(commitmentNoticeKind(later), 'commitment_overdue');
    const afterDay = resolveGoneCommitmentNotices(whileDue.inbox, {
      commitmentId: 'c1',
      state: later,
      at: '2026-09-15T04:00:00.000Z',
    });
    assert.equal(afterDay.ok, true);
    if (!afterDay.ok) return;
    assert.notEqual(afterDay.inbox.find((item) => item.id === 'n1')?.resolvedAt, null);
    assert.equal(afterDay.inbox.find((item) => item.kind === 'work_due')?.resolvedAt, null);
  });

  it('rejects a notice without a source record and does not leak another organization', () => {
    const missing = createInternalNotification({
      id: 'n-empty',
      organizationId: 'org-a',
      recipientMemberId: 'mem-1',
      kind: 'work_due',
      title: 'Trabajo para hoy',
      source: { recordType: 'work_item', recordId: '  ' },
      createdAt: at,
    });
    assert.deepEqual(missing, { ok: false, reason: 'source_required' });

    const own = notice();
    const foreign = notice({ id: 'n-foreign', organizationId: 'org-b' });
    assert.deepEqual(
      notificationsInOrganization([own, foreign], 'org-a').map((item) => item.id),
      ['n1'],
    );
  });
});
