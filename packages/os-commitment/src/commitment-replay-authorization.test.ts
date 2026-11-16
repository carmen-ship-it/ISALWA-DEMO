/**
 * S11 — a stored commitment result is replayed only to the member who produced it, and
 * only while that member still passes the command gate. Same rules as os-work.
 *
 * Commitment commands require `member_active` only (COMMAND_REQUIRED_SCOPES), so
 * "revoked current permission" for this service is a suspended or terminated member.
 *
 * The store below serializes transactions and rolls back every write on throw, and its
 * idempotency insert fails like a unique key. That emulates Postgres; it is not Postgres.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { RequestContext } from '@isalwa/os-contracts';
import { CommitmentCommandService } from './commitment-command-service';
import type { OsCommitmentStore } from './os-commitment-store';

type Member = { id: string; organizationId: string; accessStatus: string };

function makeStore() {
  const members = new Map<string, Member>();
  const commitments: Array<Record<string, unknown>> = [];
  const events: unknown[] = [];
  const idempotency = new Map<string, { resultJson: Record<string, unknown> } & Record<string, unknown>>();
  let tail: Promise<unknown> = Promise.resolve();

  const store = {
    async getMemberInOrg(organizationId: string, memberId: string) {
      const m = members.get(memberId);
      return m && m.organizationId === organizationId ? m : null;
    },
    async listRoleAssignmentsForMember() {
      return [];
    },
    async listDelegationsForDelegate() {
      return [];
    },
    async partyExistsInOrg() {
      return true;
    },
    async insertCommitment(record: Record<string, unknown>) {
      commitments.push(record);
    },
    async getCommitmentInOrg(organizationId: string, commitmentId: string) {
      return commitments.find((c) => c.organizationId === organizationId && c.id === commitmentId) ?? null;
    },
    async admitCommitmentNotice() {
      // Notices are covered in commitment-command-service.test.ts.
    },
    async appendEventAndAudit(event: unknown) {
      events.push(event);
    },
    async findIdempotency(organizationId: string, key: string) {
      return idempotency.get(`${organizationId}:${key}`) ?? null;
    },
    async saveIdempotency(record: { organizationId: string; key: string; resultJson: Record<string, unknown> }) {
      const id = `${record.organizationId}:${record.key}`;
      if (idempotency.has(id)) throw Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
      idempotency.set(id, record as never);
    },
    async runInTransaction<T>(fn: (s: OsCommitmentStore) => Promise<T>): Promise<T> {
      const run = tail.then(async () => {
        const marks = [commitments.length, events.length];
        const keys = new Map(idempotency);
        try {
          return await fn(store as unknown as OsCommitmentStore);
        } catch (err) {
          commitments.length = marks[0]!;
          events.length = marks[1]!;
          idempotency.clear();
          for (const [k, v] of keys) idempotency.set(k, v);
          throw err;
        }
      });
      tail = run.catch(() => undefined);
      return run;
    },
  };
  return { store: store as unknown as OsCommitmentStore, members, commitments, events, idempotency };
}

function ctx(actorMemberId: string, organizationId = 'org-a'): RequestContext {
  return {
    organizationId,
    actorMemberId,
    personId: `person-${actorMemberId}`,
    authIdentityId: `auth-${actorMemberId}`,
    effectiveAt: new Date('2026-09-15T12:00:00.000Z'),
    correlationId: `corr-${actorMemberId}`,
  };
}

function setup(canLinkParty: ((ctx: RequestContext, partyId: string) => Promise<boolean>) | null = null) {
  const s = makeStore();
  s.members.set('mem-a', { id: 'mem-a', organizationId: 'org-a', accessStatus: 'active' });
  s.members.set('mem-b', { id: 'mem-b', organizationId: 'org-a', accessStatus: 'active' });
  s.members.set('mem-x', { id: 'mem-x', organizationId: 'org-x', accessStatus: 'active' });
  return { ...s, service: new CommitmentCommandService(s.store, canLinkParty) };
}

const create = (text = 'Llamar al cliente') => ({ text });

describe('S11 commitment replay authorization', () => {
  it('replays the same actor and request without a second commitment', async () => {
    const t = setup();
    const first = await t.service.execute('CreateEmployeeCommitment', ctx('mem-a'), create(), 'k1');
    const again = await t.service.execute('CreateEmployeeCommitment', ctx('mem-a'), create(), 'k1');
    assert.deepEqual(again, first);
    assert.equal('actorMemberId' in again, false);
    assert.equal(t.commitments.length, 1);
    assert.equal(t.events.length, 1);
  });

  it('refuses a replay on a customer the actor can no longer see, unless they own the commitment (resource recheck)', async () => {
    let visible = true;
    const t = setup(async () => visible);
    const forB = { text: 'Enviar muestra', partyId: 'cust-1', ownerMemberId: 'mem-b' };
    const forA = { text: 'Llamar', partyId: 'cust-1' };
    await t.service.execute('CreateEmployeeCommitment', ctx('mem-a'), forB, 'kb');
    const own = await t.service.execute('CreateEmployeeCommitment', ctx('mem-a'), forA, 'ka');
    visible = false;
    await assert.rejects(
      t.service.execute('CreateEmployeeCommitment', ctx('mem-a'), forB, 'kb'),
      (err: Error) => err.message === 'NOT_FOUND',
    );
    assert.deepEqual(await t.service.execute('CreateEmployeeCommitment', ctx('mem-a'), forA, 'ka'), own);
    assert.equal(t.commitments.length, 2);
  });

  it('gives a different member CONFLICT without the stored body or a new write', async () => {
    const t = setup();
    await t.service.execute('CreateEmployeeCommitment', ctx('mem-a'), create('privado de A'), 'k1');
    await assert.rejects(
      t.service.execute('CreateEmployeeCommitment', ctx('mem-b'), create(), 'k1'),
      (err: Error) => err.message === 'CONFLICT',
    );
    assert.equal(t.commitments.length, 1);
    assert.equal(t.events.length, 1);
  });

  it('denies the original actor after suspension', async () => {
    const t = setup();
    await t.service.execute('CreateEmployeeCommitment', ctx('mem-a'), create(), 'k1');
    t.members.set('mem-a', { id: 'mem-a', organizationId: 'org-a', accessStatus: 'suspended' });
    await assert.rejects(
      t.service.execute('CreateEmployeeCommitment', ctx('mem-a'), create(), 'k1'),
      (err: Error) => err.message === 'ACCESS_REVOKED',
    );
    assert.equal(t.commitments.length, 1);
  });

  it('keeps another company out: same key there runs its own command and never sees org-a', async () => {
    const t = setup();
    const a = await t.service.execute('CreateEmployeeCommitment', ctx('mem-a'), create('de A'), 'shared');
    const x = await t.service.execute('CreateEmployeeCommitment', ctx('mem-x', 'org-x'), create('de X'), 'shared');
    assert.notEqual(x.commandId, a.commandId);
    assert.equal(t.commitments.length, 2);
    assert.deepEqual(
      t.commitments.map((c) => c.organizationId).sort(),
      ['org-a', 'org-x'],
    );
  });

  it('V2 §10: same actor, same key, different payload is CONFLICT without the stored body', async () => {
    const t = setup();
    await t.service.execute('CreateEmployeeCommitment', ctx('mem-a'), create('uno'), 'k1');
    await assert.rejects(
      t.service.execute('CreateEmployeeCommitment', ctx('mem-a'), create('dos'), 'k1'),
      (err: Error) => err.message === 'CONFLICT',
    );
    assert.equal(t.commitments.length, 1);
  });

  it('V2 §10: same actor and payload under a different command name is CONFLICT', async () => {
    const t = setup();
    await t.service.execute('CreateEmployeeCommitment', ctx('mem-a'), create('uno'), 'k1');
    const stored = t.idempotency.get('org-a:k1') as { resultJson: Record<string, Record<string, unknown>> };
    stored.resultJson.__s11Replay!.command = 'SomeOtherCommand';
    await assert.rejects(
      t.service.execute('CreateEmployeeCommitment', ctx('mem-a'), create('uno'), 'k1'),
      (err: Error) => err.message === 'CONFLICT',
    );
    assert.equal(t.commitments.length, 1);
  });

  it('V2 §10: a legacy row (no S11 binding) is neither replayed nor re-run: REPLAY_REVIEW_REQUIRED', async () => {
    const t = setup();
    t.idempotency.set('org-a:legacy', {
      organizationId: 'org-a',
      key: 'legacy',
      commandName: 'CreateEmployeeCommitment',
      resultJson: { commandId: 'old', correlationId: 'old', data: { secret: 'texto ajeno' } },
    });
    await assert.rejects(
      t.service.execute('CreateEmployeeCommitment', ctx('mem-a'), create(), 'legacy'),
      (err: Error) => err.message === 'REPLAY_REVIEW_REQUIRED',
    );
    assert.equal(t.commitments.length, 0);
    assert.equal(t.events.length, 0);
  });

  it('turns concurrent duplicates into one commitment; another actor in the race gets CONFLICT', async () => {
    const t = setup();
    const results = await Promise.allSettled([
      t.service.execute('CreateEmployeeCommitment', ctx('mem-a'), create(), 'race'),
      t.service.execute('CreateEmployeeCommitment', ctx('mem-a'), create(), 'race'),
      t.service.execute('CreateEmployeeCommitment', ctx('mem-b'), create(), 'race'),
    ]);
    assert.equal(t.commitments.length, 1);
    assert.equal(t.events.length, 1);
    const [r1, r2, r3] = results;
    assert.equal(r1!.status, 'fulfilled');
    assert.equal(r2!.status, 'fulfilled');
    assert.deepEqual((r2 as PromiseFulfilledResult<unknown>).value, (r1 as PromiseFulfilledResult<unknown>).value);
    assert.equal(r3!.status, 'rejected');
    assert.equal((r3 as PromiseRejectedResult).reason.message, 'CONFLICT');
  });
});
