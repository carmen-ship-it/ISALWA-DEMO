import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import {
  QA_REAL_ORGANIZATION_ID,
  QA_SYNTH_ORGANIZATION_ID,
  resolveQaSynthRoster,
} from './qa-synth-roster';

function storeMock(opts: {
  emailToMember?: Record<
    string,
    { personId: string; memberId: string; organizationId: string; accessStatus?: string }
  >;
}): OsWorkforceStore {
  const emailToMember = opts.emailToMember ?? {};
  return {
    listAuthIdentitiesByProviderEmail: async (_provider: string, email: string) => {
      const row = emailToMember[email.trim().toLowerCase()];
      if (!row) return [];
      return [
        {
          id: `auth-${row.personId}`,
          personId: row.personId,
          provider: 'supabase',
          providerSubject: `sub-${row.personId}`,
          email,
          status: 'active',
          invitedAt: null,
          activatedAt: new Date('2020-01-01'),
          revokedAt: null,
        },
      ];
    },
    listMembersForPerson: async (personId: string, organizationId?: string) => {
      const hit = Object.values(emailToMember).find((row) => row.personId === personId);
      if (!hit) return [];
      if (organizationId && hit.organizationId !== organizationId) return [];
      return [
        {
          id: hit.memberId,
          organizationId: hit.organizationId,
          personId: hit.personId,
          employmentStatus: 'active',
          accessStatus: hit.accessStatus ?? 'active',
          employmentStartedAt: new Date('2020-01-01'),
          employmentEndedAt: null,
          version: 1,
        },
      ];
    },
    listRoleAssignmentsForMember: async (memberId: string, organizationId?: string) => {
      if (organizationId === QA_REAL_ORGANIZATION_ID) return [];
      if (memberId.startsWith('real-')) return [];
      return [
        {
          id: `ra-${memberId}`,
          organizationId: QA_SYNTH_ORGANIZATION_ID,
          memberId,
          roleKey: 'commercial.team.read',
          effectiveAt: new Date('2020-01-01'),
          endedAt: null,
        },
      ];
    },
    listDelegationsForDelegate: async () => [],
  } as unknown as OsWorkforceStore;
}

describe('resolveQaSynthRoster', () => {
  it('resolves SYNTH fixture emails to memberIds', async () => {
    const roster = await resolveQaSynthRoster(
      storeMock({
        emailToMember: {
          'w2.asesor@isalwa.demo': {
            personId: 'p-asesor',
            memberId: 'm-asesor',
            organizationId: QA_SYNTH_ORGANIZATION_ID,
          },
        },
      }),
    );
    assert.equal(roster.organizationId, QA_SYNTH_ORGANIZATION_ID);
    const asesor = roster.members.find((m) => m.functionId === 'asesor-comercial');
    assert.ok(asesor);
    assert.equal(asesor.memberId, 'm-asesor');
    assert.ok(asesor.grantedScopes.includes('commercial.team.read'));
  });

  it('fail-closes REAL organization memberships', async () => {
    const roster = await resolveQaSynthRoster(
      storeMock({
        emailToMember: {
          'w2.asesor@isalwa.demo': {
            personId: 'p-real',
            memberId: 'real-1',
            organizationId: QA_REAL_ORGANIZATION_ID,
          },
        },
      }),
    );
    assert.equal(
      roster.members.find((m) => m.functionId === 'asesor-comercial'),
      undefined,
    );
  });

  it('skips inactive SYNTH members', async () => {
    const roster = await resolveQaSynthRoster(
      storeMock({
        emailToMember: {
          'w2.asesor@isalwa.demo': {
            personId: 'p-inactive',
            memberId: 'm-inactive',
            organizationId: QA_SYNTH_ORGANIZATION_ID,
            accessStatus: 'disabled',
          },
        },
      }),
    );
    assert.equal(
      roster.members.find((m) => m.functionId === 'asesor-comercial'),
      undefined,
    );
  });
});
