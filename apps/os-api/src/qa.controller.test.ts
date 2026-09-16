import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import {
  QA_REAL_ORGANIZATION_ID,
  QA_SYNTH_ORGANIZATION_ID,
  resolveQaSynthRoster,
} from './qa-synth-roster';

describe('resolveQaSynthRoster', () => {
  it('resolves fixture emails to SYNTH memberIds only', async () => {
    const store = {
      listAuthIdentitiesByProviderEmail: async (_provider: string, email: string) => {
        if (email !== 'w2.asesor@isalwa.demo') return [];
        return [
          {
            id: 'auth-1',
            personId: 'person-asesor',
            provider: 'supabase',
            providerSubject: 'sub-1',
            email,
            status: 'active',
            invitedAt: null,
            activatedAt: new Date(),
            revokedAt: null,
          },
        ];
      },
      listMembersForPerson: async (personId: string, organizationId?: string) => {
        if (personId !== 'person-asesor' || organizationId !== QA_SYNTH_ORGANIZATION_ID) {
          return [];
        }
        return [
          {
            id: 'mem-asesor',
            organizationId: QA_SYNTH_ORGANIZATION_ID,
            personId,
            employmentStatus: 'active',
            accessStatus: 'active',
            employmentStartedAt: new Date(),
            employmentEndedAt: null,
            version: 1,
          },
        ];
      },
      listRoleAssignmentsForMember: async () => [
        {
          id: 'ra-1',
          organizationId: QA_SYNTH_ORGANIZATION_ID,
          memberId: 'mem-asesor',
          roleKey: 'commercial.team.read',
          effectiveAt: new Date('2020-01-01'),
          endedAt: null,
        },
      ],
      listDelegationsForDelegate: async () => [],
    } as unknown as OsWorkforceStore;

    const roster = await resolveQaSynthRoster(store, new Date('2026-09-16T12:00:00.000Z'));
    assert.equal(roster.organizationId, QA_SYNTH_ORGANIZATION_ID);
    assert.equal(roster.members.length, 1);
    assert.equal(roster.members[0]?.email, 'w2.asesor@isalwa.demo');
    assert.equal(roster.members[0]?.memberId, 'mem-asesor');
    assert.deepEqual(roster.members[0]?.grantedScopes, ['commercial.team.read']);
  });

  it('fails closed when email maps only to REAL org', async () => {
    const store = {
      listAuthIdentitiesByProviderEmail: async () => [
        {
          id: 'auth-1',
          personId: 'person-x',
          provider: 'supabase',
          providerSubject: 'sub-1',
          email: 'w2.asesor@isalwa.demo',
          status: 'active',
          invitedAt: null,
          activatedAt: new Date(),
          revokedAt: null,
        },
      ],
      listMembersForPerson: async () => [
        {
          id: 'mem-real',
          organizationId: QA_REAL_ORGANIZATION_ID,
          personId: 'person-x',
          employmentStatus: 'active',
          accessStatus: 'active',
          employmentStartedAt: new Date(),
          employmentEndedAt: null,
          version: 1,
        },
      ],
      listRoleAssignmentsForMember: async () => [],
      listDelegationsForDelegate: async () => [],
    } as unknown as OsWorkforceStore;

    const roster = await resolveQaSynthRoster(store);
    assert.equal(roster.members.length, 0);
  });

  it('returns empty members when nothing resolves', async () => {
    const store = {
      listAuthIdentitiesByProviderEmail: async () => [],
      listMembersForPerson: async () => [],
      listRoleAssignmentsForMember: async () => [],
      listDelegationsForDelegate: async () => [],
    } as unknown as OsWorkforceStore;

    const roster = await resolveQaSynthRoster(store);
    assert.equal(roster.members.length, 0);
  });
});
