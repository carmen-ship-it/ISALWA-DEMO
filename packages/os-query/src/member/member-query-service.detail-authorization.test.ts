import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { MemberSummaryReadModel } from '@isalwa/os-contracts';
import type { QueryContext } from '../query-context';
import { MemberQueryService } from './member-query-service';
import type { MemberQueryStorePort } from './member-query-store-port';

const ORG = 'org-a';
const FOREIGN_ORG = 'org-b';
const AS_OF = new Date('2026-09-14T15:00:00.000Z');

const SELF = 'mem-self';
const COLLEAGUE = 'mem-colleague';
const ADMIN = 'mem-admin';
const LEAD = 'mem-lead';

function ctx(memberId: string, roleKeys: string[] = []): QueryContext {
  return {
    organizationId: ORG,
    actorMemberId: memberId,
    personId: `person-${memberId}`,
    authIdentityId: `auth-${memberId}`,
    correlationId: 'corr',
    effectiveAt: AS_OF,
    auth: {
      memberId,
      organizationId: ORG,
      accessStatus: 'active',
      roleKeys,
      delegatedScopes: [],
      delegatedApproverFor: [],
    },
  };
}

function row(memberId: string, organizationId = ORG): MemberSummaryReadModel {
  return {
    memberId,
    organizationId,
    personId: `person-${memberId}`,
    givenName: 'Ana',
    familyName: 'Quispe',
    displayName: 'Ana Quispe',
    email: `${memberId}@empresa.example`,
    accessStatus: 'active',
    employmentStatus: 'active',
    employmentStartedAt: '2024-02-01T00:00:00.000Z',
    employmentEndedAt: null,
    roleKeys: ['ASESOR DE VENTA', 'people.admin', 'commercial.team.read', 'sales_rep'],
    departmentId: 'dept-1',
    departmentName: 'Comercial',
    managerMemberId: 'mem-boss',
    activeDelegationCount: 2,
  };
}

const rows = [row(SELF), row(COLLEAGUE), row(ADMIN), row('mem-foreign', FOREIGN_ORG)];

function service() {
  const store: MemberQueryStorePort = {
    async listMembers() {
      return { items: [], hasMore: false };
    },
    async searchActiveMembers() {
      return { items: [], hasMore: false };
    },
    async getMemberSummary(organizationId, memberId) {
      return rows.find((r) => r.organizationId === organizationId && r.memberId === memberId) ?? null;
    },
    async listCapabilityStateOverrides() {
      return [];
    },
    async listDirectReportMemberIds(_org, manager) {
      return manager === LEAD ? [COLLEAGUE] : [];
    },
  };
  return new MemberQueryService({ store, encodeCursor: () => 'cursor' });
}

const SENSITIVE_KEYS = [
  'email',
  'personId',
  'managerMemberId',
  'employmentStartedAt',
  'employmentEndedAt',
  'employmentStatus',
  'accessStatus',
  'activeDelegationCount',
  'departmentId',
] as const;

function assertNoSensitive(detail: object) {
  for (const key of SENSITIVE_KEYS) {
    assert.equal(key in detail, false, `${key} must not be exposed to a peer`);
  }
  assert.equal(JSON.stringify(detail).includes('@empresa.example'), false);
  assert.equal(JSON.stringify(detail).includes('mem-boss'), false);
}

describe('MemberQueryService.getMember field policy (S14)', () => {
  it('gives a plain member only display fields for another member', async () => {
    const detail = await service().getMember(ctx(SELF), COLLEAGUE);
    assertNoSensitive(detail);
    assert.equal(detail.memberId, COLLEAGUE);
    assert.equal(detail.organizationId, ORG);
    assert.equal(detail.displayName, 'Ana Quispe');
    assert.equal(detail.givenName, 'Ana');
    assert.equal(detail.familyName, 'Quispe');
    assert.equal(detail.departmentName, 'Comercial');
  });

  it('keeps the cargo label for display but never exposes scope or role keys to a peer', async () => {
    const detail = await service().getMember(ctx(SELF), COLLEAGUE);
    assert.deepEqual(detail.roleKeys, ['ASESOR DE VENTA']);
  });

  it('does not widen a peer view for commercial.team.read over a direct report', async () => {
    const detail = await service().getMember(ctx(LEAD, ['commercial.team.read']), COLLEAGUE);
    assertNoSensitive(detail);
  });

  it('does not widen a peer view for commercial.org.read', async () => {
    const detail = await service().getMember(ctx(SELF, ['commercial.org.read']), COLLEAGUE);
    assertNoSensitive(detail);
  });

  it('still returns the full row for the member reading their own record', async () => {
    const detail = await service().getMember(ctx(SELF), SELF);
    assert.deepEqual(detail, row(SELF));
  });

  it('still returns the full row to people.admin for any member of the tenant', async () => {
    const detail = await service().getMember(ctx(ADMIN, ['people.admin']), COLLEAGUE);
    assert.deepEqual(detail, row(COLLEAGUE));
  });

  it('keeps NOT_FOUND identical for a missing id and a foreign-tenant id', async () => {
    const svc = service();
    const missing = await svc.getMember(ctx(SELF), 'nope').catch((e: Error) => e.message);
    const foreign = await svc.getMember(ctx(SELF), 'mem-foreign').catch((e: Error) => e.message);
    assert.equal(missing, 'NOT_FOUND');
    assert.equal(foreign, 'NOT_FOUND');
  });
});
