import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { InMemoryPurchaseRequestStore } from './in-memory-store';
import {
  PURCHASE_REQUEST_LIVE_WRITE_PROOF,
  PURCHASE_REQUEST_STATUS_CHANGED,
  PURCHASE_REQUEST_TRANSITION_CAPABILITY,
  purchaseRequestTargetMatchesSession,
  purchasingOperationalRecordAuthorizesUniversalRead,
  transitionPurchaseRequest,
} from './transition';
import type { PurchaseRequestSession } from '../../os-contracts/src/purchase-request';

const SESSION = 'org-session-alpha';
const OTHER = 'org-other-zeta';
const FOREIGN_TEXT = 'ZetaOtherPurchaseSecret';
const requestedAt = '2026-09-14T14:00:00.000Z';
const createdAt = '2026-09-14T14:05:00.000Z';
const later = '2026-09-14T16:00:00.000Z';

function session(scopes: readonly string[], organizationId: string | null = SESSION): PurchaseRequestSession {
  return { organizationId, role: 'Auxiliar', grantedScopes: scopes };
}

function buyerSession(): PurchaseRequestSession {
  return session([PURCHASE_REQUEST_TRANSITION_CAPABILITY]);
}

function seed() {
  const store = new InMemoryPurchaseRequestStore();
  const own = store.create({
    id: 'pr-alpha',
    organizationId: SESSION,
    requestingArea: 'Producción',
    requestedByLabel: 'Ana del área',
    description: 'Tinta negra para etiquetas',
    reason: 'El área la pidió',
    requestedAt,
    statusEntryId: 'hist-alpha',
    actorLabel: 'Ana del área',
    createdAt,
  });
  const foreign = store.create({
    id: 'pr-zeta',
    organizationId: OTHER,
    requestingArea: 'Planta norte',
    requestedByLabel: 'Beatriz ajena',
    description: FOREIGN_TEXT,
    reason: 'Pedido ajeno',
    requestedAt,
    statusEntryId: 'hist-zeta',
    actorLabel: 'Beatriz ajena',
    createdAt,
  });
  assert.equal(own.ok, true);
  assert.equal(foreign.ok, true);
  return store;
}

function change() {
  return {
    status: 'cotizandose',
    at: later,
    actorLabel: 'Encargada de compras',
    statusEntryId: 'hist-next',
  };
}

function assertNoForeign(serialized: string): void {
  assert.equal(serialized.includes(OTHER), false);
  assert.equal(serialized.includes(FOREIGN_TEXT), false);
  assert.equal(serialized.includes('pr-zeta'), false);
  assert.equal(serialized.includes('Beatriz'), false);
  assert.equal(serialized.includes('Zeta'), false);
}

describe('purchase request transition tenant target', () => {
  it('same tenant + purchasing.operational.record transitions and emits one success event', () => {
    const store = seed();
    const result = store.transition(buyerSession(), 'pr-alpha', change());
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.liveWrite, 'UNPROVEN');
    assert.equal(result.event.kind, PURCHASE_REQUEST_STATUS_CHANGED);
    assert.equal(result.event.organizationId, SESSION);
    assert.equal(result.event.requestId, 'pr-alpha');
    assert.equal(result.event.toStatus, 'cotizandose');
    assert.equal(result.request.status, 'cotizandose');
    assert.equal(result.request.statusHistory.length, 2);
    assert.equal(store.get(SESSION, 'pr-alpha')?.status, 'cotizandose');
    assert.equal(store.get(OTHER, 'pr-zeta')?.status, 'solicitado');
    assertNoForeign(JSON.stringify(result));
  });

  it('foreign id is the same as missing: no mutation, no success event, no existence leak', () => {
    const store = seed();
    const before = store.get(OTHER, 'pr-zeta');
    assert.ok(before);
    const foreign = store.transition(buyerSession(), 'pr-zeta', change());
    const missing = store.transition(buyerSession(), 'pr-missing', change());
    assert.equal(foreign.ok, false);
    assert.equal(missing.ok, false);
    if (foreign.ok || missing.ok) return;
    assert.equal(foreign.reason, 'not_found');
    assert.equal(missing.reason, 'not_found');
    assert.equal(foreign.event, null);
    assert.equal(missing.event, null);
    assert.equal('request' in foreign, false);
    assert.equal('request' in missing, false);
    assert.deepEqual(
      { ok: foreign.ok, reason: foreign.reason, event: foreign.event },
      { ok: missing.ok, reason: missing.reason, event: missing.event },
    );
    assert.equal(store.get(OTHER, 'pr-zeta')?.status, 'solicitado');
    assert.equal(store.get(OTHER, 'pr-zeta')?.statusHistory.length, before.statusHistory.length);
    assert.equal(store.get(SESSION, 'pr-alpha')?.status, 'solicitado');
    assertNoForeign(JSON.stringify(foreign));
    assertNoForeign(JSON.stringify(missing));
  });

  it('claimed foreign organization is denied before lookup and does not mutate', () => {
    const store = seed();
    const denied = store.transition(buyerSession(), 'pr-zeta', change(), OTHER);
    const alsoMissing = store.transition(buyerSession(), 'pr-missing', change(), OTHER);
    assert.equal(denied.ok, false);
    assert.equal(alsoMissing.ok, false);
    if (denied.ok || alsoMissing.ok) return;
    assert.equal(denied.reason, 'cross_tenant');
    assert.equal(alsoMissing.reason, 'cross_tenant');
    assert.equal(denied.event, null);
    assert.equal(store.get(OTHER, 'pr-zeta')?.status, 'solicitado');
    assertNoForeign(JSON.stringify(denied));
  });

  it('does not grant the mutation from Auxiliar, buyer role, or operations.coordinator.record', () => {
    const store = seed();
    const holders = [
      session([]),
      session(['operations.coordinator.record']),
      { organizationId: SESSION, role: 'buyer', grantedScopes: [] },
      { organizationId: SESSION, role: 'Auxiliar', grantedScopes: ['operations.coordinator.record'] },
      session(['purchasing.operational']),
      session(['purchasing.operational.record.extra']),
    ];
    for (const actor of holders) {
      const denied = store.transition(actor, 'pr-alpha', change());
      assert.equal(denied.ok, false);
      if (!denied.ok) {
        assert.equal(denied.reason, 'unauthorized_role');
        assert.equal(denied.event, null);
      }
      assert.equal(store.get(SESSION, 'pr-alpha')?.status, 'solicitado');
    }
  });

  it('missing session is denied and does not mutate', () => {
    const store = seed();
    const denied = store.transition(null, 'pr-alpha', change());
    assert.equal(denied.ok, false);
    if (!denied.ok) assert.equal(denied.reason, 'session_org_required');
    assert.equal(denied.event, null);
    assert.equal(store.get(SESSION, 'pr-alpha')?.status, 'solicitado');
    assertNoForeign(JSON.stringify(denied));
  });

  it('does not treat purchasing.operational.record as a universal read', () => {
    assert.equal(purchasingOperationalRecordAuthorizesUniversalRead(), false);
    assert.equal(PURCHASE_REQUEST_TRANSITION_CAPABILITY, 'purchasing.operational.record');
    const store = seed();
    const result = store.transition(buyerSession(), 'pr-alpha', change());
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(JSON.stringify(result).includes(FOREIGN_TEXT), false);
    assert.equal(Object.hasOwn(result, 'requests'), false);
    assert.equal(Object.hasOwn(result, 'count'), false);
  });

  it('refuses a loaded foreign request before changePurchaseRequestStatus', () => {
    const store = seed();
    const foreign = store.get(OTHER, 'pr-zeta');
    assert.ok(foreign);
    const denied = transitionPurchaseRequest({
      session: buyerSession(),
      request: foreign,
      change: change(),
    });
    assert.equal(denied.ok, false);
    if (!denied.ok) assert.equal(denied.reason, 'not_found');
    assert.equal(denied.event, null);
    assert.equal(foreign.status, 'solicitado');
    assert.equal(foreign.statusHistory.length, 1);
    assertNoForeign(JSON.stringify(denied));
    assert.equal(purchaseRequestTargetMatchesSession(SESSION, OTHER), false);
    assert.equal(purchaseRequestTargetMatchesSession(SESSION, SESSION), true);
    assert.equal(purchaseRequestTargetMatchesSession(null, SESSION), false);
  });

  it('marks live writes UNPROVEN and does not invent a Prisma writer', () => {
    assert.equal(PURCHASE_REQUEST_LIVE_WRITE_PROOF, 'UNPROVEN');
    const here = dirname(fileURLToPath(import.meta.url));
    const transition = readFileSync(join(here, 'transition.ts'), 'utf8');
    const store = readFileSync(join(here, 'in-memory-store.ts'), 'utf8');
    assert.doesNotMatch(transition, /@prisma\/client|PrismaClient/);
    assert.doesNotMatch(store, /@prisma\/client|PrismaClient/);
    assert.match(transition, /UNPROVEN/);
  });
});
