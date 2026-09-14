import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PrismaOsPartyStore } from './prisma-party-store';
import { PrismaOsWorkStore } from './prisma-work-store';
import { PrismaOsWorkforceStore } from './prisma-workforce-store';

const SESSION_ORG = 'org-session';
const FOREIGN_ORG = 'org-foreign';
const MEMBER_ID = 'member-shared';
const PERSON_ID = 'person-shared';

type Where = Record<string, unknown>;

function roleRow(organizationId: string, roleKey: string) {
  return {
    id: `role-${organizationId}`,
    organizationId,
    memberId: MEMBER_ID,
    roleKey,
    effectiveAt: new Date('2026-01-01T00:00:00.000Z'),
    endedAt: null,
  };
}

function delegationRow(organizationId: string, delegatorMemberId: string) {
  return {
    id: `delegation-${organizationId}`,
    organizationId,
    delegatorMemberId,
    delegateMemberId: MEMBER_ID,
    scopesJson: ['approval.act'],
    startsAt: new Date('2026-01-01T00:00:00.000Z'),
    expiresAt: new Date('2027-01-01T00:00:00.000Z'),
    revokedAt: null,
  };
}

function memberRow(organizationId: string, id: string) {
  return {
    id,
    organizationId,
    personId: PERSON_ID,
    employmentStatus: 'active',
    accessStatus: 'invited',
    employmentStartedAt: null,
    employmentEndedAt: null,
    version: 0,
  };
}

function fakeDb() {
  const calls: Array<{ model: string; where: Where }> = [];
  const roles = [roleRow(SESSION_ORG, 'sales_rep'), roleRow(FOREIGN_ORG, 'foreign_admin')];
  const delegations = [
    delegationRow(SESSION_ORG, 'delegator-session'),
    delegationRow(FOREIGN_ORG, 'delegator-foreign'),
  ];
  const members = [memberRow(SESSION_ORG, 'member-session'), memberRow(FOREIGN_ORG, 'member-foreign')];

  function matches(row: Record<string, unknown>, where: Where): boolean {
    return Object.entries(where).every(([key, value]) => row[key] === value);
  }

  const db = {
    osRoleAssignment: {
      async findMany(args: { where: Where }) {
        calls.push({ model: 'osRoleAssignment', where: args.where });
        return roles.filter((row) => matches(row, args.where));
      },
    },
    osDelegation: {
      async findMany(args: { where: Where }) {
        calls.push({ model: 'osDelegation', where: args.where });
        return delegations.filter((row) => matches(row, args.where));
      },
    },
    osOrganizationMember: {
      async findMany(args: { where: Where }) {
        calls.push({ model: 'osOrganizationMember', where: args.where });
        return members.filter((row) => matches(row, args.where));
      },
    },
  };

  return { db, calls };
}

function activeMember(organizationId: string, id: string) {
  return { ...memberRow(organizationId, id), accessStatus: 'active' };
}

describe('Prisma active membership selection', () => {
  it('does not pick the first active membership when several exist', async () => {
    const members = [activeMember(SESSION_ORG, 'member-a'), activeMember(FOREIGN_ORG, 'member-b')];
    const store = new PrismaOsWorkforceStore({
      osOrganizationMember: {
        async findMany(args: { where: Where }) {
          return members.filter((row) =>
            Object.entries(args.where).every(([key, value]) => row[key as keyof typeof row] === value),
          );
        },
      },
    } as never);

    assert.equal(await store.findActiveMemberForPerson(PERSON_ID), null);
    assert.equal((await store.findActiveMemberForPerson(PERSON_ID, SESSION_ORG))?.id, 'member-a');
    assert.equal(await store.findActiveMemberForPerson(PERSON_ID, 'org-missing'), null);
  });
});

describe('workforce auth SQL tenant predicates', () => {
  it('includes session organizationId in role and delegation where, and does not return the foreign role', async () => {
    const { db, calls } = fakeDb();
    const store = new PrismaOsWorkforceStore(db as never);

    const roles = await store.listRoleAssignmentsForMember(MEMBER_ID, SESSION_ORG);
    const delegations = await store.listDelegationsForDelegate(MEMBER_ID, SESSION_ORG);

    assert.deepEqual(calls[0], {
      model: 'osRoleAssignment',
      where: { memberId: MEMBER_ID, organizationId: SESSION_ORG },
    });
    assert.deepEqual(calls[1], {
      model: 'osDelegation',
      where: { delegateMemberId: MEMBER_ID, organizationId: SESSION_ORG },
    });
    assert.deepEqual(roles.map((row) => row.organizationId), [SESSION_ORG]);
    assert.equal(roles.some((row) => row.roleKey === 'foreign_admin'), false);
    assert.deepEqual(delegations.map((row) => row.organizationId), [SESSION_ORG]);
    assert.equal(delegations.some((row) => row.delegatorMemberId === 'delegator-foreign'), false);
  });

  it('includes the proven organization in the member where and omits the other organization member', async () => {
    const { db, calls } = fakeDb();
    const store = new PrismaOsWorkforceStore(db as never);

    const members = await store.listMembersForPerson(PERSON_ID, SESSION_ORG);

    assert.deepEqual(calls[0], {
      model: 'osOrganizationMember',
      where: { personId: PERSON_ID, organizationId: SESSION_ORG },
    });
    assert.deepEqual(members.map((row) => row.id), ['member-session']);
    assert.equal(members.some((row) => row.organizationId === FOREIGN_ORG), false);
  });

  it('keeps a member-only role query valid when organizationId is omitted', async () => {
    const { db, calls } = fakeDb();
    const store = new PrismaOsWorkforceStore(db as never);
    await store.listRoleAssignmentsForMember(MEMBER_ID);
    assert.deepEqual(calls[0]?.where, { memberId: MEMBER_ID });
  });

  it('applies the same session organization predicate on the work and party stores', async () => {
    const work = fakeDb();
    const party = fakeDb();
    const workStore = new PrismaOsWorkStore(work.db as never);
    const partyStore = new PrismaOsPartyStore(party.db as never);

    const workRoles = await workStore.listRoleAssignmentsForMember(MEMBER_ID, SESSION_ORG);
    const partyRoles = await partyStore.listRoleAssignmentsForMember(MEMBER_ID, SESSION_ORG);
    await workStore.listDelegationsForDelegate(MEMBER_ID, SESSION_ORG);
    await partyStore.listDelegationsForDelegate(MEMBER_ID, SESSION_ORG);

    assert.deepEqual(work.calls[0]?.where, { memberId: MEMBER_ID, organizationId: SESSION_ORG });
    assert.deepEqual(party.calls[0]?.where, { memberId: MEMBER_ID, organizationId: SESSION_ORG });
    assert.deepEqual(work.calls[1]?.where, {
      delegateMemberId: MEMBER_ID,
      organizationId: SESSION_ORG,
    });
    assert.deepEqual(party.calls[1]?.where, {
      delegateMemberId: MEMBER_ID,
      organizationId: SESSION_ORG,
    });
    assert.deepEqual(workRoles.map((row) => row.roleKey), ['sales_rep']);
    assert.deepEqual(partyRoles.map((row) => row.roleKey), ['sales_rep']);
  });
});
