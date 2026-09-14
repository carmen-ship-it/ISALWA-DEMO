/**
 * Gate A adversarial tenant proofs for apps/api reads and visit check-in.
 *
 * Not HOSTED. Not API_VERIFIED. Synthetic tenants only:
 * org-session-alpha and org-other-zeta. No real customers.
 *
 * The first block proves the shared session helper that already exists.
 * The second block dynamically imports query modules other workers are adding.
 * A missing module fails the case with that path. It does not pass.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  holdsExactScope,
  sessionFromAuthenticatedRequest,
  trustedOrganizationId,
  type TrustedTenantSession,
} from '../auth/trusted-session';

const SESSION = 'org-session-alpha';
const OTHER = 'org-other-zeta';
const READ = 'commercial.team.read';
const PULSE_READ = 'management.org.read';
const PRODUCT_READ = 'master_data.admin';
const WRONG = 'people.admin';
const SESSION_NAME = 'AlphaSessionName';
const OTHER_NAME = 'ZetaOtherName';
const SESSION_PHONE = '59170000111';
const OTHER_PHONE = '59170000991';
const SESSION_LAT = 11.111;
const SESSION_LNG = 22.222;
const OTHER_LAT = 77.701;
const OTHER_LNG = -88.802;
const SESSION_PRICE = 11100;
const OTHER_PRICE = 7700700;
const OTHER_COUNT = 7;
const SESSION_ID = 'acct-alpha';
const FOREIGN_ID = 'acct-zeta';
const MISSING_ID = 'acct-missing';
const SESSION_PRODUCT = 'prod-alpha';
const FOREIGN_PRODUCT = 'prod-zeta';
const SESSION_QUOTE = 'quote-alpha';
const FOREIGN_QUOTE = 'quote-zeta';
const SESSION_INVOICE = 'inv-alpha';
const FOREIGN_INVOICE = 'inv-zeta';
const SESSION_CONVERSATION = 'conv-alpha';
const FOREIGN_CONVERSATION = 'conv-zeta';
const HERO_CODE = 'H-SILENT-001';

const LEAKS = [
  OTHER,
  OTHER_NAME,
  OTHER_PHONE,
  String(OTHER_LAT),
  String(OTHER_LNG),
  String(OTHER_PRICE),
  '77007',
  '77.007',
  '77,007',
  FOREIGN_ID,
  FOREIGN_PRODUCT,
  FOREIGN_QUOTE,
  FOREIGN_INVOICE,
  FOREIGN_CONVERSATION,
  'attn-zeta',
  'visit-zeta',
  'SKU-ZETA',
  'COT-ZETA',
  'FAC-ZETA',
  HERO_CODE,
];

const TERRITORIO = '../territorio/territorio-query.ts';
const CONVERSATIONS = '../messaging/conversations-query.ts';
const RADAR = '../radar/radar-query.ts';
const PULSE = '../pulse/pulse-query.ts';
const VISITS = '../visits/visits-query.ts';
const ACCOUNTS = '../accounts/accounts.service.ts';
const COMMERCE = '../commerce/commerce.service.ts';

type Call = { model: string; method: string; args: unknown };

type Settled = {
  ok: boolean;
  value: unknown;
  message: string | null;
  status: number | null;
};

type Recording = {
  db: unknown;
  calls: Call[];
};

function session(scopes: readonly string[]): TrustedTenantSession {
  return { organizationId: SESSION, grantedScopes: scopes };
}

function row(id: string, organizationId: string, foreign: boolean, index = 0): Record<string, unknown> {
  const name = foreign ? OTHER_NAME : SESSION_NAME;
  const phone = foreign ? OTHER_PHONE : SESSION_PHONE;
  const lat = foreign ? OTHER_LAT : SESSION_LAT;
  const lng = foreign ? OTHER_LNG : SESSION_LNG;
  const price = foreign ? OTHER_PRICE : SESSION_PRICE;
  const suffix = index > 0 ? `-${index}` : '';
  return {
    id,
    organizationId,
    code: foreign && index === 1 ? HERO_CODE : id,
    legalName: name,
    tradeName: name,
    name,
    title: name,
    body: name,
    segment: foreign ? 'Z' : 'A',
    personaKey: foreign ? 'zeta' : 'alpha',
    creditStatus: foreign ? 'foreign' : 'ok',
    relationshipScore: foreign ? OTHER_COUNT : 11,
    ownerUserId: foreign ? 'owner-zeta' : 'owner-alpha',
    contactPhoneE164: phone,
    phone,
    lat,
    lng,
    type: 'quote.created',
    payloadJson: null,
    actorUserId: null,
    notes: null,
    validUntil: new Date('2026-02-01T00:00:00.000Z'),
    issuedAt: new Date('2026-01-02T00:00:00.000Z'),
    dueAt: new Date('2026-02-01T00:00:00.000Z'),
    orders: [],
    allocations: [],
    sku: foreign ? 'SKU-ZETA' : 'SKU-ALPHA',
    number: foreign ? 'COT-ZETA' : 'COT-ALPHA',
    status: 'open',
    kind: 'visit_gap',
    score: foreign ? OTHER_COUNT : 11,
    reason: name,
    accountId: foreign ? FOREIGN_ID : SESSION_ID,
    productId: foreign ? FOREIGN_PRODUCT : SESSION_PRODUCT,
    quoteId: foreign ? FOREIGN_QUOTE : SESSION_QUOTE,
    invoiceId: foreign ? FOREIGN_INVOICE : SESSION_INVOICE,
    conversationId: foreign ? FOREIGN_CONVERSATION : SESSION_CONVERSATION,
    listPriceCentavos: BigInt(price),
    unitPriceCentavos: BigInt(price),
    amountCentavos: BigInt(price),
    balanceCentavos: foreign ? BigInt(price) : 0n,
    totalCentavos: BigInt(price),
    subtotalCentavos: BigInt(price),
    taxCentavos: 0n,
    creditLimitCentavos: 0n,
    isActive: true,
    slaStatus: foreign ? 'breached' : 'ok',
    lastMessageAt: new Date('2026-01-02T00:00:00.000Z'),
    paidAt: new Date('2026-09-02T00:00:00.000Z'),
    plannedAt: new Date('2026-09-02T00:00:00.000Z'),
    occurredAt: new Date('2026-01-02T00:00:00.000Z'),
    observedAt: new Date('2026-01-02T00:00:00.000Z'),
    createdAt: new Date('2026-01-02T00:00:00.000Z'),
    sentAt: null,
    category: { name: foreign ? OTHER_NAME : 'AlphaCategory' },
    owner: { id: foreign ? 'owner-zeta' : 'owner-alpha', name },
    territory: { code: foreign ? 'TZ' : 'TA' },
    channel: { displayName: name, purpose: 'fixture', organizationId },
    account: {
      id: foreign ? FOREIGN_ID : SESSION_ID,
      organizationId,
      tradeName: name,
      legalName: name,
      code: foreign ? HERO_CODE : 'A-ALPHA',
      segment: foreign ? 'Z' : 'A',
    },
    product: { id: foreign ? FOREIGN_PRODUCT : SESSION_PRODUCT, name, sku: foreign ? 'SKU-ZETA' : 'SKU-ALPHA' },
    locations: [{ id: `${id}-loc`, lat, lng, isPrimary: true, label: name }],
    contacts: [{ id: `${id}-contact${suffix}`, phone, name }],
    messages: [{
      id: `${id}-msg`,
      organizationId,
      body: name,
      direction: 'in',
      sentAt: new Date('2026-01-02T00:00:00.000Z'),
      senderType: 'contact',
    }],
    items: [],
    quotes: [],
    orders: [],
    invoices: [],
    visits: [],
    conversations: [],
    priceObservations: [],
    allocations: [],
    promises: [],
  };
}

function seed(mode: 'mixed' | 'foreign-only'): Record<string, Record<string, unknown>[]> {
  const foreign = Array.from({ length: OTHER_COUNT }, (_, index) =>
    row(index === 0 ? FOREIGN_ID : `${FOREIGN_ID}-${index}`, OTHER, true, index),
  );
  const sessionRows = mode === 'mixed' ? [row(SESSION_ID, SESSION, false)] : [];
  const clone = (rows: Record<string, unknown>[], idOf: (base: Record<string, unknown>, index: number) => string) =>
    rows.map((entry, index) => ({ ...entry, id: idOf(entry, index) }));
  return {
    account: mode === 'mixed' ? [...sessionRows, ...foreign] : foreign,
    conversation:
      mode === 'mixed'
        ? [row(SESSION_CONVERSATION, SESSION, false), ...clone(foreign, () => FOREIGN_CONVERSATION).map((entry, index) => ({
            ...entry,
            id: index === 0 ? FOREIGN_CONVERSATION : `${FOREIGN_CONVERSATION}-${index}`,
          }))]
        : clone(foreign, (_entry, index) => (index === 0 ? FOREIGN_CONVERSATION : `${FOREIGN_CONVERSATION}-${index}`)),
    attentionItem:
      mode === 'mixed'
        ? [row('attn-alpha', SESSION, false), ...foreign.map((entry, index) => ({ ...entry, id: index === 0 ? 'attn-zeta' : `attn-zeta-${index}` }))]
        : foreign.map((entry, index) => ({ ...entry, id: index === 0 ? 'attn-zeta' : `attn-zeta-${index}` })),
    payment: mode === 'mixed' ? [row('pay-alpha', SESSION, false), ...foreign.map((entry, index) => ({ ...entry, id: `pay-zeta-${index}` }))] : foreign.map((entry, index) => ({ ...entry, id: `pay-zeta-${index}` })),
    invoice:
      mode === 'mixed'
        ? [row(SESSION_INVOICE, SESSION, false), ...foreign.map((entry, index) => ({ ...entry, id: index === 0 ? FOREIGN_INVOICE : `${FOREIGN_INVOICE}-${index}`, number: 'FAC-ZETA' }))]
        : foreign.map((entry, index) => ({ ...entry, id: index === 0 ? FOREIGN_INVOICE : `${FOREIGN_INVOICE}-${index}`, number: 'FAC-ZETA' })),
    visit: mode === 'mixed' ? [row('visit-alpha', SESSION, false)] : foreign.map((entry, index) => ({ ...entry, id: index === 0 ? 'visit-zeta' : `visit-zeta-${index}` })),
    quote:
      mode === 'mixed'
        ? [row(SESSION_QUOTE, SESSION, false), ...foreign.map((entry, index) => ({ ...entry, id: index === 0 ? FOREIGN_QUOTE : `${FOREIGN_QUOTE}-${index}` }))]
        : foreign.map((entry, index) => ({ ...entry, id: index === 0 ? FOREIGN_QUOTE : `${FOREIGN_QUOTE}-${index}` })),
    product:
      mode === 'mixed'
        ? [row(SESSION_PRODUCT, SESSION, false), row(FOREIGN_PRODUCT, OTHER, true)]
        : [row(FOREIGN_PRODUCT, OTHER, true)],
    priceObservation:
      mode === 'mixed'
        ? [row('obs-alpha', SESSION, false), row('obs-zeta', OTHER, true)]
        : [row('obs-zeta', OTHER, true)],
    activityEvent:
      mode === 'mixed'
        ? [row('evt-alpha', SESSION, false), row('evt-zeta', OTHER, true)]
        : [row('evt-zeta', OTHER, true)],
  };
}

function organizationIn(where: unknown): string | undefined {
  if (!where || typeof where !== 'object') return undefined;
  if (Array.isArray(where)) {
    for (const item of where) {
      const found = organizationIn(item);
      if (found) return found;
    }
    return undefined;
  }
  const record = where as Record<string, unknown>;
  if (typeof record.organizationId === 'string') return record.organizationId;
  for (const value of Object.values(record)) {
    if (value && typeof value === 'object') {
      const found = organizationIn(value);
      if (found) return found;
    }
  }
  return undefined;
}

function matchesWhere(rowValue: Record<string, unknown>, where: unknown): boolean {
  if (!where || typeof where !== 'object' || Array.isArray(where)) return true;
  const record = where as Record<string, unknown>;
  if (Array.isArray(record.AND) && !record.AND.every((part) => matchesWhere(rowValue, part))) return false;
  if (Array.isArray(record.OR) && record.OR.length > 0 && !record.OR.some((part) => matchesWhere(rowValue, part))) return false;
  for (const [key, cond] of Object.entries(record)) {
    if (key === 'AND' || key === 'OR' || key === 'NOT') continue;
    if (cond && typeof cond === 'object' && !Array.isArray(cond)) {
      const clause = cond as { contains?: unknown; gt?: unknown };
      if (typeof clause.contains === 'string') {
        const value = rowValue[key];
        if (typeof value !== 'string' || !value.toLowerCase().includes(clause.contains.toLowerCase())) return false;
        continue;
      }
      if (typeof clause.gt === 'number' && !(Number(rowValue[key] ?? 0) > clause.gt)) return false;
      continue;
    }
    if (typeof cond === 'string' || typeof cond === 'number' || typeof cond === 'boolean') {
      if (rowValue[key] !== cond) return false;
    }
  }
  return true;
}

function recording(mode: 'mixed' | 'foreign-only'): Recording {
  const tables = seed(mode);
  const calls: Call[] = [];
  const db = new Proxy({} as Record<string, unknown>, {
    get(_target, prop: string) {
      if (prop === '$transaction') {
        return async (fn: unknown) => {
          calls.push({ model: '$transaction', method: 'execute', args: undefined });
          return typeof fn === 'function' ? fn(db) : [];
        };
      }
      if (prop === 'then') return undefined;
      return new Proxy({} as Record<string, unknown>, {
        get(_model, method: string) {
          if (method === 'then') return undefined;
          return async (args?: { where?: unknown; take?: number; _sum?: Record<string, boolean> }) => {
            calls.push({ model: prop, method, args });
            const where = args?.where;
            const org = organizationIn(where);
            const rows = (tables[prop] ?? []).filter((entry) => {
              if (org && entry.organizationId !== org) return false;
              if (where && !matchesWhere(entry, where)) return false;
              return true;
            });
            if (method === 'count') return rows.length;
            if (method === 'aggregate') {
              const fields = args?._sum ? Object.keys(args._sum) : [];
              const summed: Record<string, number> = {};
              for (const field of fields) {
                summed[field] = rows.reduce((total, entry) => total + Number(entry[field] ?? 0), 0);
              }
              return { _sum: summed, _count: rows.length };
            }
            if (method === 'findMany') return rows.slice(0, args?.take ?? rows.length);
            if (method === 'findFirst' || method === 'findUnique' || method === 'findUniqueOrThrow') return rows[0] ?? null;
            if (method === 'create' || method === 'update' || method === 'updateMany' || method === 'delete') {
              return { id: 'mutation-should-not-run', count: rows.length };
            }
            return rows;
          };
        },
      });
    },
  });
  return { db, calls };
}

function readsOf(calls: Call[]): Call[] {
  return calls.filter((call) => !['create', 'update', 'updateMany', 'delete', 'execute'].includes(call.method));
}

function mutationsOf(calls: Call[], method = 'create'): Call[] {
  return calls.filter((call) => call.method === method);
}

function assertOrganizationInWhere(calls: Call[], organizationId = SESSION): void {
  const reads = readsOf(calls);
  assert.equal(reads.length > 0, true, 'expected a recorded read');
  for (const call of reads) {
    const blob = JSON.stringify(call.args ?? {});
    assert.equal(
      blob.includes(`"organizationId":"${organizationId}"`),
      true,
      `${call.model}.${call.method} where missing organizationId: ${blob}`,
    );
    assert.equal(blob.includes(OTHER), false, `${call.model}.${call.method} queried ${OTHER}`);
  }
}

function textOf(value: unknown): string {
  try {
    return JSON.stringify(value) ?? '';
  } catch {
    return String(value);
  }
}

function assertNoForeign(serialized: string): void {
  for (const leak of LEAKS) {
    assert.equal(serialized.includes(leak), false, `leaked ${leak} in ${serialized.slice(0, 400)}`);
  }
  assert.equal(serialized.includes(`"count":${OTHER_COUNT}`), false);
}

function exceptionStatus(error: unknown): number | null {
  if (error && typeof error === 'object' && 'getStatus' in error) {
    const getStatus = (error as { getStatus?: unknown }).getStatus;
    if (typeof getStatus === 'function') return getStatus.call(error) as number;
  }
  return null;
}

async function settle(run: () => Promise<unknown>): Promise<Settled> {
  try {
    return { ok: true, value: await run(), message: null, status: null };
  } catch (error) {
    return {
      ok: false,
      value: null,
      message: error instanceof Error ? error.message : String(error),
      status: exceptionStatus(error),
    };
  }
}

function denialCode(settled: Settled): string | null {
  if (!settled.ok) {
    if (settled.status === 401 || settled.message === 'AUTH_REQUIRED') return 'AUTH_REQUIRED';
    if (settled.status === 403 || settled.message === 'ROLE_FORBIDDEN') return 'ROLE_FORBIDDEN';
    if (settled.status === 404) return 'NOT_FOUND';
    return settled.message;
  }
  if (settled.value && typeof settled.value === 'object' && 'code' in settled.value) {
    const code = (settled.value as { code?: unknown }).code;
    if (code === 'AUTH_REQUIRED' || code === 'ROLE_FORBIDDEN') return code;
  }
  return null;
}

function comparable(settled: Settled): string {
  if (!settled.ok) return `throw:${settled.status ?? ''}:${settled.message ?? ''}`;
  return `value:${textOf(settled.value)}`;
}

function countOf(value: unknown): number | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as { count?: unknown; items?: unknown; points?: unknown };
  if (typeof record.count === 'number') return record.count;
  if (Array.isArray(record.items)) return record.items.length;
  if (Array.isArray(record.points)) return record.points.length;
  return undefined;
}

function numbersIn(value: unknown, found: number[] = []): number[] {
  if (typeof value === 'number' && Number.isFinite(value)) found.push(value);
  else if (typeof value === 'bigint') found.push(Number(value));
  else if (Array.isArray(value)) value.forEach((entry) => numbersIn(entry, found));
  else if (value && typeof value === 'object') Object.values(value).forEach((entry) => numbersIn(entry, found));
  return found;
}

function assertNotCallShapeError(settled: Settled): void {
  if (
    !settled.ok &&
    settled.message &&
    /is not a function|Cannot read propert|is not iterable|Cannot find module|Cannot find package|Transform failed|experimental decorators/.test(
      settled.message,
    )
  ) {
    assert.fail(`call did not execute a tenant decision. ${settled.message}`);
  }
}

function isMissingOwnedModule(error: unknown, specifier: string): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const first = message.split('\n')[0] ?? message;
  const base = specifier.split('/').pop() ?? specifier;
  const named = first.match(/Cannot find module '([^']+)'/)?.[1];
  if (!named) return false;
  return named === specifier || named.endsWith(`/${base}`) || named.endsWith(base.replace(/\.ts$/, ''));
}

async function loadOwned(specifier: string): Promise<Record<string, unknown> | 'missing'> {
  try {
    const loaded = (await import(specifier)) as Record<string, unknown>;
    if (loaded.default && typeof loaded.default === 'object') {
      return { ...loaded, ...(loaded.default as Record<string, unknown>) };
    }
    return loaded;
  } catch (error) {
    if (isMissingOwnedModule(error, specifier)) return 'missing';
    throw error;
  }
}

function missingModule(specifier: string, expected: string): never {
  assert.fail(
    `MISSING MODULE ${specifier}. Expected ${expected}. Proof skipped because the module is not importable. Not HOSTED. Not API_VERIFIED.`,
  );
}

function exportNames(mod: Record<string, unknown>): string {
  return Object.keys(mod).filter((key) => key !== 'default').join(', ') || '(none)';
}

function requireFn(mod: Record<string, unknown>, names: readonly string[], specifier: string): (...args: never[]) => unknown {
  for (const name of names) {
    const candidate = mod[name];
    if (typeof candidate === 'function') return candidate as (...args: never[]) => unknown;
  }
  assert.fail(
    `${specifier} is present but none of [${names.join(', ')}] are functions. Exports: ${exportNames(mod)}. Not HOSTED. Not API_VERIFIED.`,
  );
}

function header(fn: unknown): string {
  return Function.prototype.toString.call(fn).slice(0, 280);
}

function acceptsInjectedTenant(fn: unknown): boolean {
  const source = Function.prototype.toString.call(fn);
  if (source.includes('[native code]')) return true;
  return /\bsession\b/.test(source) && (/\bdb\b/.test(source) || /\bprisma\b/.test(source) || /\breadDb\b/.test(source));
}

async function invokeQuery(
  fn: (...args: never[]) => unknown,
  input: {
    session: TrustedTenantSession | null;
    db: unknown;
    id?: string;
    accountId?: string;
    productId?: string;
    q?: string;
    take?: number;
  },
): Promise<unknown> {
  const source = header(fn);
  const payload = {
    session: input.session,
    db: input.db,
    prisma: input.db,
    readDb: input.db,
    id: input.id,
    accountId: input.accountId ?? input.id,
    productId: input.productId,
    conversationId: input.id,
    q: input.q,
    query: input.q,
    take: input.take ?? 20,
    limit: input.take ?? 20,
    callerOrganizationId: OTHER,
    organizationId: OTHER,
  };
  if (source.includes('{')) return fn(payload as never);
  if (/\(\s*db\b/.test(source) || source.includes('(db,')) {
    return fn(input.db as never, input.session as never, input.id as never);
  }
  return fn(input.session as never, input.db as never, input.id as never);
}

type ReadMode = 'allow' | 'wrong' | 'foreign' | 'missing' | 'empty' | 'where';

type ReadProbe = {
  surface: string;
  specifier: string;
  expected: string;
  allowScope: string;
  wrongScope: string;
  resolve: (mod: Record<string, unknown>) => (...args: never[]) => unknown;
  call: (
    fn: (...args: never[]) => unknown,
    input: { session: TrustedTenantSession | null; db: unknown; id?: string; q?: string; mode: ReadMode },
  ) => Promise<unknown>;
  evidence: (serialized: string) => boolean;
  sessionId: string;
  foreignId: string;
  missingId: string;
  idAddressable: boolean;
};

function proveRead(probe: ReadProbe): void {
  describe(probe.surface, () => {
    async function open(): Promise<(...args: never[]) => unknown> {
      const mod = await loadOwned(probe.specifier);
      if (mod === 'missing') missingModule(probe.specifier, probe.expected);
      const fn = probe.resolve(mod);
      if (!acceptsInjectedTenant(fn) && !header(fn).includes('organizationId') && !header(fn).includes('AUTH_REQUIRED')) {
        assert.fail(
          `${probe.specifier} is present but ${probe.expected} is not yet a tenant-scoped session+db export. Source head: ${header(fn)}. Not HOSTED. Not API_VERIFIED.`,
        );
      }
      return fn;
    }

    it(`${probe.surface} same tenant + correct capability is allowed`, async () => {
      const fn = await open();
      const rec = recording('mixed');
      const settled = await settle(() =>
        probe.call(fn, {
          session: session([probe.allowScope]),
          db: rec.db,
          id: probe.sessionId,
          q: SESSION_NAME.slice(0, 5),
          mode: 'allow',
        }),
      );
      assertNotCallShapeError(settled);
      assert.equal(settled.ok, true, settled.message ?? 'allowed call threw');
      assert.equal(denialCode(settled), null);
      assertOrganizationInWhere(rec.calls);
      const serialized = textOf(settled.value);
      assert.equal(probe.evidence(serialized), true, `missing session evidence in ${serialized.slice(0, 400)}`);
      assertNoForeign(serialized);
    });

    it(`${probe.surface} same tenant + wrong capability is denied and does not query`, async () => {
      const fn = await open();
      const rec = recording('mixed');
      const settled = await settle(() =>
        probe.call(fn, { session: session([probe.wrongScope]), db: rec.db, id: probe.sessionId, mode: 'wrong' }),
      );
      assertNotCallShapeError(settled);
      assert.equal(denialCode(settled), 'ROLE_FORBIDDEN');
      assert.equal(rec.calls.length, 0);
      assert.equal(mutationsOf(rec.calls).length, 0);
      assertNoForeign(`${textOf(settled.value)}${settled.message ?? ''}`);
    });

    it(`${probe.surface} foreign tenant + correct capability returns no foreign name, phone, lat, lng, price, count, or id`, async () => {
      const fn = await open();
      const rec = recording('mixed');
      const settled = await settle(() =>
        probe.call(fn, {
          session: session([probe.allowScope]),
          db: rec.db,
          id: probe.foreignId,
          q: OTHER_NAME,
          mode: 'foreign',
        }),
      );
      assertNotCallShapeError(settled);
      if (readsOf(rec.calls).length > 0) assertOrganizationInWhere(rec.calls);
      const serialized = `${textOf(settled.value)}${settled.message ?? ''}`;
      assertNoForeign(serialized);
      const count = countOf(settled.value);
      if (count !== undefined) assert.notEqual(count, OTHER_COUNT);
      if (probe.idAddressable) {
        const body = `${serialized}`;
        assert.equal(probe.evidence(body), false, 'foreign id returned session evidence');
        assert.equal(body.includes(probe.foreignId), false);
      }
    });

    it(`${probe.surface} no session is denied and does not query`, async () => {
      const fn = await open();
      const rec = recording('mixed');
      const settled = await settle(() =>
        probe.call(fn, { session: null, db: rec.db, id: probe.foreignId, q: OTHER_NAME, mode: 'missing' }),
      );
      assertNotCallShapeError(settled);
      assert.equal(denialCode(settled), 'AUTH_REQUIRED');
      assert.equal(rec.calls.length, 0);
      assertNoForeign(`${textOf(settled.value)}${settled.message ?? ''}`);
    });

    it(`${probe.surface} exact foreign id is the same as missing`, async () => {
      const fn = await open();
      const foreignRec = recording('mixed');
      const missingRec = recording('mixed');
      const foreign = await settle(() =>
        probe.call(fn, { session: session([probe.allowScope]), db: foreignRec.db, id: probe.foreignId, mode: 'foreign' }),
      );
      const missing = await settle(() =>
        probe.call(fn, { session: session([probe.allowScope]), db: missingRec.db, id: probe.missingId, mode: 'missing' }),
      );
      assertNotCallShapeError(foreign);
      assertNotCallShapeError(missing);
      assert.equal(comparable(foreign), comparable(missing));
      if (probe.idAddressable) {
        const foreignBody = `${textOf(foreign.value)}${foreign.message ?? ''}`;
        const missingBody = `${textOf(missing.value)}${missing.message ?? ''}`;
        assert.equal(probe.evidence(foreignBody), false);
        assert.equal(probe.evidence(missingBody), false);
      }
      assertNoForeign(`${textOf(foreign.value)}${foreign.message ?? ''}`);
      assertNoForeign(`${textOf(missing.value)}${missing.message ?? ''}`);
      if (readsOf(foreignRec.calls).length > 0) assertOrganizationInWhere(foreignRec.calls);
      if (readsOf(missingRec.calls).length > 0) assertOrganizationInWhere(missingRec.calls);
    });

    it(`${probe.surface} aggregate or count for an empty tenant is 0, not the other tenant number`, async () => {
      const fn = await open();
      const rec = recording('foreign-only');
      const settled = await settle(() =>
        probe.call(fn, { session: session([probe.allowScope]), db: rec.db, id: probe.missingId, mode: 'empty' }),
      );
      assertNotCallShapeError(settled);
      if (readsOf(rec.calls).length > 0) assertOrganizationInWhere(rec.calls);
      const serialized = `${textOf(settled.value)}${settled.message ?? ''}`;
      assertNoForeign(serialized);
      const count = countOf(settled.value);
      if (count !== undefined) {
        assert.equal(count, 0);
        assert.notEqual(count, OTHER_COUNT);
      }
      const numbers = numbersIn(settled.value);
      assert.equal(numbers.includes(OTHER_COUNT), false, `empty tenant surfaced other-tenant count ${OTHER_COUNT}`);
      assert.equal(numbers.includes(OTHER_PRICE), false, `empty tenant surfaced other-tenant price ${OTHER_PRICE}`);
    });

    it(`${probe.surface} recorded where clauses include organizationId`, async () => {
      const fn = await open();
      const rec = recording('mixed');
      const settled = await settle(() =>
        probe.call(fn, { session: session([probe.allowScope]), db: rec.db, id: probe.sessionId, q: 'Alpha', mode: 'where' }),
      );
      assertNotCallShapeError(settled);
      assert.equal(denialCode(settled), null);
      assertOrganizationInWhere(rec.calls);
    });
  });
}

async function timelineReader(
  prisma: {
    account: { findFirst: (args: { where: { id: string; organizationId: string } }) => Promise<{ id: string } | null> };
    activityEvent: { findMany: (args: { where: { accountId: string; organizationId: string }; take: number }) => Promise<Array<Record<string, unknown>>> };
  },
  accountId: string,
  opts: { session?: { organizationId?: string } },
) {
  const organizationId = opts.session?.organizationId ?? '';
  if (!organizationId) return { items: [], code: 'AUTH_REQUIRED' as const, count: 0 };
  const account = await prisma.account.findFirst({ where: { id: accountId, organizationId } });
  if (!account) return { items: [], code: null, count: 0 };
  const rows = await prisma.activityEvent.findMany({ where: { accountId: account.id, organizationId }, take: 40 });
  return {
    items: rows.map((row) => ({
      id: String(row.id),
      type: String(row.type ?? 'quote.created'),
      canonicalType: String(row.type ?? 'quote.created'),
      family: 'commercial',
      title: String(row.title ?? ''),
      body: row.body == null ? null : String(row.body),
      occurredAt: row.occurredAt instanceof Date ? row.occurredAt.toISOString() : String(row.occurredAt ?? ''),
      payload: null,
    })),
    code: null,
    count: rows.length,
  };
}

function serviceMethod(
  mod: Record<string, unknown>,
  className: string,
  method: string,
  specifier: string,
): (...args: never[]) => unknown {
  const Ctor = mod[className];
  if (typeof Ctor !== 'function') {
    assert.fail(`${specifier} is present but ${className} is not exported. Exports: ${exportNames(mod)}. Not HOSTED. Not API_VERIFIED.`);
  }
  const unbound = (Ctor as { prototype?: Record<string, unknown> }).prototype?.[method];
  if (typeof unbound !== 'function') {
    assert.fail(`${specifier} ${className}.${method} is not a function. Not HOSTED. Not API_VERIFIED.`);
  }
  if (!acceptsInjectedTenant(unbound) || Function.prototype.toString.call(unbound).includes('[native code]')) {
    assert.fail(
      `${specifier} is present but ${className}.${method} is not yet a tenant-scoped session+db export. Source head: ${header(unbound)}. Not HOSTED. Not API_VERIFIED.`,
    );
  }
  const instance = new (Ctor as new (providers?: unknown) => Record<string, unknown>)({});
  return (unbound as (...args: never[]) => unknown).bind(instance);
}

describe('trusted session adversarial boundary', () => {
  it('ignores query and body organizationId and keeps the authenticated session org', () => {
    const trusted = sessionFromAuthenticatedRequest({
      authenticatedSession: {
        authenticated: true,
        organizationId: SESSION,
        grantedScopes: [READ],
      },
      query: { organizationId: OTHER },
      body: { organizationId: OTHER },
    });
    assert.equal(trusted?.organizationId, SESSION);
    assert.notEqual(trusted?.organizationId, OTHER);
    assert.equal(holdsExactScope(trusted?.grantedScopes, READ), true);
    assert.equal(holdsExactScope(trusted?.grantedScopes, 'visit.create'), false);
  });

  it('denies a session that is not marked authenticated even when the body claims the other tenant', () => {
    const trusted = sessionFromAuthenticatedRequest({
      authenticatedSession: {
        authenticated: false,
        organizationId: OTHER,
        grantedScopes: [READ, 'people.admin', PULSE_READ],
      },
      query: { organizationId: OTHER },
      body: { organizationId: SESSION },
    });
    assert.equal(trusted, null);
    assert.equal(sessionFromAuthenticatedRequest(undefined), null);
    assert.equal(sessionFromAuthenticatedRequest({}), null);
  });

  it('denies an empty organization and does not treat whitespace as a tenant', () => {
    assert.equal(trustedOrganizationId(null), null);
    assert.equal(trustedOrganizationId(undefined), null);
    assert.equal(trustedOrganizationId({ organizationId: '   ' }), null);
    assert.equal(trustedOrganizationId({ organizationId: SESSION }), SESSION);
    assert.equal(
      sessionFromAuthenticatedRequest({
        authenticatedSession: {
          authenticated: true,
          organizationId: '   ',
          grantedScopes: [READ],
        },
        query: { organizationId: OTHER },
      }),
      null,
    );
  });

  it('holdsExactScope matches commercial.team.read only as that token, not a visit write', () => {
    assert.equal(holdsExactScope([READ], READ), true);
    assert.equal(holdsExactScope([' commercial.team.read '], READ), true);
    assert.equal(holdsExactScope(['commercial.team'], READ), false);
    assert.equal(holdsExactScope(['commercial.team.read.extra'], READ), false);
    assert.equal(holdsExactScope([READ], 'visit.create'), false);
    assert.equal(holdsExactScope([READ, WRONG, PULSE_READ, PRODUCT_READ], 'visit.create'), false);
    assert.equal(holdsExactScope([WRONG], READ), false);
    assert.equal(holdsExactScope([PULSE_READ], READ), false);
  });

  it('rejects a non-string scope list and does not adopt a client organizationId', () => {
    const trusted = sessionFromAuthenticatedRequest({
      authenticatedSession: {
        authenticated: true,
        organizationId: SESSION,
        grantedScopes: [READ, 7],
      },
      query: { organizationId: OTHER },
      body: { organizationId: OTHER },
    });
    assert.equal(trusted, null);
  });
});

describe('Gate A query and service adversarial imports', () => {
  proveRead({
    surface: 'territorio points',
    specifier: TERRITORIO,
    expected: 'listTerritoryPoints({ session, db })',
    allowScope: READ,
    wrongScope: WRONG,
    resolve: (mod) => requireFn(mod, ['listTerritoryPoints'], TERRITORIO),
    call: (fn, input) => invokeQuery(fn, { ...input, take: 20 }),
    evidence: (serialized) => serialized.includes(SESSION_NAME) || serialized.includes(SESSION_ID),
    sessionId: SESSION_ID,
    foreignId: FOREIGN_ID,
    missingId: MISSING_ID,
    idAddressable: false,
  });

  proveRead({
    surface: 'conversations list',
    specifier: CONVERSATIONS,
    expected: 'listConversations({ session, db })',
    allowScope: READ,
    wrongScope: WRONG,
    resolve: (mod) => requireFn(mod, ['listConversations'], CONVERSATIONS),
    call: (fn, input) => invokeQuery(fn, { ...input, q: input.q ?? OTHER_PHONE, take: 20 }),
    evidence: (serialized) => serialized.includes(SESSION_NAME) || serialized.includes(SESSION_CONVERSATION),
    sessionId: SESSION_CONVERSATION,
    foreignId: FOREIGN_CONVERSATION,
    missingId: 'conv-missing',
    idAddressable: false,
  });

  proveRead({
    surface: 'conversations one',
    specifier: CONVERSATIONS,
    expected: 'readConversation({ id, session, db })',
    allowScope: READ,
    wrongScope: WRONG,
    resolve: (mod) => requireFn(mod, ['readConversation'], CONVERSATIONS),
    call: (fn, input) => invokeQuery(fn, { ...input, id: input.id ?? SESSION_CONVERSATION }),
    evidence: (serialized) => serialized.includes(SESSION_NAME) || serialized.includes(SESSION_CONVERSATION),
    sessionId: SESSION_CONVERSATION,
    foreignId: FOREIGN_CONVERSATION,
    missingId: 'conv-missing',
    idAddressable: true,
  });

  proveRead({
    surface: 'radar items',
    specifier: RADAR,
    expected: 'listRadarItems({ session, db })',
    allowScope: READ,
    wrongScope: PULSE_READ,
    resolve: (mod) => requireFn(mod, ['listRadarItems'], RADAR),
    call: (fn, input) => invokeQuery(fn, { ...input, take: 30 }),
    evidence: (serialized) => serialized.includes(SESSION_NAME) || serialized.includes('attn-alpha'),
    sessionId: 'attn-alpha',
    foreignId: 'attn-zeta',
    missingId: 'attn-missing',
    idAddressable: false,
  });

  proveRead({
    surface: 'pulse',
    specifier: PULSE,
    expected: 'readPulse({ session, db }) scoped by management.org.read',
    allowScope: PULSE_READ,
    wrongScope: READ,
    resolve: (mod) => requireFn(mod, ['readPulse'], PULSE),
    call: (fn, input) => invokeQuery(fn, input),
    evidence: (serialized) =>
      serialized.includes(SESSION_NAME) || serialized.includes('111') || serialized.includes(String(SESSION_PRICE)),
    sessionId: SESSION_ID,
    foreignId: FOREIGN_ID,
    missingId: MISSING_ID,
    idAddressable: false,
  });

  proveRead({
    surface: 'AccountsService.list',
    specifier: ACCOUNTS,
    expected: 'AccountsService.list(session, params, db)',
    allowScope: READ,
    wrongScope: PRODUCT_READ,
    resolve: (mod) => serviceMethod(mod, 'AccountsService', 'list', ACCOUNTS),
    call: (fn, input) =>
      fn(input.session as never, { q: input.q, take: 20 } as never, input.db as never),
    evidence: (serialized) => serialized.includes(SESSION_NAME) || serialized.includes(SESSION_ID),
    sessionId: SESSION_ID,
    foreignId: FOREIGN_ID,
    missingId: MISSING_ID,
    idAddressable: false,
  });

  proveRead({
    surface: 'AccountsService.dossier',
    specifier: ACCOUNTS,
    expected: 'AccountsService.dossier(session, id, db)',
    allowScope: READ,
    wrongScope: WRONG,
    resolve: (mod) => serviceMethod(mod, 'AccountsService', 'dossier', ACCOUNTS),
    call: (fn, input) => fn(input.session as never, (input.id ?? SESSION_ID) as never, input.db as never),
    evidence: (serialized) => serialized.includes(SESSION_NAME) && serialized.includes(String(SESSION_LAT)),
    sessionId: SESSION_ID,
    foreignId: FOREIGN_ID,
    missingId: MISSING_ID,
    idAddressable: true,
  });

  proveRead({
    surface: 'AccountsService.timeline',
    specifier: ACCOUNTS,
    expected: 'AccountsService.timeline(session, id, db)',
    allowScope: READ,
    wrongScope: WRONG,
    resolve: (mod) => serviceMethod(mod, 'AccountsService', 'timeline', ACCOUNTS),
    call: (fn, input) =>
      fn(
        input.session as never,
        (input.id ?? SESSION_ID) as never,
        input.db as never,
        timelineReader as never,
      ),
    evidence: (serialized) => serialized.includes(SESSION_NAME) || serialized.includes('evt-alpha'),
    sessionId: SESSION_ID,
    foreignId: FOREIGN_ID,
    missingId: MISSING_ID,
    idAddressable: true,
  });

  proveRead({
    surface: 'CommerceService.lastPrice',
    specifier: COMMERCE,
    expected: 'CommerceService.lastPrice(accountId, productId, session, db)',
    allowScope: READ,
    wrongScope: PRODUCT_READ,
    resolve: (mod) => serviceMethod(mod, 'CommerceService', 'lastPrice', COMMERCE),
    call: (fn, input) => {
      const foreign = input.mode === 'foreign';
      const missing = input.mode === 'missing' || input.mode === 'empty';
      return fn(
        (foreign ? FOREIGN_ID : missing ? MISSING_ID : SESSION_ID) as never,
        (foreign ? FOREIGN_PRODUCT : missing ? 'prod-missing' : SESSION_PRODUCT) as never,
        input.session as never,
        input.db as never,
      );
    },
    evidence: (serialized) => serialized.includes('SKU-ALPHA') || serialized.includes(String(SESSION_PRICE)) || serialized.includes(SESSION_NAME),
    sessionId: SESSION_ID,
    foreignId: FOREIGN_ID,
    missingId: MISSING_ID,
    idAddressable: true,
  });

  proveRead({
    surface: 'CommerceService.getQuote',
    specifier: COMMERCE,
    expected: 'CommerceService.getQuote(id, session, db)',
    allowScope: READ,
    wrongScope: PRODUCT_READ,
    resolve: (mod) => serviceMethod(mod, 'CommerceService', 'getQuote', COMMERCE),
    call: (fn, input) => fn((input.id ?? SESSION_QUOTE) as never, input.session as never, input.db as never),
    evidence: (serialized) => serialized.includes(SESSION_NAME) || serialized.includes('COT-ALPHA') || serialized.includes(SESSION_QUOTE),
    sessionId: SESSION_QUOTE,
    foreignId: FOREIGN_QUOTE,
    missingId: 'quote-missing',
    idAddressable: true,
  });

  proveRead({
    surface: 'CommerceService.getInvoice',
    specifier: COMMERCE,
    expected: 'CommerceService.getInvoice(id, session, db)',
    allowScope: READ,
    wrongScope: PRODUCT_READ,
    resolve: (mod) => serviceMethod(mod, 'CommerceService', 'getInvoice', COMMERCE),
    call: (fn, input) => fn((input.id ?? SESSION_INVOICE) as never, input.session as never, input.db as never),
    evidence: (serialized) => serialized.includes(SESSION_NAME) || serialized.includes(SESSION_INVOICE),
    sessionId: SESSION_INVOICE,
    foreignId: FOREIGN_INVOICE,
    missingId: 'inv-missing',
    idAddressable: true,
  });

  describe('visit check-in authority', () => {
    async function openVisits(): Promise<Record<string, unknown>> {
      const mod = await loadOwned(VISITS);
      if (mod === 'missing') {
        missingModule(VISITS, 'assertVisitTargetInTenant and VISIT_CHECK_IN_AUTHORITY');
      }
      return mod;
    }

    it('VISIT_CHECK_IN_AUTHORITY is CROSS_LANE_CHANGE_REQUEST', async () => {
      const mod = await openVisits();
      assert.equal(mod.VISIT_CHECK_IN_AUTHORITY, 'CROSS_LANE_CHANGE_REQUEST');
      assert.notEqual(mod.VISIT_CHECK_IN_AUTHORITY, READ);
      assert.notEqual(mod.VISIT_CHECK_IN_AUTHORITY, 'visit.create');
    });

    it('commercial.team.read does not cause visit.create', async () => {
      const mod = await openVisits();
      const prepare = requireFn(mod, ['prepareVisitCheckIn'], VISITS);
      const rec = recording('mixed');
      const settled = await settle(() =>
        invokeQuery(prepare, {
          session: session([READ, WRONG, PULSE_READ]),
          db: rec.db,
          id: SESSION_ID,
          accountId: SESSION_ID,
        }),
      );
      assertNotCallShapeError(settled);
      const code = denialCode(settled);
      const allowed =
        settled.value && typeof settled.value === 'object' && (settled.value as { allowed?: unknown }).allowed === true;
      assert.equal(allowed, false);
      assert.equal(code === 'ROLE_FORBIDDEN' || allowed === false, true);
      assert.equal(code, 'ROLE_FORBIDDEN');
      assert.equal(mutationsOf(rec.calls, 'create').filter((call) => call.model === 'visit').length, 0);
      assert.equal(callsNamed(rec.calls, 'visit', 'create'), 0);
      assertNoForeign(`${textOf(settled.value)}${settled.message ?? ''}`);
    });

    it('assertVisitTargetInTenant same tenant is allowed and where includes organizationId', async () => {
      const mod = await openVisits();
      const lookup = requireFn(mod, ['assertVisitTargetInTenant'], VISITS);
      const rec = recording('mixed');
      const settled = await settle(() => lookup(rec.db as never, SESSION_ID as never, SESSION as never));
      assertNotCallShapeError(settled);
      assert.equal(settled.ok, true, settled.message ?? 'lookup threw');
      const found = settled.value as { id?: string; organizationId?: string } | null;
      assert.equal(found?.id, SESSION_ID);
      assert.equal(found?.organizationId, SESSION);
      assertOrganizationInWhere(rec.calls);
      assertNoForeign(textOf(found));
    });

    it('assertVisitTargetInTenant same tenant wrong write capability is not this lookup; commercial.team.read still cannot create', async () => {
      const mod = await openVisits();
      const prepare = requireFn(mod, ['prepareVisitCheckIn'], VISITS);
      const rec = recording('mixed');
      const settled = await settle(() =>
        invokeQuery(prepare, { session: session([READ]), db: rec.db, accountId: SESSION_ID, id: SESSION_ID }),
      );
      assertNotCallShapeError(settled);
      assert.equal(denialCode(settled), 'ROLE_FORBIDDEN');
      assert.equal(callsNamed(rec.calls, 'visit', 'create'), 0);
      assert.equal(callsNamed(rec.calls, 'account', 'update'), 0);
    });

    it('visit check-in with no session is denied and does not create', async () => {
      const mod = await openVisits();
      const prepare = requireFn(mod, ['prepareVisitCheckIn'], VISITS);
      const rec = recording('mixed');
      const settled = await settle(() =>
        invokeQuery(prepare, { session: null, db: rec.db, accountId: FOREIGN_ID, id: FOREIGN_ID }),
      );
      assertNotCallShapeError(settled);
      assert.equal(denialCode(settled), 'AUTH_REQUIRED');
      assert.equal(rec.calls.length, 0);
      assert.equal(callsNamed(rec.calls, 'visit', 'create'), 0);
      assertNoForeign(`${textOf(settled.value)}${settled.message ?? ''}`);
    });

    it('assertVisitTargetInTenant foreign id is the same as missing and returns no foreign fields', async () => {
      const mod = await openVisits();
      const lookup = requireFn(mod, ['assertVisitTargetInTenant'], VISITS);
      const foreignRec = recording('mixed');
      const missingRec = recording('mixed');
      const foreign = await settle(() => lookup(foreignRec.db as never, FOREIGN_ID as never, SESSION as never));
      const missing = await settle(() => lookup(missingRec.db as never, MISSING_ID as never, SESSION as never));
      assertNotCallShapeError(foreign);
      assertNotCallShapeError(missing);
      assert.equal(foreign.value, null);
      assert.equal(missing.value, null);
      assert.equal(comparable(foreign), comparable(missing));
      assertOrganizationInWhere(foreignRec.calls);
      assertOrganizationInWhere(missingRec.calls);
      assertNoForeign(`${textOf(foreign.value)}${foreign.message ?? ''}`);
    });

    it('visit lookup count for an empty tenant is not the other tenant number', async () => {
      const mod = await openVisits();
      const lookup = requireFn(mod, ['assertVisitTargetInTenant'], VISITS);
      const rec = recording('foreign-only');
      const settled = await settle(() => lookup(rec.db as never, SESSION_ID as never, SESSION as never));
      assertNotCallShapeError(settled);
      assert.equal(settled.value, null);
      assertOrganizationInWhere(rec.calls);
      assert.equal(callsNamed(rec.calls, 'visit', 'create'), 0);
      assert.notEqual(readsOf(rec.calls).length, OTHER_COUNT);
      assertNoForeign(textOf(settled.value));
    });

    it('assertVisitTargetInTenant recorded where includes organizationId and the account id', async () => {
      const mod = await openVisits();
      const lookup = requireFn(mod, ['assertVisitTargetInTenant'], VISITS);
      const rec = recording('mixed');
      await lookup(rec.db as never, SESSION_ID as never, SESSION as never);
      assertOrganizationInWhere(rec.calls);
      const blob = JSON.stringify(rec.calls[0]?.args ?? {});
      assert.equal(blob.includes(SESSION_ID), true, blob);
      assert.equal(blob.includes(OTHER), false, blob);
    });
  });
});

function callsNamed(calls: Call[], model: string, method: string): number {
  return calls.filter((call) => call.model === model && call.method === method).length;
}
