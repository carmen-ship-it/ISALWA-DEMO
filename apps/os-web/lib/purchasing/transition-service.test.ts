import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createPurchaseRequest,
  PURCHASING_OPERATIONAL_RECORD_SCOPE,
  type PurchaseRequest,
  type PurchaseRequestSession,
} from '@isalwa/os-contracts';
import { PURCHASE_REQUEST_LIVE_WRITE_PROOF } from '@isalwa/os-purchasing';
import {
  applyPurchaseRequestStatusChange,
  findTenantPurchaseRequest,
} from './transition-service';

const ORG = 'org-compras-a';
const OTHER = 'org-compras-b';
const requestedAt = '2026-09-14T14:00:00.000Z';
const createdAt = '2026-09-14T14:05:00.000Z';
const later = '2026-09-14T16:00:00.000Z';

function session(scopes: readonly string[], organizationId = ORG): PurchaseRequestSession {
  return { organizationId, role: null, grantedScopes: scopes };
}

function seed(id: string, organizationId: string, description: string): PurchaseRequest {
  const created = createPurchaseRequest({
    id,
    organizationId,
    requestingArea: 'Producción',
    requestedByLabel: 'Ana del área',
    description,
    reason: 'El área la pidió',
    requestedAt,
    statusEntryId: `hist-${id}`,
    createdAt,
  });
  assert.equal(created.ok, true);
  if (!created.ok) throw new Error('seed failed');
  return created.request;
}

describe('Compras transition service', () => {
  it('advances a same-tenant request and keeps liveWrite UNPROVEN', () => {
    const own = seed('pr-1', ORG, 'Tinta');
    const foreign = seed('pr-x', OTHER, 'Secreto ajeno');
    const advanced = applyPurchaseRequestStatusChange({
      session: session([PURCHASING_OPERATIONAL_RECORD_SCOPE]),
      requests: [own, foreign],
      requestId: 'pr-1',
      status: 'cotizandose',
      at: later,
      actorLabel: 'Encargada de compras',
      actorMemberId: 'mem-buyer',
      statusEntryId: 'hist-2',
      buyerLabel: 'Encargada de compras',
    });
    assert.equal(advanced.ok, true);
    if (!advanced.ok) return;
    assert.equal(advanced.request.status, 'cotizandose');
    assert.equal(advanced.liveWrite, PURCHASE_REQUEST_LIVE_WRITE_PROOF);
    assert.equal(advanced.request.statusHistory.length, 2);
    assert.equal(findTenantPurchaseRequest([foreign], ORG, 'pr-x'), null);
  });

  it('stops with cancelled and denies cross-tenant or missing record scope', () => {
    const own = seed('pr-2', ORG, 'Caja');
    const stopped = applyPurchaseRequestStatusChange({
      session: session([PURCHASING_OPERATIONAL_RECORD_SCOPE]),
      requests: [own],
      requestId: 'pr-2',
      status: 'cancelled',
      at: later,
      actorLabel: 'Encargada de compras',
      statusEntryId: 'hist-stop',
      note: 'Detenido',
    });
    assert.equal(stopped.ok, true);
    if (!stopped.ok) return;
    assert.equal(stopped.request.status, 'cancelled');

    const deniedRole = applyPurchaseRequestStatusChange({
      session: session([]),
      requests: [own],
      requestId: 'pr-2',
      status: 'cotizandose',
      at: later,
      actorLabel: 'Sin alcance',
      statusEntryId: 'hist-deny',
    });
    assert.equal(deniedRole.ok, false);
    if (!deniedRole.ok) assert.equal(deniedRole.reason, 'unauthorized_role');

    const foreign = seed('pr-foreign', OTHER, 'Ajeno');
    const crossed = applyPurchaseRequestStatusChange({
      session: session([PURCHASING_OPERATIONAL_RECORD_SCOPE]),
      requests: [foreign],
      requestId: 'pr-foreign',
      status: 'cancelled',
      at: later,
      actorLabel: 'Encargada',
      statusEntryId: 'hist-cross',
    });
    assert.equal(crossed.ok, false);
    if (!crossed.ok) assert.equal(crossed.reason, 'not_found');
  });

  it('does not invent OC or stock fields on advance', () => {
    const own = seed('pr-3', ORG, 'Etiqueta');
    const advanced = applyPurchaseRequestStatusChange({
      session: session([PURCHASING_OPERATIONAL_RECORD_SCOPE]),
      requests: [own],
      requestId: 'pr-3',
      status: 'cotizandose',
      at: later,
      actorLabel: 'Encargada',
      statusEntryId: 'hist-3',
    });
    assert.equal(advanced.ok, true);
    if (!advanced.ok) return;
    assert.equal(advanced.request.claimsOfficialStock, false);
    assert.equal(advanced.request.triggersReorder, false);
    assert.equal('poNumber' in advanced.request, false);
  });
});
