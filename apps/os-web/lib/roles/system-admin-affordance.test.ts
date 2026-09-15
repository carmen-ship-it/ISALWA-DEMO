import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { PEOPLE_ADMIN_SCOPE, SYSTEM_ADMIN_SCOPE } from '@isalwa/os-contracts';
import {
  classifyNavItem,
  FUTURE_NAV,
  PRIMARY_NAV,
  filterNavByAccess,
  primaryNavIds,
} from '@/lib/navigation/nav-config';
import { roleNavigationRequests } from '@/lib/navigation/requests/roles';
import { composeOperatingHomes } from '@/lib/roles/homes';
import {
  SYSTEM_ADMIN_MEANING,
  SYSTEM_CONTROLS_HREF,
  mayOpenSystemControls,
  systemControlsHref,
} from '@/lib/roles/system-controls';

const here = dirname(fileURLToPath(import.meta.url));

function session(scopes: string[]) {
  return {
    organizationId: 'org-1',
    actorMemberId: 'mem-1',
    grantedScopes: scopes,
  };
}

function source(...parts: string[]): string {
  return readFileSync(resolve(here, ...parts), 'utf8');
}

describe('system.admin Controles del sistema (repair A)', () => {
  it('states exact system.admin meaning without escalating to people.admin', () => {
    assert.equal(SYSTEM_ADMIN_MEANING.scope, SYSTEM_ADMIN_SCOPE);
    assert.equal(SYSTEM_ADMIN_MEANING.scope, 'system.admin');
    assert.equal(SYSTEM_ADMIN_MEANING.tenantBound, true);
    assert.equal(SYSTEM_ADMIN_MEANING.rewritesHistory, false);
    assert.equal(SYSTEM_ADMIN_MEANING.impliesPeopleAdmin, false);
    assert.equal(SYSTEM_ADMIN_MEANING.includesIntegrationHealth, false);
    assert.equal(SYSTEM_ADMIN_MEANING.separateFromBusinessHome, true);
    assert.notEqual(SYSTEM_ADMIN_SCOPE, PEOPLE_ADMIN_SCOPE);
  });

  it('Owner with system.admin gets Controles → /sistema, never /administracion', () => {
    const model = composeOperatingHomes({
      session: session(['management.org.read', 'system.admin']),
    });
    assert.ok(model.systemControls);
    assert.equal(model.systemControls.href, SYSTEM_CONTROLS_HREF);
    assert.equal(model.systemControls.href, '/sistema');
    assert.equal(model.systemControls.href.includes('administracion'), false);
    assert.deepEqual(
      roleNavigationRequests(['management.org.read', 'system.admin']).find(
        (item) => item.id === 'system-controls',
      ),
      { id: 'system-controls', href: '/sistema', label: 'Controles del sistema' },
    );
  });

  it('hides Controles without system.admin and does not treat people.admin as system.admin', () => {
    assert.equal(mayOpenSystemControls(['people.admin']), false);
    assert.equal(mayOpenSystemControls(['management.org.read']), false);
    assert.equal(mayOpenSystemControls(['system.admin']), true);
    assert.equal(composeOperatingHomes({ session: session(['people.admin']) }).systemControls, null);
    assert.equal(
      roleNavigationRequests(['people.admin']).some((item) => item.id === 'system-controls'),
      false,
    );
  });

  it('keeps Administración primary nav on people.admin probe only (no escalation)', () => {
    assert.equal(
      filterNavByAccess(PRIMARY_NAV, { showAdmin: false }).some((item) => item.id === 'administracion'),
      false,
    );
    assert.equal(
      filterNavByAccess(PRIMARY_NAV, { showAdmin: true }).some((item) => item.id === 'administracion'),
      true,
    );
    assert.equal(classifyNavItem(PRIMARY_NAV.find((i) => i.id === 'administracion')!, { showAdmin: false }), 'HIDDEN');
    assert.equal(
      classifyNavItem(PRIMARY_NAV.find((i) => i.id === 'administracion')!, { showAdmin: true }),
      'VISIBLE+ACTIVE',
    );
    assert.equal(systemControlsHref(), '/sistema');
  });

  it('fail-closes /sistema without system.admin and keeps /administracion on people.admin probe', () => {
    const sistema = source('../../app/(app)/sistema/page.tsx');
    assert.match(sistema, /mayOpenSystemControls/);
    assert.match(sistema, /AccessDeniedState/);
    assert.match(sistema, /loadActorRoleKeys/);
    assert.doesNotMatch(sistema, /probeAdminAccess/);
    assert.match(sistema, /No implica administración de personas \(people\.admin\)/);

    const administracion = source('../../app/(app)/administracion/page.tsx');
    assert.match(administracion, /probeAdminAccess/);
    assert.match(administracion, /AccessDeniedState/);
    assert.doesNotMatch(administracion, /system\.admin|mayOpenSystemControls|SYSTEM_ADMIN/);

    for (const relative of [
      '../../app/(app)/administracion/equipo/page.tsx',
      '../../app/(app)/administracion/accesos/page.tsx',
      '../../app/(app)/administracion/capacidades/page.tsx',
    ]) {
      const page = source(relative);
      assert.match(page, /probeAdminAccess/);
    }
  });
});

describe('PRIMARY_NAV authority classification audit', () => {
  it('classifies each primary and future item without hiding ops desks indiscriminately', () => {
    const byId = Object.fromEntries(PRIMARY_NAV.map((item) => [item.id, item.accessClass]));
    assert.deepEqual(byId, {
      inicio: 'VISIBLE+ACTIVE',
      clientes: 'VISIBLE+ACTIVE',
      mapa: 'VISIBLE+ACTIVE',
      oportunidades: 'VISIBLE+ACTIVE',
      cotizaciones: 'VISIBLE+ACTIVE',
      trabajo: 'VISIBLE+ACTIVE',
      productos: 'VISIBLE+ACTIVE',
      produccion: 'VISIBLE+ACTIVE',
      almacen: 'VISIBLE+ACTIVE',
      compras: 'VISIBLE+ACTIVE',
      finanzas: 'VISIBLE+ACTIVE',
      entregas: 'VISIBLE+ACTIVE',
      coordinacion: 'VISIBLE+ACTIVE',
      aprobaciones: 'VISIBLE+ACTIVE',
      administracion: 'HIDDEN',
    });
    assert.deepEqual(
      FUTURE_NAV.map((item) => ({ id: item.id, accessClass: item.accessClass, state: item.state })),
      [
        { id: 'mensajes', accessClass: 'FUTURE', state: 'locked' },
      ],
    );
    // Ops desks remain visible without people.admin; authority stays inside the page.
    assert.deepEqual(primaryNavIds({ showAdmin: false }), [
      'inicio',
      'clientes',
      'mapa',
      'oportunidades',
      'cotizaciones',
      'trabajo',
      'productos',
      'produccion',
      'almacen',
      'compras',
      'finanzas',
      'entregas',
      'coordinacion',
      'aprobaciones',
    ]);
  });
});
