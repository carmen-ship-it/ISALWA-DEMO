import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildEntregaChronology } from './chronology';
import { resolveEntregaSurface } from './surface';

describe('entrega surface and chronology', () => {
  it('keeps empty, loading, error, and permission distinct', () => {
    assert.equal(
      resolveEntregaSurface({ organizationId: 'org-a', warehouseExitCount: 0, deliveryCount: 0 }),
      'empty',
    );
    assert.equal(
      resolveEntregaSurface({ organizationId: 'org-a', failed: true, warehouseExitCount: 1, deliveryCount: 1 }),
      'error',
    );
    assert.equal(
      resolveEntregaSurface({ organizationId: '', warehouseExitCount: 2, deliveryCount: 2 }),
      'permission',
    );
    assert.equal(
      resolveEntregaSurface({ organizationId: 'org-a', denied: true, warehouseExitCount: 1, deliveryCount: 0 }),
      'permission',
    );
    assert.equal(
      resolveEntregaSurface({ organizationId: 'org-a', warehouseExitCount: 0, deliveryCount: 1 }),
      'ready',
    );
  });

  it('shows a later smaller delivery after the warehouse exit, without calling the exit a delivery', () => {
    const items = buildEntregaChronology({
      warehouseExits: [
        {
          id: 'exit-1',
          exitedAt: '2026-09-14T13:00:00.000Z',
          recordedByLabel: 'Almacén',
          notes: null,
          lines: [{ quantity: 8 }],
        },
      ],
      deliveries: [
        {
          id: 'delivery-1',
          deliveredAt: '2026-09-14T14:00:00.000Z',
          recordedByLabel: 'Entrega',
          notes: null,
          lines: [{ quantity: 8 }],
        },
        {
          id: 'delivery-2',
          deliveredAt: '2026-09-14T14:30:00.000Z',
          recordedByLabel: 'Entrega',
          notes: null,
          lines: [{ quantity: 3 }],
        },
      ],
    });
    assert.deepEqual(
      items.map((item) => item.kind),
      ['warehouse_exit', 'delivery', 'delivery'],
    );
    assert.equal(items[0]?.label, 'Nota de salida de almacén');
    assert.notEqual(items[0]?.label, 'Nota de entrega');
    assert.match(items[2]?.detail ?? '', /Cantidad registrada: 3/);
    assert.equal(items.some((item) => item.detail.includes('NE-')), false);
  });
});
