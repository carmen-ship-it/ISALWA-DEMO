import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

describe('loadActorRoleKeys', () => {
  it('reads grantedScopes from getTrustedAuthorization, not member.roleKeys', () => {
    const source = readFileSync(new URL('./master-data-access.ts', import.meta.url), 'utf8');
    assert.match(source, /getTrustedAuthorization/);
    assert.match(source, /acceptTrustedMemberContext/);
    assert.doesNotMatch(source, /getAuthenticatedSession/);
    assert.doesNotMatch(source, /getMember\(/);
    assert.doesNotMatch(source, /summary\?\.roleKeys/);
  });
});
