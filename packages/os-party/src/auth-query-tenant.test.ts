import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { RequestContext } from '@isalwa/os-contracts';
import { LocationCommandService } from './location-command-service';
import { PartyCommandService } from './party-command-service';
import type { OsPartyStore } from './os-party-store';

const ORG = 'org-session';
const ACTOR = 'actor-session';

function ctx(): RequestContext {
  return {
    organizationId: ORG,
    actorMemberId: ACTOR,
    personId: 'person',
    authIdentityId: 'auth',
    correlationId: 'corr',
    effectiveAt: new Date('2026-08-01T12:00:00.000Z'),
  };
}

function recordingStore() {
  const calls: Array<{ method: string; memberId: string; organizationId?: string }> = [];
  const store = {
    async getMemberInOrg(organizationId: string, memberId: string) {
      return organizationId === ORG && memberId === ACTOR
        ? { id: ACTOR, organizationId: ORG, accessStatus: 'active' }
        : null;
    },
    async listRoleAssignmentsForMember(memberId: string, organizationId?: string) {
      calls.push({ method: 'listRoleAssignmentsForMember', memberId, organizationId });
      return [];
    },
    async listDelegationsForDelegate(memberId: string, organizationId?: string) {
      calls.push({ method: 'listDelegationsForDelegate', memberId, organizationId });
      return [];
    },
    async getPartyInOrg(organizationId: string, partyId: string) {
      calls.push({ method: 'getPartyInOrg', memberId: partyId, organizationId });
      return organizationId === ORG ? { id: partyId, organizationId: ORG, status: 'active' } : null;
    },
    async getCommercialAccountForParty(organizationId: string, partyId: string) {
      calls.push({ method: 'getCommercialAccountForParty', memberId: partyId, organizationId });
      return null;
    },
    async listCustomerCoverageGrants(organizationId: string, partyId: string) {
      calls.push({ method: 'listCustomerCoverageGrants', memberId: partyId, organizationId });
      return [];
    },
    async isDirectReport(organizationId: string, _managerId: string, memberId: string) {
      calls.push({ method: 'isDirectReport', memberId, organizationId });
      return false;
    },
    async findIdempotency() {
      return null;
    },
    async runInTransaction(fn: (store: OsPartyStore) => Promise<unknown>) {
      return fn(store as unknown as OsPartyStore);
    },
  };
  return { store: store as unknown as OsPartyStore, calls };
}

describe('party and location auth queries', () => {
  it('scopes role and delegation reads by the session organization before denying', async () => {
    const party = recordingStore();
    const location = recordingStore();
    await assert.rejects(
      new PartyCommandService(party.store).execute('CreateParty', ctx(), {
        partyKind: 'organization',
        displayName: 'Acme',
      }),
      /PERMISSION_DENIED/,
    );
    await assert.rejects(
      new LocationCommandService(location.store).execute('CreateLocation', ctx(), {
        partyId: 'party-1',
        label: 'Planta',
      }),
      // T02 non-disclosure: a caller who cannot know the customer gets the missing-id answer.
      /NOT_FOUND/,
    );
    for (const calls of [party.calls, location.calls]) {
      assert.ok(calls.length >= 2);
      assert.deepEqual(
        calls.map((call) => call.organizationId),
        calls.map(() => ORG),
      );
    }
  });
});
