/**
 * S11 — a stored delivery result is replayed only to the member who produced it, and only
 * after that member passes the command's current resource check. Same rules as os-work.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CUSTOMER_DELIVERY_RECORD_SCOPE, WAREHOUSE_EXIT_RECORD_SCOPE } from '@isalwa/os-contracts';
import { DeliveryCommandService } from './delivery-command-service';
import { MemoryDeliveryStore } from './memory-store';

const NOW = new Date('2026-09-14T15:00:00.000Z');
const BOTH = [WAREHOUSE_EXIT_RECORD_SCOPE, CUSTOMER_DELIVERY_RECORD_SCOPE];

function member(id: string, organizationId: string, grantedScopes: string[] = BOTH, accessStatus = 'active') {
  return { id, organizationId, accessStatus, grantedScopes };
}

function readyStore() {
  const store = new MemoryDeliveryStore();
  store.putMember(member('member-a', 'org-a'));
  store.putMember(member('member-b', 'org-a'));
  store.putMember(member('member-x', 'org-x'));
  for (const [id, org] of [['order-1', 'org-a'], ['order-x', 'org-x']] as const) {
    store.putOrder({
      id,
      organizationId: org,
      partyId: `party-${org}`,
      orderNumber: `PED-${id}`,
      status: 'open',
      lines: [{ orderLineId: 'line-1', productRef: 'jar-500', description: 'Mermelada 500g', quantity: 12, unitLabel: 'unidades' }],
    });
  }
  return store;
}

function ctx(actorMemberId: string, organizationId = 'org-a') {
  return { organizationId, actorMemberId, effectiveAt: NOW };
}

function nota(recordedBy: string, orderId = 'order-1', quantity = 1) {
  return {
    orderId,
    recipient: 'Recepción',
    deliveredBy: 'Ana',
    recordedBy,
    source: 'employee_recorded' as const,
    quantities: [{ orderLineId: 'line-1', quantity }],
  };
}

describe('S11 delivery replay authorization', () => {
  it('replays the same actor and same request without a second note', async () => {
    const store = readyStore();
    const svc = new DeliveryCommandService(store);
    const first = await svc.execute('CreateNotaDeEntrega', ctx('member-a'), nota('member-a'), 'k1');
    const again = await svc.execute('CreateNotaDeEntrega', ctx('member-a'), nota('member-a'), 'k1');
    assert.deepEqual(again, first);
    assert.equal('actorMemberId' in again, false);
    assert.equal((await store.listAllDeliveryNotes('org-a')).length, 1);
  });

  it('gives a different member of the same company CONFLICT without the stored body', async () => {
    const store = readyStore();
    const svc = new DeliveryCommandService(store);
    await svc.execute('CreateNotaDeEntrega', ctx('member-a'), nota('member-a'), 'k1');
    await assert.rejects(
      () => svc.execute('CreateNotaDeEntrega', ctx('member-b'), nota('member-b'), 'k1'),
      (err: Error) => err.message === 'CONFLICT',
    );
    assert.equal((await store.listAllDeliveryNotes('org-a')).length, 1);
  });

  it('denies the original actor once the delivery scope is removed', async () => {
    const store = readyStore();
    const svc = new DeliveryCommandService(store);
    await svc.execute('CreateNotaDeEntrega', ctx('member-a'), nota('member-a'), 'k1');
    store.putMember(member('member-a', 'org-a', []));
    await assert.rejects(
      () => svc.execute('CreateNotaDeEntrega', ctx('member-a'), nota('member-a'), 'k1'),
      (err: Error) => err.message === 'PERMISSION_DENIED',
    );
  });

  it('denies the original actor once suspended', async () => {
    const store = readyStore();
    const svc = new DeliveryCommandService(store);
    await svc.execute('CreateNotaDeEntrega', ctx('member-a'), nota('member-a'), 'k1');
    store.putMember(member('member-a', 'org-a', BOTH, 'suspended'));
    await assert.rejects(
      () => svc.execute('CreateNotaDeEntrega', ctx('member-a'), nota('member-a'), 'k1'),
      (err: Error) => err.message === 'ACCESS_REVOKED',
    );
  });

  it('never returns one company result to another company using the same key', async () => {
    const store = readyStore();
    const svc = new DeliveryCommandService(store);
    const a = await svc.execute('CreateNotaDeEntrega', ctx('member-a'), nota('member-a'), 'shared');
    const x = await svc.execute(
      'CreateNotaDeEntrega',
      ctx('member-x', 'org-x'),
      nota('member-x', 'order-x'),
      'shared',
    );
    assert.notEqual(x.data.deliveryNoteId, a.data.deliveryNoteId);
    assert.equal(x.data.orderId, 'order-x');
    assert.equal((await store.listAllDeliveryNotes('org-a')).length, 1);
    assert.equal((await store.listAllDeliveryNotes('org-x')).length, 1);
  });

  it('V2 §10: the same actor sending a different payload on the same key gets CONFLICT', async () => {
    const store = readyStore();
    const svc = new DeliveryCommandService(store);
    await svc.execute('CreateNotaDeEntrega', ctx('member-a'), nota('member-a', 'order-1', 1), 'k1');
    await assert.rejects(
      () => svc.execute('CreateNotaDeEntrega', ctx('member-a'), nota('member-a', 'order-1', 5), 'k1'),
      (err: Error) => err.message === 'CONFLICT',
    );
    const notes = await store.listAllDeliveryNotes('org-a');
    assert.equal(notes.length, 1);
  });

  it('V2 §10: a legacy completed row is neither replayed nor re-run: REPLAY_REVIEW_REQUIRED', async () => {
    const store = readyStore();
    const svc = new DeliveryCommandService(store);
    await store.saveIdempotency({
      organizationId: 'org-a',
      key: 'legacy',
      commandName: 'CreateNotaDeEntrega',
      resultJson: { commandId: 'old', correlationId: 'old', data: { deliveryNoteId: 'secret-note' } },
      expiresAt: new Date(Date.now() + 60_000),
    });
    await assert.rejects(
      () => svc.execute('CreateNotaDeEntrega', ctx('member-a'), nota('member-a'), 'legacy'),
      (err: Error) => err.message === 'REPLAY_REVIEW_REQUIRED' && !err.message.includes('secret'),
    );
    assert.equal((await store.listAllDeliveryNotes('org-a')).length, 0);
  });

  it('turns concurrent duplicates into one note: same actor replays, another actor gets CONFLICT', async () => {
    const store = readyStore();
    const svc = new DeliveryCommandService(store);
    const results = await Promise.allSettled([
      svc.execute('CreateNotaDeEntrega', ctx('member-a'), nota('member-a'), 'race'),
      svc.execute('CreateNotaDeEntrega', ctx('member-a'), nota('member-a'), 'race'),
      svc.execute('CreateNotaDeEntrega', ctx('member-b'), nota('member-b'), 'race'),
    ]);
    assert.equal((await store.listAllDeliveryNotes('org-a')).length, 1);
    const ok = results.filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof svc.execute>>> => r.status === 'fulfilled');
    assert.ok(ok.length >= 1);
    for (const r of ok) assert.equal(r.value.data.deliveryNoteId, ok[0]!.value.data.deliveryNoteId);
    const memberB = results[2]!;
    assert.equal(memberB.status, 'rejected');
    assert.equal((memberB as PromiseRejectedResult).reason.message, 'CONFLICT');
  });
});
