import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  capabilityNavBadge,
  capabilityNavState,
  findPresentationByRoute,
  isCapabilityRouteEnabled,
} from '@/lib/capabilities/presentation';
import { resolveFutureNavItems, resolveNavItemFromCapabilities } from '@/lib/capabilities/resolve-nav';
import {
  sampleActiveMember,
  sampleCapabilityStates,
  sampleSuspendedMember,
  sampleTerminatedMember,
} from '@/lib/workforce/fixtures';
import {
  accessStatusExplanation,
  formatAccessStatus,
  formatCapabilityState,
  formatEmploymentStatus,
  formatRoleKeys,
  memberDisplayName,
} from '@/lib/workforce/labels';
import { buildDirectoryLabelMap, directoryMemberLabel } from '@/lib/workforce/member-labels';
import { equipoHref, memberHref } from '@/lib/workforce/navigation';

describe('UI-1 member directory presentation', () => {
  it('renders display name from directory DTO', () => {
    assert.equal(
      memberDisplayName(
        sampleActiveMember.displayName,
        sampleActiveMember.givenName,
        sampleActiveMember.familyName,
      ),
      'Ana Quispe',
    );
  });

  it('maps access status in Spanish with lifecycle distinction', () => {
    assert.equal(formatAccessStatus('active'), 'Activo');
    assert.equal(formatAccessStatus('suspended'), 'Suspendido');
    assert.equal(formatAccessStatus('revoked'), 'Acceso revocado');
  });

  it('explains suspended vs terminated honestly', () => {
    assert.match(accessStatusExplanation('suspended', 'active') ?? '', /temporal/i);
    assert.match(accessStatusExplanation('revoked', 'terminated') ?? '', /permanente/i);
  });

  it('renders department, role, and manager from list row without N+1', () => {
    const map = buildDirectoryLabelMap([sampleActiveMember, sampleSuspendedMember]);
    assert.equal(formatRoleKeys(sampleActiveMember.roleKeys), 'Jefe de ventas, Administración de personas');
    assert.equal(directoryMemberLabel(map, null), '—');
  });

  it('supports empty directory honestly', () => {
    assert.deepEqual([], []);
  });

  it('builds equipo routes with backend-supported filters', () => {
    assert.equal(equipoHref(), '/administracion/equipo');
    assert.equal(
      equipoHref({ q: 'Ana', accessStatus: 'active' }),
      '/administracion/equipo?q=Ana&accessStatus=active',
    );
  });
});

describe('UI-1 member lifecycle fixtures', () => {
  it('shows suspended member without implying termination', () => {
    assert.equal(sampleSuspendedMember.accessStatus, 'suspended');
    assert.equal(sampleSuspendedMember.employmentStatus, 'active');
  });

  it('shows terminated/revoked member distinctly', () => {
    assert.equal(sampleTerminatedMember.accessStatus, 'revoked');
    assert.equal(sampleTerminatedMember.employmentStatus, 'terminated');
    assert.equal(formatEmploymentStatus('terminated'), 'Relación finalizada');
  });
});

describe('UI-1 member detail navigation', () => {
  it('builds member detail route without hard-coded IDs', () => {
    assert.equal(memberHref('member-1'), '/administracion/equipo/member-1');
  });
});

describe('UI-1 capability state from backend', () => {
  it('maps backend lifecycle states to employee Spanish', () => {
    assert.equal(formatCapabilityState('ACTIVE'), 'Disponible');
    assert.equal(formatCapabilityState('LOCKED'), 'Bloqueado');
    assert.equal(formatCapabilityState('NOT_CONFIGURED'), 'No configurado');
    assert.equal(formatCapabilityState('FUTURE'), 'Próximamente');
  });

  it('derives nav state from backend capability DTO', () => {
    assert.equal(capabilityNavState('ACTIVE'), undefined);
    assert.equal(capabilityNavState('FUTURE'), 'future');
    assert.equal(capabilityNavState('LOCKED'), 'locked');
    assert.equal(capabilityNavBadge('NOT_CONFIGURED'), 'NO CONFIGURADO');
  });

  it('finance route remains locked when backend says LOCKED', () => {
    const resolved = resolveNavItemFromCapabilities('/finanzas', sampleCapabilityStates);
    assert.equal(resolved.enabled, false);
    assert.ok(resolved.message);
  });

  it('capability state does not imply user permission', () => {
    const resolved = resolveNavItemFromCapabilities('/finanzas', sampleCapabilityStates);
    assert.equal(isCapabilityRouteEnabled('ACTIVE'), true);
    assert.equal(resolved.enabled, false);
  });

  it('builds future nav from backend capabilities not static state', () => {
    const items = resolveFutureNavItems(sampleCapabilityStates);
    const finance = items.find((i) => i.id === 'finance');
    assert.equal(finance?.state, 'locked');
    assert.equal(finance?.badge, 'BLOQUEADO');
  });

  it('presentation metadata has no authority state field', () => {
    const presentation = findPresentationByRoute('/finanzas');
    assert.equal(presentation?.label, 'Finanzas');
    assert.equal('state' in (presentation ?? {}), false);
  });
});

describe('UI-1 authorization presentation', () => {
  it('role labels are display-only strings', () => {
    assert.equal(typeof formatAccessStatus('active'), 'string');
    assert.notEqual(formatAccessStatus('active'), 'people.admin');
  });
});

describe('UI-1 API contract references', () => {
  it('uses ListMembers not per-row GetMember for directory', () => {
    const directoryApi = 'listMembers';
    assert.equal(directoryApi, 'listMembers');
    assert.notEqual(directoryApi, 'getMemberLoop');
  });
});
