import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildMapHoverSnapshot } from './hover-model';
import type { MapCustomerRow } from './build-view-model';
import type { MapPartyCommercialSnapshot } from './commercial-lens';

function row(partial: Partial<MapCustomerRow> & Pick<MapCustomerRow, 'partyId' | 'displayName'>): MapCustomerRow {
  return {
    primaryPhone: null,
    commercialOwnerMemberId: null,
    hasCoordinates: true,
    hasProvenance: false,
    bucket: 'plottable',
    ...partial,
  };
}

describe('buildMapHoverSnapshot', () => {
  it('labels quoted and order values without inventing revenue language', () => {
    const commercial: MapPartyCommercialSnapshot = {
      opportunityCount: 2,
      quoteCount: 1,
      orderCount: 1,
      opportunityValueLabel: 'Bs 100,00',
      quotedValueLabel: 'Bs 250,00',
      orderValueLabel: 'Bs 400,00',
      currency: 'BOB',
    };
    const snapshot = buildMapHoverSnapshot({
      row: row({ partyId: 'p1', displayName: 'Cliente Demo', hasCoordinates: true }),
      ownerLabel: 'Ana',
      commercial,
    });
    assert.equal(snapshot.clientName, 'Cliente Demo');
    assert.equal(snapshot.responsible, 'Ana');
    assert.equal(snapshot.quotedValueLabel, 'Bs 250,00');
    assert.equal(snapshot.orderValueLabel, 'Bs 400,00');
    assert.equal(snapshot.statusLabel, 'Ubicación confirmada');
    assert.doesNotMatch(
      `${snapshot.quotedValueLabel} ${snapshot.orderValueLabel} ${snapshot.statusLabel}`,
      /ingreso|revenue|cobranza/i,
    );
  });

  it('marks pending location when coordinates are absent but provenance exists', () => {
    const snapshot = buildMapHoverSnapshot({
      row: row({
        partyId: 'p2',
        displayName: 'Sin pin',
        hasCoordinates: false,
        hasProvenance: true,
      }),
      ownerLabel: null,
      commercial: null,
    });
    assert.equal(snapshot.statusLabel, 'Ubicación por confirmar');
    assert.equal(snapshot.statusTone, 'manual');
  });

  it('surfaces overdue work as next attention before generic attention items', () => {
    const snapshot = buildMapHoverSnapshot({
      row: row({ partyId: 'p3', displayName: 'Con seguimiento' }),
      ownerLabel: null,
      commercial: null,
      overdueWork: [
        {
          workItemId: 'w1',
          title: 'Llamar mañana',
          status: 'open',
          subjectType: 'party',
          subjectId: 'p3',
        } as never,
      ],
      attention: [
        {
          attentionType: 'pending_approval',
          isActive: true,
          subjectType: 'party',
          subjectId: 'p3',
          reasonCode: 'pending_approval',
        } as never,
      ],
    });
    assert.equal(snapshot.nextAttention, 'Llamar mañana');
  });
});
