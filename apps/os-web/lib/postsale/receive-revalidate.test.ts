import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

describe('receiveFinishedGoodsAction cache', () => {
  it('revalidates the customer page and the pedido page, not only almacén', () => {
    const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'actions.ts'), 'utf8');
    const start = src.indexOf('export async function receiveFinishedGoodsAction');
    assert.ok(start >= 0);
    const body = src.slice(start, start + 1800);
    assert.match(body, /revalidatePath\('\/almacen'\)/);
    assert.match(body, /revalidatePath\(partyHref\(partyId\)\)/);
    assert.match(body, /revalidatePath\(orderHref\(partyId, orderId\)\)/);
    assert.match(body, /client\.getOrder\(orderId\)/);
  });
});
