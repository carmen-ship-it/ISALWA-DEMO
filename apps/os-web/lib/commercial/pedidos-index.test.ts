/**
 * RC4 Pedidos index single-truth — nav + org list desk (not accepted-quotes proxy).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

describe('RC4 Pedidos index single truth', () => {
  it('nav Pedidos points at /pedidos desk', () => {
    const nav = readFileSync(resolve('lib/navigation/nav-config.ts'), 'utf8');
    assert.match(nav, /id:\s*'pedidos'/);
    assert.match(nav, /href:\s*'\/pedidos'/);
    assert.doesNotMatch(nav, /href:\s*'\/cotizaciones\?status=accepted'/);
  });

  it('Pedidos page lists orders with org visibility for owner-eval', () => {
    const page = readFileSync(resolve('app/(app)/pedidos/page.tsx'), 'utf8');
    assert.match(page, /listOrders/);
    assert.match(page, /visibility:\s*'org'/);
    assert.match(page, /filterByDemoDataMode/);
    assert.match(page, /OrderOrgList/);
  });

  it('OrderOrgList deep-links to cliente pedido detail', () => {
    const list = readFileSync(resolve('components/commercial/order-org-list.tsx'), 'utf8');
    assert.match(list, /orderHref|\/pedidos\//);
  });
});
