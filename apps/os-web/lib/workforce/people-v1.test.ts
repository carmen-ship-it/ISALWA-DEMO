import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { InviteMemberPayloadSchema } from '@isalwa/os-contracts';
import { OsApiError } from '@/lib/api/os-api-errors';
import {
  INVITE_PROVIDER_FAILED_MESSAGE,
  INVITE_PROVIDER_NOT_CONFIGURED_MESSAGE,
  mapWorkforceCommandError,
} from '@/lib/workforce/command-errors';
import {
  PEOPLE_V1_INVITE_COMMANDS,
  UI_2B_WORKFORCE_COMMANDS,
  WORKFORCE_COMMANDS_BLOCKED_IN_UI,
  WORKFORCE_COMMANDS_EXPOSED_IN_UI,
} from '@/lib/workforce/command-types';
import {
  INVITE_FORBIDDEN_FIELDS,
  INVITE_FORM_FIELD_NAMES,
  INVITE_OMITTED_COMMAND_FIELDS,
  buildInviteMemberPayload,
  inviteEmployeeVisible,
} from '@/lib/workforce/invite';
import { memberAdminVisibility } from '@/lib/workforce/lifecycle-ui';
import { sampleActiveMember, sampleSuspendedMember } from '@/lib/workforce/fixtures';

const webRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');

function source(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), 'utf8');
}

describe('People V1 invite visibility', () => {
  it('people.admin sees invite action', () => {
    assert.equal(inviteEmployeeVisible({ peopleAdmin: true }), true);
    const equipo = source('app/(app)/administracion/equipo/page.tsx');
    assert.match(equipo, /inviteEmployeeVisible\(\{ peopleAdmin \}\)/);
    assert.match(equipo, /INVITE_EMPLOYEE_ACTION_LABEL/);
    assert.match(equipo, /inviteMemberHref\(\)/);
  });

  it('non-admin cannot see invite', () => {
    assert.equal(inviteEmployeeVisible({ peopleAdmin: false }), false);
    const equipo = source('app/(app)/administracion/equipo/page.tsx');
    const invite = source('app/(app)/administracion/equipo/invitar/page.tsx');
    assert.match(equipo, /AccessDeniedState/);
    assert.match(invite, /probeAdminAccess/);
    assert.match(invite, /inviteEmployeeVisible/);
    assert.match(invite, /AccessDeniedState/);
  });
});

describe('People V1 canonical InviteMember payload', () => {
  it('matches InviteMember schema and omits unused manager', () => {
    const built = buildInviteMemberPayload({
      email: 'ana@isalwa.bo',
      givenName: 'Ana',
      familyName: 'Quispe',
      roleKey: 'sales_rep',
      departmentId: 'dept-ventas',
    });
    assert.equal(built.ok, true);
    if (!built.ok) return;
    assert.deepEqual(InviteMemberPayloadSchema.parse(built.payload), {
      email: 'ana@isalwa.bo',
      givenName: 'Ana',
      familyName: 'Quispe',
      roleKey: 'sales_rep',
      departmentId: 'dept-ventas',
    });
    assert.equal('managerMemberId' in built.payload, false);
    assert.deepEqual(INVITE_OMITTED_COMMAND_FIELDS, ['managerMemberId']);
  });

  it('omits blank department and does not invent fields', () => {
    const built = buildInviteMemberPayload({
      email: 'ana@isalwa.bo',
      givenName: 'Ana',
      familyName: 'Quispe',
      roleKey: 'sales_rep',
      departmentId: '   ',
    });
    assert.equal(built.ok, true);
    if (!built.ok) return;
    assert.equal('departmentId' in built.payload, false);
    for (const key of INVITE_FORBIDDEN_FIELDS) {
      assert.equal(key in built.payload, false);
    }
  });

  it('does not infer role from cargo or auto-grant people.admin', () => {
    const missing = buildInviteMemberPayload({
      email: 'ana@isalwa.bo',
      givenName: 'Ana',
      familyName: 'Quispe',
      roleKey: '',
    });
    assert.equal(missing.ok, false);

    const explicit = buildInviteMemberPayload({
      email: 'ana@isalwa.bo',
      givenName: 'Ana',
      familyName: 'Quispe',
      roleKey: 'sales_rep',
    });
    assert.equal(explicit.ok, true);
    if (!explicit.ok) return;
    assert.equal(explicit.payload.roleKey, 'sales_rep');
    assert.notEqual(explicit.payload.roleKey, 'people.admin');
    assert.equal(INVITE_FORM_FIELD_NAMES.includes('cargo' as never), false);
    assert.equal(INVITE_FORM_FIELD_NAMES.includes('roleKey'), true);
  });

  it('wires InviteMember in the server action and not a second invite command', () => {
    const actions = source('lib/workforce/actions.ts');
    assert.match(actions, /executeWorkforceCommand\('InviteMember'/);
    assert.equal(actions.includes('RehireMember'), false);
    assert.equal(actions.includes('ChangeMemberEmail'), false);
    assert.equal(actions.includes('RetryAuthProviderSync'), false);
    assert.equal(/password/i.test(actions), false);
  });
});

describe('People V1 forbidden workforce commands', () => {
  it('exposes InviteMember without the blocked commands', () => {
    assert.deepEqual(PEOPLE_V1_INVITE_COMMANDS, ['InviteMember']);
    assert.ok(WORKFORCE_COMMANDS_EXPOSED_IN_UI.includes('InviteMember'));
    assert.ok(WORKFORCE_COMMANDS_EXPOSED_IN_UI.includes('SuspendMember'));
    assert.ok(WORKFORCE_COMMANDS_EXPOSED_IN_UI.includes('TerminateMember'));
    assert.ok(WORKFORCE_COMMANDS_EXPOSED_IN_UI.includes('ChangeRole'));
    assert.ok(WORKFORCE_COMMANDS_EXPOSED_IN_UI.includes('ChangeDepartment'));
    assert.ok(WORKFORCE_COMMANDS_EXPOSED_IN_UI.includes('ChangeManager'));
    const exposed = WORKFORCE_COMMANDS_EXPOSED_IN_UI as readonly string[];
    for (const blocked of WORKFORCE_COMMANDS_BLOCKED_IN_UI) {
      assert.equal(exposed.includes(blocked), false);
    }
    assert.equal(WORKFORCE_COMMANDS_EXPOSED_IN_UI.includes('RehireMember' as never), false);
    assert.equal(WORKFORCE_COMMANDS_EXPOSED_IN_UI.includes('ChangeMemberEmail' as never), false);
    assert.equal(WORKFORCE_COMMANDS_EXPOSED_IN_UI.includes('RetryAuthProviderSync' as never), false);
  });

  it('invite UI has no cargo, password, or forbidden commands', () => {
    const form = source('components/admin/invite-member-form.tsx');
    const page = source('app/(app)/administracion/equipo/invitar/page.tsx');
    const combined = `${form}\n${page}`;
    assert.equal(/cargo|jobTitle|password|RehireMember|ChangeMemberEmail|RetryAuthProviderSync/i.test(combined), false);
    assert.match(form, /defaultValue=""/);
  });
});

describe('People V1 existing workforce admin regression', () => {
  it('keeps UI-2B suspend, terminate, role, department, and manager commands', () => {
    assert.ok(UI_2B_WORKFORCE_COMMANDS.includes('SuspendMember'));
    assert.ok(UI_2B_WORKFORCE_COMMANDS.includes('ActivateMember'));
    assert.ok(UI_2B_WORKFORCE_COMMANDS.includes('TerminateMember'));
    assert.ok(UI_2B_WORKFORCE_COMMANDS.includes('ChangeRole'));
    assert.ok(UI_2B_WORKFORCE_COMMANDS.includes('ChangeDepartment'));
    assert.ok(UI_2B_WORKFORCE_COMMANDS.includes('ChangeManager'));
    assert.equal(UI_2B_WORKFORCE_COMMANDS.length, 9);
  });

  it('keeps existing lifecycle visibility', () => {
    const active = memberAdminVisibility(sampleActiveMember, 'admin-1');
    assert.equal(active.suspend, true);
    assert.equal(active.terminate, true);
    assert.equal(active.organization, true);
    const suspended = memberAdminVisibility(sampleSuspendedMember, 'admin-1');
    assert.equal(suspended.reactivate, true);
    const invited = memberAdminVisibility(
      { ...sampleActiveMember, accessStatus: 'invited' },
      'admin-1',
    );
    assert.equal(invited.reactivate, false);
    assert.equal(invited.organization, false);
  });
});

describe('People V1 provider honesty', () => {
  it('surfaces provider configuration and invite failures without session-expired copy', () => {
    const missing = mapWorkforceCommandError(
      'InviteMember',
      new OsApiError({
        kind: 'unauthorized',
        status: 401,
        code: 'PROVIDER_NOT_CONFIGURED',
        message: '',
      }),
    );
    assert.equal(missing, INVITE_PROVIDER_NOT_CONFIGURED_MESSAGE);
    assert.doesNotMatch(missing, /sesión/i);
    assert.match(missing, /contraseña/i);

    const failed = mapWorkforceCommandError(
      'InviteMember',
      new OsApiError({
        kind: 'unavailable',
        status: 500,
        code: 'PROVIDER_INVITE_FAILED',
        message: '',
      }),
    );
    assert.equal(failed, INVITE_PROVIDER_FAILED_MESSAGE);
    assert.match(failed, /proveedor de acceso/i);
  });

  it('still denies non-admin invite attempts', () => {
    const msg = mapWorkforceCommandError(
      'InviteMember',
      new OsApiError({ kind: 'forbidden', status: 403, code: 'PERMISSION_DENIED', message: '' }),
    );
    assert.match(msg, /permiso/i);
  });
});
