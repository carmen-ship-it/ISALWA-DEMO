/**
 * S11 — a stored import result is replayed only to the member who produced it, and only
 * while that member still passes the command gate. Same rules as os-work
 * (`WorkCommandService.acceptedReplay`).
 *
 * Import runs outside one transaction, so it claims the key before any write (T01,
 * claim-first). A pending claim answers CONFLICT; a failed run releases the claim.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { RequestContext } from '@isalwa/os-contracts';
import { ImportCommandService } from './import-command-service';

type Member = { id: string; organizationId: string; accessStatus: string };
type Role = { roleKey: string; effectiveAt: Date; endedAt: Date | null };
type Write = { method: string; organizationId?: string };

/**
 * Recording store. Reads named in `reads` are answered there; any insert/append/end/
 * create/update call is recorded as a write. Transactions run one at a time and every
 * write and idempotency row is rolled back on throw; the idempotency insert fails like a
 * unique key. This emulates Postgres for service logic. It is not Postgres.
 */
function makeStore(reads: Record<string, (...args: never[]) => unknown> = {}) {
  const members = new Map<string, Member>();
  const roles = new Map<string, Role[]>();
  const writes: Write[] = [];
  const idempotency = new Map<string, Record<string, unknown>>();
  let tail: Promise<unknown> = Promise.resolve();
  const orgOf = (args: unknown[]): string | undefined => {
    for (const a of args) {
      if (a && typeof a === 'object' && 'organizationId' in a) {
        return String((a as { organizationId: unknown }).organizationId);
      }
    }
    return undefined;
  };
  // eslint-disable-next-line prefer-const
  let store: Record<string, unknown>;
  const base: Record<string, unknown> = {
    async getMemberInOrg(organizationId: string, memberId: string) {
      const m = members.get(memberId);
      return m && m.organizationId === organizationId ? m : null;
    },
    async listRoleAssignmentsForMember(memberId: string) {
      return roles.get(memberId) ?? [];
    },
    async listDelegationsForDelegate() {
      return [];
    },
    async findIdempotency(organizationId: string, key: string) {
      return idempotency.get(`${organizationId}:${key}`) ?? null;
    },
    async saveIdempotency(record: { organizationId: string; key: string }) {
      const id = `${record.organizationId}:${record.key}`;
      if (idempotency.has(id)) throw Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
      idempotency.set(id, record as Record<string, unknown>);
    },
    async completeIdempotency(organizationId: string, key: string, resultJson: Record<string, unknown>) {
      const row = idempotency.get(`${organizationId}:${key}`);
      if (!row) throw new Error('Record to update not found');
      row.resultJson = resultJson;
    },
    async deleteIdempotency(organizationId: string, key: string) {
      idempotency.delete(`${organizationId}:${key}`);
    },
    async runInTransaction<T>(fn: (s: unknown) => Promise<T>): Promise<T> {
      const run = tail.then(async () => {
        const mark = writes.length;
        const keys = new Map(idempotency);
        try {
          return await fn(store);
        } catch (err) {
          writes.length = mark;
          idempotency.clear();
          for (const [k, v] of keys) idempotency.set(k, v);
          throw err;
        }
      });
      tail = run.catch(() => undefined);
      return run;
    },
  };
  store = new Proxy(base, {
    get(target, prop) {
      if (typeof prop !== 'string' || prop === 'then') return undefined;
      if (prop in reads) return reads[prop];
      if (prop in target) return target[prop];
      if (/^(insert|append|end|create|update|delete|mark|record)/.test(prop)) {
        return async (...args: unknown[]) => {
          writes.push({ method: prop, organizationId: orgOf(args) });
        };
      }
      if (prop.startsWith('list')) return async () => [];
      return async () => null;
    },
  });
  return { store, members, roles, writes, idempotency };
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

const SINCE = new Date('2026-01-01T00:00:00.000Z');

function setup() {
  const t = makeStore({ loadMatchCatalog: (async () => ({ parties: [] })) as never });
  t.members.set('mem-a', { id: 'mem-a', organizationId: 'org-a', accessStatus: 'active' });
  t.members.set('mem-b', { id: 'mem-b', organizationId: 'org-a', accessStatus: 'active' });
  t.members.set('mem-x', { id: 'mem-x', organizationId: 'org-x', accessStatus: 'active' });
  t.roles.set('mem-a', [{ roleKey: 'master_data.admin', effectiveAt: SINCE, endedAt: null }]);
  t.roles.set('mem-b', [{ roleKey: 'master_data.admin', effectiveAt: SINCE, endedAt: null }]);
  t.roles.set('mem-x', [{ roleKey: 'master_data.admin', effectiveAt: SINCE, endedAt: null }]);
  return { ...t, service: new ImportCommandService(t.store as never, t.store as never, {} as never, {} as never) };
}

const COMMAND = 'DryRunClientImport' as const;
const payload = (_org = 'org-a') => ({ sourceFingerprint: 'fp-1', rows: [{ section: 'B', rowIndex: 0, commercialName: 'Tienda Uno', givenName: 'Ana', familyName: 'Rojas', celular: '70012345' }] });
const otherPayload = () => ({ sourceFingerprint: 'fp-2', rows: [{ section: 'B', rowIndex: 0, commercialName: 'Tienda Dos', givenName: 'Luis', familyName: 'Paz', celular: '70054321' }] });
const effects = (t: { writes: Write[] }) => t.writes.filter((w) => /^(insert|append|create)/.test(w.method)).length;

describe('S11 import replay authorization', () => {
  it('replays the same actor and request without a second write', async () => {
    const t = setup();
    const first = await t.service.execute(COMMAND, ctx('mem-a'), payload(), 'k1');
    const before = effects(t);
    assert.ok(before > 0);
    const again = await t.service.execute(COMMAND, ctx('mem-a'), payload(), 'k1');
    assert.deepEqual(again, first);
    assert.equal('actorMemberId' in (again as object), false);
    assert.equal(effects(t), before);
  });

  it('gives a different member of the same company CONFLICT without the stored body', async () => {
    const t = setup();
    await t.service.execute(COMMAND, ctx('mem-a'), payload(), 'k1');
    const before = effects(t);
    await assert.rejects(
      t.service.execute(COMMAND, ctx('mem-b'), payload(), 'k1'),
      (err: Error) => err.message === 'CONFLICT',
    );
    assert.equal(effects(t), before);
  });

  it('denies the original actor once its required scope (master_data.admin) has ended', async () => {
    const t = setup();
    await t.service.execute(COMMAND, ctx('mem-a'), payload(), 'k1');
    const before = effects(t);
    t.roles.set('mem-a', [{ roleKey: 'master_data.admin', effectiveAt: SINCE, endedAt: new Date('2026-09-01T00:00:00.000Z') }]);
    await assert.rejects(
      t.service.execute(COMMAND, ctx('mem-a'), payload(), 'k1'),
      (err: Error) => err.message === 'PERMISSION_DENIED',
    );
    assert.equal(effects(t), before);
  });

  it('keeps another company out: the same key there runs its own command', async () => {
    const t = setup();
    const a = await t.service.execute(COMMAND, ctx('mem-a'), payload(), 'shared');
    const aWrites = effects(t);
    const x = await t.service.execute(COMMAND, ctx('mem-x', 'org-x'), payload('org-x'), 'shared');
    assert.notDeepEqual(x, a);
    assert.equal(effects(t), aWrites * 2);
    assert.ok(t.writes.some((w) => w.organizationId === 'org-x'));
    assert.ok(t.idempotency.has('org-a:shared'));
    assert.ok(t.idempotency.has('org-x:shared'));
  });

  it('V2 §10: same actor, same key, different payload is CONFLICT without the stored body', async () => {
    const t = setup();
    await t.service.execute(COMMAND, ctx('mem-a'), payload(), 'k1');
    const before = effects(t);
    await assert.rejects(
      t.service.execute(COMMAND, ctx('mem-a'), otherPayload(), 'k1'),
      (err: Error) => err.message === 'CONFLICT',
    );
    assert.equal(effects(t), before);
  });

  it('V2 §10: same actor and payload under a different command name is CONFLICT', async () => {
    const t = setup();
    await t.service.execute(COMMAND, ctx('mem-a'), payload(), 'k1');
    const before = effects(t);
    const stored = t.idempotency.get('org-a:k1') as { resultJson: Record<string, Record<string, unknown>> };
    stored.resultJson.__s11Replay!.command = 'SomeOtherCommand';
    await assert.rejects(
      t.service.execute(COMMAND, ctx('mem-a'), payload(), 'k1'),
      (err: Error) => err.message === 'CONFLICT',
    );
    assert.equal(effects(t), before);
  });

  it('V2 §10: a legacy row (no S11 binding) is neither replayed nor re-run: REPLAY_REVIEW_REQUIRED', async () => {
    const t = setup();
    t.idempotency.set('org-a:legacy', {
      organizationId: 'org-a',
      key: 'legacy',
      commandName: COMMAND,
      resultJson: { commandId: 'old', correlationId: 'old', data: { secret: 'resultado ajeno' } },
    });
    await assert.rejects(
      t.service.execute(COMMAND, ctx('mem-a'), payload(), 'legacy'),
      (err: Error) => err.message === 'REPLAY_REVIEW_REQUIRED',
    );
    assert.equal(effects(t), 0);
  });

  it('claim-first: concurrent duplicates write once; the in-flight duplicate and another actor get CONFLICT; a later retry replays', async () => {
    const t = setup();
    const single = setup();
    await single.service.execute(COMMAND, ctx('mem-a'), payload(), 'solo');
    const results = await Promise.allSettled([
      t.service.execute(COMMAND, ctx('mem-a'), payload(), 'race'),
      t.service.execute(COMMAND, ctx('mem-a'), payload(), 'race'),
      t.service.execute(COMMAND, ctx('mem-b'), payload(), 'race'),
    ]);
    assert.equal(effects(t), effects(single));
    const fulfilled = results.filter((r) => r.status === 'fulfilled') as PromiseFulfilledResult<unknown>[];
    const rejected = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 2);
    for (const r of rejected) assert.equal(r.reason.message, 'CONFLICT');
    const retry = await t.service.execute(COMMAND, ctx('mem-a'), payload(), 'race');
    assert.deepEqual(retry, fulfilled[0]!.value);
    assert.equal(effects(t), effects(single));
  });

  it('claim-first: a failed run releases the claim so the same key can run again', async () => {
    const t = setup();
    const failing = { sourceFingerprint: 'fp-1', rows: 'not-rows' } as never;
    await assert.rejects(t.service.execute(COMMAND, ctx('mem-a'), failing, 'retry-key'));
    assert.equal(t.idempotency.has('org-a:retry-key'), false);
    await t.service.execute(COMMAND, ctx('mem-a'), payload(), 'retry-key');
    assert.ok(effects(t) > 0);
  });
});
