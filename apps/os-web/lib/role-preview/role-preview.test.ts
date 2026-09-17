import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  COMMERCIAL_CUSTOMER_CREATE_SCOPE,
  MANAGEMENT_ORG_READ_SCOPE,
  PEOPLE_ADMIN_SCOPE,
  SYSTEM_ADMIN_SCOPE,
} from '@isalwa/os-contracts';
import {
  canUseRolePreview,
  effectiveNavScopes,
  rolePreviewBlocksMutations,
} from '@/lib/role-preview/access';
import { commercialListQueryFromProjection } from '@/lib/role-preview/commercial-list-query';
import {
  commercialVisibilityForPersona,
  parseEvaluationProjectionCookie,
  type EvaluationProjection,
} from '@/lib/role-preview/evaluation-projection';
import {
  evaluationAllowsDesk,
  evaluationBlocksDirectParty,
  filterByCommercialOwner,
} from '@/lib/role-preview/evaluation-resource-access';
import { previewScopesForPersona } from '@/lib/role-preview/presets';
import { parseStoredRolePreview, rolePreviewStorageKey } from '@/lib/role-preview/storage';

describe('role preview access gate', () => {
  it('allows people.admin or management.org.read — not plain commercial scopes', () => {
    assert.equal(canUseRolePreview([PEOPLE_ADMIN_SCOPE]), true);
    assert.equal(canUseRolePreview([MANAGEMENT_ORG_READ_SCOPE]), true);
    assert.equal(
      canUseRolePreview([MANAGEMENT_ORG_READ_SCOPE, SYSTEM_ADMIN_SCOPE]),
      true,
    );
    assert.equal(canUseRolePreview([COMMERCIAL_CUSTOMER_CREATE_SCOPE]), false);
    assert.equal(canUseRolePreview([SYSTEM_ADMIN_SCOPE]), false);
  });
});

describe('role preview presentation scopes', () => {
  it('does not mutate real scopes — returns alternate labeling scopes only', () => {
    const real = [PEOPLE_ADMIN_SCOPE, MANAGEMENT_ORG_READ_SCOPE];
    const preview = effectiveNavScopes(real, 'asesor');
    assert.deepEqual(preview, previewScopesForPersona('asesor'));
    assert.notEqual(preview, real);
    assert.equal(effectiveNavScopes(real, 'own'), real);
    assert.equal(effectiveNavScopes(real, null), real);
  });

  it('blocks mutations while a non-own persona is active', () => {
    assert.equal(rolePreviewBlocksMutations(null), false);
    assert.equal(rolePreviewBlocksMutations('own'), false);
    assert.equal(rolePreviewBlocksMutations('asesor'), true);
  });
});

describe('role preview storage safety', () => {
  it('scopes storage keys to actor and rejects traversal', () => {
    assert.equal(rolePreviewStorageKey('org:mem'), 'isalwa-os-role-preview-v1:org:mem');
    assert.equal(rolePreviewStorageKey('../evil'), null);
    assert.equal(parseStoredRolePreview('asesor'), 'asesor');
    assert.equal(parseStoredRolePreview('own'), null);
    assert.equal(parseStoredRolePreview('impersonate'), null);
  });
});

describe('evaluation projection cookie + commercial list narrowing', () => {
  it('parses Asesor subject member from cookie', () => {
    const parsed = parseEvaluationProjectionCookie('asesor::mem_synth_asesor_a');
    assert.equal(parsed.persona, 'asesor');
    assert.equal(parsed.subjectMemberId, 'mem_synth_asesor_a');
    assert.equal(commercialVisibilityForPersona('asesor'), 'own');
    assert.equal(commercialVisibilityForPersona('jefe-comercial'), 'team');
    assert.equal(commercialVisibilityForPersona('gerencia'), 'org');
    assert.equal(commercialVisibilityForPersona('produccion'), null);
  });

  it('narrows Asesor lists to subject owner; fails closed without subject', () => {
    const withSubject: EvaluationProjection = {
      active: true,
      persona: 'asesor',
      subjectMemberId: 'mem_a',
      readOnly: true,
      commercialVisibility: 'own',
      presentationScopes: [],
    };
    assert.deepEqual(commercialListQueryFromProjection(withSubject), {
      visibility: 'org',
      ownerMemberId: 'mem_a',
    });
    const withoutSubject: EvaluationProjection = {
      ...withSubject,
      subjectMemberId: null,
    };
    assert.equal(
      commercialListQueryFromProjection(withoutSubject).ownerMemberId,
      '__evaluation_asesor_subject_required__',
    );
  });

  it('uses team visibility for Jefe Comercial and org for Gerencia', () => {
    assert.deepEqual(
      commercialListQueryFromProjection({
        active: true,
        persona: 'jefe-comercial',
        subjectMemberId: null,
        readOnly: true,
        commercialVisibility: 'team',
        presentationScopes: [],
      }),
      { visibility: 'team' },
    );
    assert.deepEqual(
      commercialListQueryFromProjection({
        active: true,
        persona: 'gerencia',
        subjectMemberId: null,
        readOnly: true,
        commercialVisibility: 'org',
        presentationScopes: [],
      }),
      { visibility: 'org' },
    );
  });
});

describe('evaluation resource access', () => {
  const asesor: EvaluationProjection = {
    active: true,
    persona: 'asesor',
    subjectMemberId: 'mem_a',
    readOnly: true,
    commercialVisibility: 'own',
    presentationScopes: [],
  };

  it('blocks Asesor direct party when owner differs; allows subject match', () => {
    assert.equal(evaluationBlocksDirectParty(asesor, 'mem_b'), true);
    assert.equal(evaluationBlocksDirectParty(asesor, 'mem_a'), false);
    assert.equal(evaluationBlocksDirectParty({ ...asesor, active: false }, 'mem_b'), false);
  });

  it('desk allow-list: Producción not for Asesor; Entregas for entregas/gerencia', () => {
    assert.equal(evaluationAllowsDesk(asesor, 'produccion'), false);
    assert.equal(evaluationAllowsDesk(asesor, 'commercial'), true);
    assert.equal(
      evaluationAllowsDesk(
        { ...asesor, persona: 'produccion', subjectMemberId: null, commercialVisibility: null },
        'produccion',
      ),
      true,
    );
    assert.equal(
      evaluationAllowsDesk(
        { ...asesor, persona: 'entregas', subjectMemberId: null, commercialVisibility: null },
        'entregas',
      ),
      true,
    );
  });

  it('filters commercial owner lists for Asesor subject', () => {
    const rows = [
      { id: '1', ownerMemberId: 'mem_a' },
      { id: '2', ownerMemberId: 'mem_b' },
    ];
    assert.deepEqual(
      filterByCommercialOwner(asesor, rows, (r) => r.ownerMemberId).map((r) => r.id),
      ['1'],
    );
  });
});

describe('role preview shell contract', () => {
  it('banner states non-impersonation and exit affordance', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const banner = readFileSync(
      resolve(here, '../../components/shell/role-preview-banner.tsx'),
      'utf8',
    );
    assert.match(banner, /Vista de evaluación/);
    assert.match(banner, /Sigue siendo Carmen/);
    assert.match(banner, /Solo lectura/);
    assert.match(banner, /Volver a vista de evaluación/);
  });

  it('commercial actions gate mutations via assertRolePreviewAllowsMutation', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const actions = readFileSync(resolve(here, '../commercial/actions.ts'), 'utf8');
    assert.match(actions, /assertRolePreviewAllowsMutation/);
    assert.match(actions, /createOrderAction/);
  });
});
