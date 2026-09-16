import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { COMMAND_REQUIRED_SCOPES } from '@isalwa/os-contracts';
import {
  ADMIN_REASSIGN_WORK_COMMAND,
  ADMIN_REASSIGN_WORK_COMMANDS,
  FOLLOW_UP_UI_COMMANDS,
} from '@/lib/work/command-types';
import { memberAdminVisibility } from '@/lib/workforce/lifecycle-ui';
import { sampleActiveMember, sampleSuspendedMember, sampleTerminatedMember } from '@/lib/workforce/fixtures';

const webRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');

function source(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), 'utf8');
}

describe('Wave A ReassignWork admin surface', () => {
  it('keeps ReassignWork scoped to people.admin', () => {
    assert.equal(COMMAND_REQUIRED_SCOPES.ReassignWork, 'people.admin');
    assert.deepEqual(ADMIN_REASSIGN_WORK_COMMANDS, ['ReassignWork']);
    assert.equal(ADMIN_REASSIGN_WORK_COMMAND, 'ReassignWork');
  });

  it('exposes ReassignWork on admin member detail, not on /trabajo or follow-up', () => {
    const trabajo = source('app/(app)/trabajo/page.tsx');
    const followUpActions = source('lib/work/actions.ts');
    const reassignAction = source('lib/work/reassign-work-action.ts');
    const panel = source('components/admin/reassign-work-panel.tsx');
    const memberPage = source('app/(app)/administracion/equipo/[memberId]/page.tsx');

    assert.doesNotMatch(trabajo, /ReassignWork|reassignWorkAction|Trabajo activo/);
    assert.doesNotMatch(followUpActions, /ReassignWork|reassignWorkAction/);
    assert.equal((FOLLOW_UP_UI_COMMANDS as readonly string[]).includes('ReassignWork'), false);

    assert.match(reassignAction, /executeWorkCommand\(/);
    assert.match(reassignAction, /ADMIN_REASSIGN_WORK_COMMAND/);
    assert.match(reassignAction, /newOwnerMemberId/);
    assert.match(panel, /reassignWorkAction/);
    assert.match(panel, /Trabajo activo/);
    assert.match(panel, /ServerMemberTypeahead/);
    assert.match(panel, /historial/i);
    assert.match(memberPage, /ReassignWorkPanel/);
    assert.match(memberPage, /listWorkItems\(\{[\s\S]*ownerMemberId:\s*memberId/);
    assert.match(memberPage, /status:\s*'open'/);
  });

  it('uses Spanish operator copy without authority strings in the panel', () => {
    const panel = source('components/admin/reassign-work-panel.tsx');
    assert.match(panel, /Nueva persona responsable/);
    assert.match(panel, /Confirmo la reasignación/);
    assert.match(panel, /El historial se conserva/);
    assert.doesNotMatch(panel, /['"]people\.admin['"]/);
    assert.doesNotMatch(panel, /['"]roleKey['"]/);
    assert.doesNotMatch(panel, /['"]capabilityKey['"]/);
    assert.doesNotMatch(panel, /['"]ReassignWork['"]/);
  });

  it('shows reassign surface for active and suspended members only', () => {
    assert.equal(memberAdminVisibility(sampleActiveMember, 'admin-1').reassignWork, true);
    assert.equal(memberAdminVisibility(sampleSuspendedMember, 'admin-1').reassignWork, true);
    assert.equal(memberAdminVisibility(sampleTerminatedMember, 'admin-1').reassignWork, false);
    const invited = memberAdminVisibility(
      { ...sampleActiveMember, accessStatus: 'invited' },
      'admin-1',
    );
    assert.equal(invited.reassignWork, false);
  });

  it('points terminate open-work hint at the local Trabajo activo section', () => {
    const panel = source('components/admin/member-admin-actions-panel.tsx');
    assert.match(panel, /#trabajo-activo/);
    assert.doesNotMatch(panel, /href="\/trabajo"/);
  });
});
