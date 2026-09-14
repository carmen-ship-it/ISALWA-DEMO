import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { createInternalNotification, markNotificationRead, resolveIfSourceConditionGone } from '@isalwa/os-contracts';
import { NOTIFICATION_COPY, notificationKindLabel, unreadCountLabel } from './copy';
import { notificationRecordHref } from './links';
import { notificationPersistence } from './persistence';
import { countUnreadOpen, presentNotificationRows } from './view';

const createdAt = '2026-09-14T16:00:00.000Z';

function notice(id: string, source: { recordType: 'commitment' | 'work_item'; recordId: string; partyId: string | null }) {
  const created = createInternalNotification({
    id,
    organizationId: 'org-a',
    recipientMemberId: 'mem-1',
    kind: source.recordType === 'commitment' ? 'commitment_due' : 'work_due',
    title: source.recordType === 'commitment' ? 'Compromiso para hoy' : 'Trabajo para hoy',
    body: 'Confirmar despacho',
    source,
    createdAt,
  });
  assert.equal(created.ok, true);
  if (!created.ok) throw new Error('expected notice');
  return created.notification;
}

describe('notification presentation', () => {
  it('links only to an existing record and drops a commitment card without a customer', () => {
    assert.equal(notificationRecordHref({ recordType: 'work_item', recordId: 'w 1', partyId: null }), '/trabajo/w%201');
    assert.equal(
      notificationRecordHref({ recordType: 'approval_request', recordId: 'a1', partyId: null }),
      '/aprobaciones/a1',
    );
    assert.equal(
      notificationRecordHref({ recordType: 'quote', recordId: 'q1', partyId: 'p1' }),
      '/clientes/p1/cotizaciones/q1',
    );
    assert.equal(notificationRecordHref({ recordType: 'commitment', recordId: 'c1', partyId: null }), null);
    assert.equal(
      notificationRecordHref({ recordType: 'commitment', recordId: 'c1', partyId: 'p1' }),
      '/clientes/p1',
    );

    const rows = presentNotificationRows([
      notice('linked', { recordType: 'commitment', recordId: 'c1', partyId: 'p1' }),
      notice('dead', { recordType: 'commitment', recordId: 'c2', partyId: null }),
    ]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.href, '/clientes/p1');
    assert.equal(rows[0]?.linkLabel, 'Ver cliente');
    assert.equal(rows[0]?.readLabel, 'Sin leer');
  });

  it('counts only unread open notices and does not mark read as saved', async () => {
    const open = notice('open', { recordType: 'work_item', recordId: 'w1', partyId: null });
    const read = markNotificationRead(open, createdAt);
    assert.equal(read.ok, true);
    if (!read.ok) return;
    const resolved = resolveIfSourceConditionGone(
      notice('gone', { recordType: 'work_item', recordId: 'w2', partyId: null }),
      false,
      createdAt,
    );
    assert.equal(resolved.ok, true);
    if (!resolved.ok) return;
    assert.equal(countUnreadOpen([open, read.notification, resolved.notification]), 1);
    assert.equal(unreadCountLabel(1), '1 sin leer');
    assert.equal(notificationKindLabel('commitment_overdue'), 'Compromiso vencido');
    assert.match(NOTIFICATION_COPY.notStored, /correo/);
    assert.match(NOTIFICATION_COPY.notStored, /teléfono/);

    const marked = await notificationPersistence().markRead('open', createdAt);
    assert.deepEqual(marked, { ok: false, persisted: false, reason: 'schema_not_available' });
    assert.equal(open.readAt, null);
  });

  it('does not reach a provider or prisma', () => {
    const source = readFileSync(new URL('./persistence.ts', import.meta.url), 'utf8');
    assert.doesNotMatch(source, /prisma|sendgrid|fcm|web-push|smtp/i);
  });
});
