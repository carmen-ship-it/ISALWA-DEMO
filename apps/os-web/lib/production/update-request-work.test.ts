import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  PRODUCTION_UPDATE_REQUEST_COPY,
  buildProductionUpdateRequestWork,
  findOpenProductionUpdateRequest,
  parseProductionUpdateMarker,
  productionUpdateMarker,
} from './update-request-work';

describe('production update request work', () => {
  it('builds CreateWorkItem payload with marker and canonical assignee when known', () => {
    const result = buildProductionUpdateRequestWork({
      orderId: 'order-1',
      partyId: 'party-1',
      actorMemberId: 'actor-1',
      productionOwnerMemberId: 'prod-owner',
      orderLabel: 'O-100',
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.command, 'CreateWorkItem');
    assert.equal(result.needsCanonicalAssignee, false);
    assert.equal(result.payload.ownerMemberId, 'prod-owner');
    assert.equal(result.payload.subjectType, 'party');
    assert.equal(result.payload.subjectId, 'party-1');
    assert.match(String(result.payload.description), /\[\[production-update:order-1\]\]/);
    assert.match(String(result.payload.title), /O-100/);
  });

  it('falls back to actor when production owner is unknown without inventing a plant owner', () => {
    const result = buildProductionUpdateRequestWork({
      orderId: 'order-2',
      partyId: 'party-2',
      actorMemberId: 'actor-2',
      productionOwnerMemberId: null,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.needsCanonicalAssignee, true);
    assert.equal(result.payload.ownerMemberId, 'actor-2');
  });

  it('rejects missing ids', () => {
    assert.equal(
      buildProductionUpdateRequestWork({
        orderId: '',
        partyId: 'p',
        actorMemberId: 'a',
      }).ok,
      false,
    );
  });

  it('parses and finds open update requests idempotently', () => {
    assert.deepEqual(parseProductionUpdateMarker(productionUpdateMarker('ord-9')), {
      orderId: 'ord-9',
    });
    const open = findOpenProductionUpdateRequest(
      [
        {
          workItemId: 'w-closed',
          title: PRODUCTION_UPDATE_REQUEST_COPY.title,
          description: productionUpdateMarker('ord-9'),
          status: 'completed',
        },
        {
          workItemId: 'w-open',
          title: PRODUCTION_UPDATE_REQUEST_COPY.title,
          description: `ctx\n${productionUpdateMarker('ord-9')}`,
          status: 'open',
        },
      ],
      'ord-9',
    );
    assert.deepEqual(open, { workItemId: 'w-open', title: PRODUCTION_UPDATE_REQUEST_COPY.title });
    assert.equal(
      findOpenProductionUpdateRequest(
        [
          {
            workItemId: 'w-other',
            title: 'x',
            description: productionUpdateMarker('other'),
            status: 'open',
          },
        ],
        'ord-9',
      ),
      null,
    );
  });
});
