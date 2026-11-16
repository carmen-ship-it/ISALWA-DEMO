import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  COMMERCIAL_ORG_READ_SCOPE,
  FINANCE_OPERATIONAL_RECORD_SCOPE,
  PURCHASING_OPERATIONAL_RECORD_SCOPE,
} from '@isalwa/os-contracts';
import {
  NAV_GROUP_ORDER,
  NAV_SECONDARY_COLLAPSED_GROUPS,
  PRIMARY_NAV,
  filterNavByAccess,
  groupNavItems,
  navItemLabel,
  primaryNavIds,
} from '@/lib/navigation/nav-config';
import { t } from '@/lib/i18n/es';

const byId = (id: string) => PRIMARY_NAV.find((item) => item.id === id)!;

describe('Batch 8 navigation: the six everyday destinations', () => {
  it('Hoy, Conversaciones, Clientes, Comercial, Catálogo and Mapa keep their routes and labels', () => {
    const expected: Array<[string, string, string]> = [
      ['inicio', '/inicio', 'Hoy'],
      ['conversaciones', '/conversaciones', 'Conversaciones'],
      ['clientes', '/clientes', 'Clientes'],
      ['oportunidades', '/oportunidades', 'Oportunidades'],
      ['cotizaciones', '/cotizaciones', 'Cotizaciones'],
      ['pedidos', '/pedidos', 'Pedidos'],
      ['productos', '/productos', 'Catálogo'],
      ['mapa', '/mapa', 'Mapa'],
    ];
    for (const [id, href, label] of expected) {
      const item = byId(id);
      assert.equal(item.href, href, id);
      assert.equal(navItemLabel(item, t), label, id);
      assert.equal(item.accessClass, 'VISIBLE+ACTIVE', id);
      assert.equal(item.requiresAnyScope, undefined, `${id} is always reachable; the page and API gate the data`);
    }
  });

  it('the first four groups carry the everyday surfaces, in order', () => {
    const sections = groupNavItems(PRIMARY_NAV);
    const idsOf = (g: string) => sections.find((s) => s.group === g)!.items.map((i) => i.id);
    assert.deepEqual(NAV_GROUP_ORDER.slice(0, 3), ['principal', 'comercial', 'consulta']);
    assert.deepEqual(idsOf('principal'), ['inicio', 'conversaciones', 'clientes']);
    assert.deepEqual(idsOf('comercial'), ['oportunidades', 'cotizaciones', 'pedidos']);
    assert.deepEqual(idsOf('consulta'), ['productos', 'mapa']);
  });

  it('operations and administration are secondary: collapsed by default and permission-controlled', () => {
    assert.deepEqual([...NAV_SECONDARY_COLLAPSED_GROUPS], ['operaciones', 'control', 'mas']);
    for (const id of ['produccion', 'almacen', 'compras', 'entregas', 'finanzas', 'coordinacion']) {
      assert.ok(byId(id).requiresAnyScope?.length, `${id} must declare the scopes that reveal it`);
    }
    assert.equal(byId('administracion').requiresAdminProbe, true);
  });
});

describe('Batch 8 navigation: scope-controlled secondary areas', () => {
  const everyday = ['inicio', 'conversaciones', 'clientes', 'oportunidades', 'cotizaciones', 'pedidos', 'productos', 'mapa'];

  it('an actor with no operations scopes sees the everyday items and no operations desks', () => {
    const ids = primaryNavIds({ showAdmin: false, grantedScopes: ['party.read'] });
    for (const id of everyday) assert.ok(ids.includes(id), id);
    for (const id of ['produccion', 'almacen', 'compras', 'entregas', 'finanzas', 'coordinacion', 'administracion']) {
      assert.equal(ids.includes(id), false, id);
    }
  });

  it('a purchasing role sees Compras and not Finanzas', () => {
    const ids = primaryNavIds({ showAdmin: false, grantedScopes: [PURCHASING_OPERATIONAL_RECORD_SCOPE] });
    assert.ok(ids.includes('compras'));
    assert.equal(ids.includes('finanzas'), false);
  });

  it('a finance role sees Finanzas and not Compras', () => {
    const ids = primaryNavIds({ showAdmin: false, grantedScopes: [FINANCE_OPERATIONAL_RECORD_SCOPE] });
    assert.ok(ids.includes('finanzas'));
    assert.equal(ids.includes('compras'), false);
  });

  it('organization oversight reveals the operations desks for management', () => {
    const ids = primaryNavIds({ showAdmin: false, grantedScopes: [COMMERCIAL_ORG_READ_SCOPE] });
    for (const id of ['produccion', 'almacen', 'compras', 'entregas', 'finanzas']) assert.ok(ids.includes(id), id);
  });

  it('Administración still depends on the admin probe, never on a scope list', () => {
    const scopes = [COMMERCIAL_ORG_READ_SCOPE];
    assert.equal(primaryNavIds({ showAdmin: false, grantedScopes: scopes }).includes('administracion'), false);
    assert.equal(primaryNavIds({ showAdmin: true, grantedScopes: scopes }).includes('administracion'), true);
  });

  it('hiding a link never removes the route: deep links keep their own server-side gate', () => {
    const hidden = filterNavByAccess(PRIMARY_NAV, { showAdmin: false, grantedScopes: [] });
    assert.ok(PRIMARY_NAV.some((item) => item.id === 'finanzas' && item.href === '/finanzas'));
    assert.equal(hidden.some((item) => item.id === 'finanzas'), false);
  });

  it('unknown scopes (still loading) skip scope filtering rather than hiding the shell', () => {
    const ids = primaryNavIds({ showAdmin: false });
    assert.ok(ids.includes('finanzas'));
  });
});
