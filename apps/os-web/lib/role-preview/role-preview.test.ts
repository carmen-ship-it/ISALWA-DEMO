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
import { previewScopesForPersona } from '@/lib/role-preview/presets';
import { parseStoredRolePreview, rolePreviewStorageKey } from '@/lib/role-preview/storage';

describe('role preview access gate', () => {
  it('allows owner / people admin only — not plain commercial scopes', () => {
    assert.equal(canUseRolePreview([PEOPLE_ADMIN_SCOPE]), true);
    assert.equal(
      canUseRolePreview([MANAGEMENT_ORG_READ_SCOPE, SYSTEM_ADMIN_SCOPE]),
      true,
    );
    assert.equal(canUseRolePreview([COMMERCIAL_CUSTOMER_CREATE_SCOPE]), false);
    assert.equal(canUseRolePreview([MANAGEMENT_ORG_READ_SCOPE]), false);
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

describe('role preview shell contract', () => {
  it('banner states non-impersonation and exit affordance', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const banner = readFileSync(
      resolve(here, '../../components/shell/role-preview-banner.tsx'),
      'utf8',
    );
    assert.match(banner, /Vista previa de rol/);
    assert.match(banner, /No estás actuando como esta persona/);
    assert.match(banner, /Volver a mi vista/);
  });
});
