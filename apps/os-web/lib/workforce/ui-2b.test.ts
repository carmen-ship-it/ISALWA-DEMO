import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { OsApiError } from '@/lib/api/os-api-errors';
import { mapWorkforceCommandError, OPEN_WORK_TERMINATE_MESSAGE } from '@/lib/workforce/command-errors';
import {
  UI_2B_WORKFORCE_COMMANDS,
  WORKFORCE_COMMANDS_BLOCKED_IN_UI,
} from '@/lib/workforce/command-types';
import { memberAdminVisibility } from '@/lib/workforce/lifecycle-ui';
import { DELEGATION_SCOPE_OPTIONS } from '@/lib/workforce/admin-options';
import {
  sampleActiveMember,
  sampleSuspendedMember,
  sampleTerminatedMember,
} from '@/lib/workforce/fixtures';

describe('UI-2B command registry', () => {
  it('wires Lane J approved workforce commands only', () => {
    assert.ok(UI_2B_WORKFORCE_COMMANDS.includes('ChangeDepartment'));
    assert.ok(UI_2B_WORKFORCE_COMMANDS.includes('TerminateMember'));
    assert.ok(UI_2B_WORKFORCE_COMMANDS.includes('RequestMemberEmailChange'));
    assert.equal(UI_2B_WORKFORCE_COMMANDS.length, 9);
  });

  it('does not expose blocked provider commands', () => {
    assert.deepEqual(WORKFORCE_COMMANDS_BLOCKED_IN_UI, [
      'RehireMember',
      'ChangeMemberEmail',
      'RetryAuthProviderSync',
    ]);
    for (const blocked of WORKFORCE_COMMANDS_BLOCKED_IN_UI) {
      assert.equal((UI_2B_WORKFORCE_COMMANDS as readonly string[]).includes(blocked), false);
    }
  });
});

describe('UI-2B lifecycle visibility', () => {
  it('shows suspend and org actions for active member', () => {
    const v = memberAdminVisibility(sampleActiveMember, 'admin-1');
    assert.equal(v.organization, true);
    assert.equal(v.suspend, true);
    assert.equal(v.reactivate, false);
    assert.equal(v.terminate, true);
    assert.equal(v.delegation, true);
    assert.equal(v.requestEmailChange, false);
  });

  it('shows reactivate only for suspended member (not self)', () => {
    const v = memberAdminVisibility(sampleSuspendedMember, 'admin-1');
    assert.equal(v.suspend, false);
    assert.equal(v.reactivate, true);
    assert.equal(v.terminate, true);
  });

  it('hides reactivate for suspended self', () => {
    const v = memberAdminVisibility(sampleSuspendedMember, sampleSuspendedMember.memberId);
    assert.equal(v.reactivate, false);
  });

  it('hides reactivate and suspend for terminated/revoked member', () => {
    const v = memberAdminVisibility(sampleTerminatedMember, 'admin-1');
    assert.equal(v.organization, false);
    assert.equal(v.suspend, false);
    assert.equal(v.reactivate, false);
    assert.equal(v.terminate, false);
    assert.equal(v.delegation, false);
  });

  it('shows email change request only for self on active member', () => {
    const self = { ...sampleActiveMember, memberId: 'self-1' };
    const v = memberAdminVisibility(self, 'self-1');
    assert.equal(v.requestEmailChange, true);
    const other = memberAdminVisibility(sampleActiveMember, 'self-1');
    assert.equal(other.requestEmailChange, false);
  });

  it('hides invited onboarding activate from admin surfaces', () => {
    const invited = { ...sampleActiveMember, accessStatus: 'invited' };
    const v = memberAdminVisibility(invited, 'admin-1');
    assert.equal(v.reactivate, false);
    assert.equal(v.organization, false);
    assert.equal(v.suspend, false);
  });
});

describe('UI-2B error mapping', () => {
  it('maps unauthorized to Spanish session message', () => {
    const msg = mapWorkforceCommandError(
      'ChangeRole',
      new OsApiError({ kind: 'unauthorized', status: 401, code: 'AUTH_REQUIRED', message: '' }),
    );
    assert.match(msg, /sesión/i);
  });

  it('maps forbidden for admin commands', () => {
    const msg = mapWorkforceCommandError(
      'ChangeRole',
      new OsApiError({ kind: 'forbidden', status: 403, code: 'PERMISSION_DENIED', message: '' }),
    );
    assert.match(msg, /permiso/i);
  });

  it('maps TerminateMember validation to open-work UX', () => {
    const msg = mapWorkforceCommandError(
      'TerminateMember',
      new OsApiError({ kind: 'validation', status: 400, code: 'VALIDATION_FAILED', message: '' }),
    );
    assert.equal(msg, OPEN_WORK_TERMINATE_MESSAGE);
  });

  it('maps ChangeRole validation generically', () => {
    const msg = mapWorkforceCommandError(
      'ChangeRole',
      new OsApiError({ kind: 'validation', status: 400, code: 'VALIDATION_FAILED', message: '' }),
    );
    assert.match(msg, /Revise los datos/i);
  });
});

describe('UI-2B delegation scopes', () => {
  it('uses verified approval.act scope only', () => {
    assert.deepEqual(DELEGATION_SCOPE_OPTIONS, [
      { value: 'approval.act', label: 'Actuar en aprobaciones delegadas' },
    ]);
  });
});

describe('UI-2B blocked command absence in UI registry', () => {
  it('InviteMember is not part of the UI-2B registry', () => {
    assert.equal(UI_2B_WORKFORCE_COMMANDS.includes('InviteMember' as never), false);
  });

  it('RehireMember not wired', () => {
    assert.equal(UI_2B_WORKFORCE_COMMANDS.includes('RehireMember' as never), false);
  });

  it('ChangeMemberEmail not wired', () => {
    assert.equal(UI_2B_WORKFORCE_COMMANDS.includes('ChangeMemberEmail' as never), false);
  });

  it('RetryAuthProviderSync not wired', () => {
    assert.equal(UI_2B_WORKFORCE_COMMANDS.includes('RetryAuthProviderSync' as never), false);
  });
});

describe('UI-2B RequestMemberEmailChange semantics', () => {
  it('is self-service command in approved list', () => {
    assert.ok(UI_2B_WORKFORCE_COMMANDS.includes('RequestMemberEmailChange'));
    assert.equal(UI_2B_WORKFORCE_COMMANDS.includes('ChangeMemberEmail' as never), false);
  });
});
