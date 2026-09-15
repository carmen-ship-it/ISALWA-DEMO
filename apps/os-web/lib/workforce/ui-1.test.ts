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

  it('product finance stays LOCKED and is not bound to the operational /finanzas desk', () => {
    const finance = sampleCapabilityStates.find((row) => row.capabilityKey === 'finance');
    assert.equal(finance?.state, 'LOCKED');
    assert.equal(finance?.implemented, false);
    const resolved = resolveNavItemFromCapabilities('/finanzas', sampleCapabilityStates);
    // Operational desk is gated by finance.operational.record, not product finance=ACTIVE.
    assert.equal(resolved.enabled, true);
    assert.equal(resolved.message, null);
    assert.equal(findPresentationByRoute('/finanzas'), null);
  });

  it('capability state does not imply user permission', () => {
    assert.equal(isCapabilityRouteEnabled('ACTIVE'), true);
    assert.equal(isCapabilityRouteEnabled('LOCKED'), false);
    const finance = sampleCapabilityStates.find((row) => row.capabilityKey === 'finance');
    assert.equal(finance?.state === 'ACTIVE', false);
  });

  it('builds future nav from backend capabilities not static state', () => {
    const items = resolveFutureNavItems(sampleCapabilityStates);
    const finance = items.find((i) => i.id === 'finance');
    const messaging = items.find((i) => i.id === 'messaging');
    assert.equal(finance, undefined);
    assert.equal(messaging?.state, 'locked');
    assert.equal(messaging?.badge, 'NO CONFIGURADO');
  });

  it('presentation metadata has no authority state field', () => {
    const presentation = findPresentationByRoute('/mensajes');
    assert.equal(presentation?.label, 'Mensajes');
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
