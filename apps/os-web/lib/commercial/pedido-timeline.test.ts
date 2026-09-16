import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PartyTimelineEntryReadModel } from '@isalwa/os-contracts';
import {
  PEDIDO_TIMELINE_EVENT_TYPES,
  projectPedidoTimeline,
  timelineEntryHref,
  timelineEntryLinksToOrder,
} from '@/lib/commercial/pedido-timeline';
import { timelineEventLabel } from '@/lib/commercial/timeline-labels';
import { sampleOrder, samplePartyTimelineEntry } from '@/lib/commercial/fixtures';

function entry(
  overrides: Partial<PartyTimelineEntryReadModel> & Pick<PartyTimelineEntryReadModel, 'eventType' | 'entryId'>,
): PartyTimelineEntryReadModel {
  return {
    organizationId: 'org-1',
    partyId: 'party-1',
    occurredAt: '2026-08-22T10:00:00.000Z',
    actorMemberId: 'member-1',
    correlationId: 'corr',
    primaryEntityType: 'order',
    primaryEntityId: sampleOrder.orderId,
    facts: { orderId: sampleOrder.orderId, orderNumber: sampleOrder.orderNumber, partyId: 'party-1' },
    ...overrides,
  };
}

describe('pedido timeline mapping', () => {
  it('projects durable post-sale events with Spanish labels and deep-links', () => {
    const items = projectPedidoTimeline({
      partyId: 'party-1',
      orderId: sampleOrder.orderId,
      partyTimelineEntries: [
        entry({
          entryId: 'ev-order',
          eventType: 'order.created',
          occurredAt: '2026-08-22T09:00:00.000Z',
        }),
        entry({
          entryId: 'ev-fg',
          eventType: 'finished_goods.received',
          occurredAt: '2026-08-22T11:00:00.000Z',
          primaryEntityType: 'finished_goods_receipt',
          primaryEntityId: 'fg-1',
          facts: {
            orderId: sampleOrder.orderId,
            partyId: 'party-1',
            quantity: 10,
            allocatesToOrder: false,
            postsStock: false,
          },
        }),
        entry({
          entryId: 'ev-approval',
          eventType: 'approval.approved',
          occurredAt: '2026-08-22T09:30:00.000Z',
          primaryEntityType: 'approval_request',
          primaryEntityId: 'apr-1',
          facts: {
            approvalRequestId: 'apr-1',
            subjectType: 'order',
            subjectId: sampleOrder.orderId,
          },
        }),
      ],
      deliveryEvents: [
        {
          id: 'ev-nota',
          eventType: 'delivery_note.created',
          occurredAt: '2026-08-22T12:00:00.000Z',
          payload: {
            deliveryNoteId: 'note-1',
            orderId: sampleOrder.orderId,
            partyId: 'party-1',
            internalDocumentRef: 'NE-PILOT-note-1',
            numberingPolicy: 'provisional_internal',
          },
        },
        {
          id: 'ev-salida',
          eventType: 'warehouse_exit.recorded',
          occurredAt: '2026-08-22T13:00:00.000Z',
          payload: {
            warehouseExitId: 'exit-1',
            orderId: sampleOrder.orderId,
            partyId: 'party-1',
            deliveryNoteId: 'note-1',
          },
        },
        {
          id: 'ev-entrega',
          eventType: 'customer_delivery.recorded',
          occurredAt: '2026-08-22T14:00:00.000Z',
          payload: {
            deliveryId: 'del-1',
            orderId: sampleOrder.orderId,
            partyId: 'party-1',
            deliveryNoteId: 'note-1',
            receivedBy: 'Ana',
          },
        },
      ],
      linkedIssues: [
        {
          issueId: 'iss-1',
          title: 'Falta un lavamanos',
          description: 'Cliente reportó falta',
          createdAt: '2026-08-22T15:00:00.000Z',
          references: [{ referenceType: 'order', referenceId: sampleOrder.orderId }],
        },
      ],
    });

    assert.equal(items[0]?.label, 'Incidencia vinculada');
    assert.equal(items[0]?.href, '/incidencias/iss-1');
    assert.equal(items.find((i) => i.eventType === 'order.created')?.label, 'Pedido creado');
    assert.equal(
      items.find((i) => i.eventType === 'finished_goods.received')?.label,
      'Ingreso a almacén de productos terminados',
    );
    assert.equal(items.find((i) => i.eventType === 'delivery_note.created')?.label, 'Nota de entrega creada');
    assert.equal(items.find((i) => i.eventType === 'warehouse_exit.recorded')?.label, 'Salida de almacén');
    assert.equal(items.find((i) => i.eventType === 'customer_delivery.recorded')?.label, 'Entrega al cliente');
    assert.equal(items.find((i) => i.eventType === 'approval.approved')?.href, '/aprobaciones/apr-1');

    for (const item of items) {
      assert.notEqual(item.label, item.eventType);
      assert.doesNotMatch(item.detail, /\.(created|recorded|received)\b/);
      assert.doesNotMatch(item.label, /\./);
    }
  });

  it('ignores events for other pedidos and never invents order.created from silence', () => {
    const items = projectPedidoTimeline({
      partyId: 'party-1',
      orderId: sampleOrder.orderId,
      partyTimelineEntries: [
        entry({
          entryId: 'other',
          eventType: 'order.created',
          facts: { orderId: 'order-other', orderNumber: 'PED-X', partyId: 'party-1' },
          primaryEntityId: 'order-other',
        }),
        samplePartyTimelineEntry,
      ],
      deliveryEvents: [],
      linkedIssues: [
        {
          issueId: 'iss-other',
          title: 'Otra',
          description: 'x',
          createdAt: '2026-08-22T15:00:00.000Z',
          references: [{ referenceType: 'order', referenceId: 'order-other' }],
        },
      ],
    });
    assert.equal(items.length, 0);
  });

  it('never falls back to raw event names for unknown types', () => {
    assert.equal(timelineEventLabel('totally.unknown.event'), 'Actividad registrada');
    assert.notEqual(timelineEventLabel('delivery_note.created'), 'delivery_note.created');
    assert.ok(PEDIDO_TIMELINE_EVENT_TYPES.has('warehouse_exit.recorded'));
    const items = projectPedidoTimeline({
      partyId: 'party-1',
      orderId: sampleOrder.orderId,
      deliveryEvents: [
        {
          id: 'raw',
          eventType: 'mystery.event',
          occurredAt: '2026-08-22T12:00:00.000Z',
          payload: { orderId: sampleOrder.orderId },
        },
      ],
    });
    assert.equal(items.length, 0);
  });

  it('links party timeline entries only when order association is durable', () => {
    const linked = entry({
      entryId: 'a',
      eventType: 'order.created',
    });
    const unlinked = entry({
      entryId: 'b',
      eventType: 'order.created',
      facts: { orderId: 'other', partyId: 'party-1' },
      primaryEntityId: 'other',
    });
    assert.equal(timelineEntryLinksToOrder(linked, sampleOrder.orderId), true);
    assert.equal(timelineEntryLinksToOrder(unlinked, sampleOrder.orderId), false);
    assert.equal(timelineEntryHref(linked), '/clientes/party-1/pedidos/order-1');
  });

  it('dedupes delivery and party sources by id', () => {
    const sharedId = 'shared-note';
    const items = projectPedidoTimeline({
      partyId: 'party-1',
      orderId: sampleOrder.orderId,
      partyTimelineEntries: [
        entry({
          entryId: sharedId,
          eventType: 'delivery_note.created',
          facts: {
            orderId: sampleOrder.orderId,
            partyId: 'party-1',
            deliveryNoteId: 'note-1',
            internalDocumentRef: 'NE-1',
          },
        }),
      ],
      deliveryEvents: [
        {
          id: sharedId,
          eventType: 'delivery_note.created',
          occurredAt: '2026-08-22T12:00:00.000Z',
          payload: {
            deliveryNoteId: 'note-1',
            orderId: sampleOrder.orderId,
            partyId: 'party-1',
            internalDocumentRef: 'NE-1',
          },
        },
      ],
    });
    assert.equal(items.filter((i) => i.id === sharedId).length, 1);
  });
});
