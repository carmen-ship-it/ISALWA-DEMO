import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createId } from '@isalwa/ts-utils';
import { LocalAuthProviderPort } from './auth-provider';
import { MemoryOsStore } from './memory-store';
import {
  collectTerminationImpact,
  isQuoteOwnershipReleased,
} from './termination-impact';
import { WorkforceCommandService } from './workforce-command-service';
import type { RequestContext } from '@isalwa/os-contracts';

function ctx(
  organizationId: string,
  actorMemberId: string,
  actorPersonId: string,
  actorAuthIdentityId: string,
  effectiveAt = new Date('2026-06-01T12:00:00.000Z'),
): RequestContext {
  return {
    organizationId,
    actorMemberId,
    personId: actorPersonId,
    authIdentityId: actorAuthIdentityId,
    correlationId: createId(),
    effectiveAt,
  };
}

async function seedActiveMember(store: MemoryOsStore, svc: WorkforceCommandService, orgId: string) {
  const admin = await store.seedAdminMember(orgId, 'admin@isalwa.bo', 'Admin', 'User');
  const invited = await svc.execute(
    'InviteMember',
    ctx(orgId, admin.member.id, admin.person.id, admin.auth.id),
    {
      email: 'ana@isalwa.bo',
      givenName: 'Ana',
      familyName: 'Pérez',
      roleKey: 'sales_rep',
    },
  );
  const memberId = invited.data.memberId as string;
  await svc.execute('ActivateMember', ctx(orgId, memberId, '', ''), {
    memberId,
    providerSubject: 'subject:ana',
  });
  return { admin, memberId };
}

describe('termination preflight fail-closed', () => {
  it('isQuoteOwnershipReleased only for cancelled (no closed quote status)', () => {
    assert.equal(isQuoteOwnershipReleased('cancelled'), true);
    assert.equal(isQuoteOwnershipReleased('draft'), false);
    assert.equal(isQuoteOwnershipReleased('submitted'), false);
    assert.equal(isQuoteOwnershipReleased('accepted'), false);
    assert.equal(isQuoteOwnershipReleased('closed'), false);
  });

  it('23:47 §B2: TerminateMember with commercial account ownership revokes access at once and records the account as unresolved', async () => {
    const store = new MemoryOsStore();
    const auth = new LocalAuthProviderPort();
    const svc = new WorkforceCommandService(store, auth);
    const org = await store.seedOrganization('ISALWA', 'isalwa');
    const { admin, memberId } = await seedActiveMember(store, svc, org.id);

    const accountId = createId();
    store.commercialAccounts.push({
      id: accountId,
      organizationId: org.id,
      partyId: createId(),
      ownerMemberId: memberId,
      status: 'active',
    });

    const result = await svc.execute(
      'TerminateMember',
      ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
      { memberId },
    );
    assert.equal((await store.getMember(memberId))?.accessStatus, 'revoked');
    assert.equal(store.commercialAccounts[0]?.ownerMemberId, memberId, 'history kept: nothing is reassigned silently');
    assert.deepEqual(result.data.unresolvedOwnership, [{ key: 'commercial_accounts', count: 1, ids: [accountId] }]);
  });

  it('23:47 §B2: opportunity, quote, order and pending approval are counted as unresolved, never as blockers', async () => {
    const store = new MemoryOsStore();
    const auth = new LocalAuthProviderPort();
    const svc = new WorkforceCommandService(store, auth);
    const org = await store.seedOrganization('ISALWA', 'isalwa');
    const { admin, memberId } = await seedActiveMember(store, svc, org.id);
    const asOf = new Date('2026-06-01T12:00:00.000Z');

    store.opportunities.push({
      id: createId(),
      organizationId: org.id,
      ownerMemberId: memberId,
      title: 'Opp A',
      status: 'open',
    });
    let impact = await collectTerminationImpact(store, org.id, memberId, asOf);
    assert.equal(impact.unresolvedCount, 1);
    assert.ok(impact.categories.find((c) => c.key === 'open_opportunities')!.count === 1);

    store.quotes.push({
      id: createId(),
      organizationId: org.id,
      ownerMemberId: memberId,
      quoteNumber: 'Q-1',
      status: 'draft',
    });
    impact = await collectTerminationImpact(store, org.id, memberId, asOf);
    assert.equal(impact.unresolvedCount, 2);
    const quotesCat = impact.categories.find((c) => c.key === 'active_quotes')!;
    assert.equal(quotesCat.count, 1);
    assert.ok(quotesCat.foundationGaps?.[0]?.includes('AssignQuoteOwner'));
    assert.equal(quotesCat.label, 'Cotizaciones activas');

    store.orders.push({
      id: createId(),
      organizationId: org.id,
      ownerMemberId: memberId,
      orderNumber: 'O-1',
      status: 'open',
    });
    store.approvalRequests.push({
      id: createId(),
      organizationId: org.id,
      approverMemberId: memberId,
      subjectType: 'quote',
      subjectId: createId(),
      status: 'pending',
    });
    const result = await svc.execute(
      'TerminateMember',
      ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
      { memberId },
    );
    assert.equal((await store.getMember(memberId))?.accessStatus, 'revoked');
    const keys = (result.data.unresolvedOwnership as Array<{ key: string }>).map((entry) => entry.key).sort();
    assert.deepEqual(keys, ['active_orders', 'active_quotes', 'open_opportunities', 'pending_approvals']);
  });

  it('23:47 §B2: direct reports stay unresolved; delegations end with the lifecycle and are not unresolved', async () => {
    const store = new MemoryOsStore();
    const auth = new LocalAuthProviderPort();
    const svc = new WorkforceCommandService(store, auth);
    const org = await store.seedOrganization('ISALWA', 'isalwa');
    const { admin, memberId } = await seedActiveMember(store, svc, org.id);
    const asOf = new Date('2026-06-01T12:00:00.000Z');

    const report = await store.seedAdminMember(org.id, 'report@isalwa.bo', 'Rep', 'Ort');
    store.managerAssignments.push({
      id: createId(),
      organizationId: org.id,
      memberId: report.member.id,
      managerMemberId: memberId,
      effectiveAt: new Date('2026-01-01T00:00:00.000Z'),
      endedAt: null,
    });
    let impact = await collectTerminationImpact(store, org.id, memberId, asOf);
    assert.equal(impact.unresolvedCount, 1);
    store.managerAssignments = [];

    store.delegations.push({
      id: createId(),
      organizationId: org.id,
      delegatorMemberId: memberId,
      delegateMemberId: admin.member.id,
      scopes: ['approval.act'],
      startsAt: new Date('2026-01-01T00:00:00.000Z'),
      expiresAt: new Date('2027-01-01T00:00:00.000Z'),
      revokedAt: null,
    });
    store.delegations.push({
      id: createId(),
      organizationId: org.id,
      delegatorMemberId: admin.member.id,
      delegateMemberId: memberId,
      scopes: ['approval.act'],
      startsAt: new Date('2026-01-01T00:00:00.000Z'),
      expiresAt: new Date('2027-01-01T00:00:00.000Z'),
      revokedAt: null,
    });
    impact = await collectTerminationImpact(store, org.id, memberId, asOf);
    assert.equal(impact.categories.find((c) => c.key === 'active_delegations')!.count, 2);
    assert.equal(impact.unresolvedCount, 0, 'delegations are shown but end with the lifecycle');

    store.managerAssignments.push({
      id: createId(),
      organizationId: org.id,
      memberId: report.member.id,
      managerMemberId: memberId,
      effectiveAt: new Date('2026-01-01T00:00:00.000Z'),
      endedAt: null,
    });
    const result = await svc.execute(
      'TerminateMember',
      ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
      { memberId },
    );
    assert.equal((await store.getMember(memberId))?.accessStatus, 'revoked');
    assert.deepEqual((result.data.unresolvedOwnership as Array<{ key: string }>).map((entry) => entry.key), ['direct_reports']);
    assert.equal(store.delegations.every((d) => d.revokedAt !== null), true);
  });

  it('ignores cancelled quotes, cancelled orders, expired/revoked delegations', async () => {
    const store = new MemoryOsStore();
    const auth = new LocalAuthProviderPort();
    const svc = new WorkforceCommandService(store, auth);
    const org = await store.seedOrganization('ISALWA', 'isalwa');
    const { admin, memberId } = await seedActiveMember(store, svc, org.id);
    const asOf = new Date('2026-06-01T12:00:00.000Z');

    store.quotes.push({
      id: createId(),
      organizationId: org.id,
      ownerMemberId: memberId,
      quoteNumber: 'Q-X',
      status: 'cancelled',
    });
    store.orders.push({
      id: createId(),
      organizationId: org.id,
      ownerMemberId: memberId,
      orderNumber: 'O-X',
      status: 'cancelled',
    });
    store.delegations.push({
      id: createId(),
      organizationId: org.id,
      delegatorMemberId: memberId,
      delegateMemberId: admin.member.id,
      scopes: ['approval.act'],
      startsAt: new Date('2025-01-01T00:00:00.000Z'),
      expiresAt: new Date('2025-06-01T00:00:00.000Z'),
      revokedAt: null,
    });
    store.delegations.push({
      id: createId(),
      organizationId: org.id,
      delegatorMemberId: memberId,
      delegateMemberId: admin.member.id,
      scopes: ['approval.act'],
      startsAt: new Date('2026-01-01T00:00:00.000Z'),
      expiresAt: new Date('2027-01-01T00:00:00.000Z'),
      revokedAt: new Date('2026-03-01T00:00:00.000Z'),
    });

    const impact = await collectTerminationImpact(store, org.id, memberId, asOf);
    assert.equal(impact.unresolvedCount, 0);

    await svc.execute(
      'TerminateMember',
      ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
      { memberId, reason: 'Fin de contrato' },
    );
    const terminated = store.businessEvents.find((e) => e.eventType === 'member.terminated');
    assert.ok(terminated);
    assert.equal((terminated!.payload as { reason?: string } | undefined)?.reason, 'Fin de contrato');
  });

  it('Spanish labels only — no raw event keys in category labels', async () => {
    const store = new MemoryOsStore();
    const org = await store.seedOrganization('ISALWA', 'isalwa');
    const admin = await store.seedAdminMember(org.id, 'admin@isalwa.bo', 'Admin', 'User');
    const impact = await collectTerminationImpact(
      store,
      org.id,
      admin.member.id,
      new Date('2026-06-01T12:00:00.000Z'),
    );
    for (const cat of impact.categories) {
      assert.doesNotMatch(cat.label, /\./);
      assert.doesNotMatch(cat.key, /member\.|quote\.|order\./);
    }
  });

  it('22:20 §1: TerminateMember is not blocked by coverage the member issued; it ends it and records the customer as unresolved', async () => {
    const store = new MemoryOsStore();
    const auth = new LocalAuthProviderPort();
    const svc = new WorkforceCommandService(store, auth);
    const org = await store.seedOrganization('ISALWA', 'isalwa');
    const { admin, memberId } = await seedActiveMember(store, svc, org.id);
    const other = await store.seedAdminMember(org.id, 'other@isalwa.bo', 'Other', 'User');
    const asOf = new Date('2026-06-01T12:00:00.000Z');
    const partyId = createId();
    const grantId = createId();

    store.customerCoverageGrants.push({
      id: grantId,
      organizationId: org.id,
      customerPartyId: partyId,
      customerDisplayName: 'Cliente Cobertura',
      primaryOwnerMemberId: memberId,
      actingAdvisorMemberId: other.member.id,
      role: 'primary',
      startsAt: new Date('2026-01-01T00:00:00.000Z'),
      endsAt: null,
      revokedAt: null,
    });

    const impact = await collectTerminationImpact(store, org.id, memberId, asOf);
    assert.equal(impact.unresolvedCount, 0, 'coverage is shown but does not block');
    const primary = impact.categories.find((c) => c.key === 'primary_customer_coverage')!;
    assert.equal(primary.count, 1);
    assert.equal(primary.label, 'Clientes bajo su responsabilidad');
    assert.match(primary.items[0]!.summary, /Responsable principal · Cliente Cobertura/);
    assert.match(primary.foundationGaps?.[0] ?? '', /termina esta cobertura/);

    await svc.execute('TerminateMember', ctx(org.id, admin.member.id, admin.person.id, admin.auth.id), { memberId });
    const grant = store.customerCoverageGrants.find((g) => g.id === grantId)!;
    assert.ok(grant.revokedAt, 'ended, row kept as history');
    const payload = store.businessEvents.find((e) => e.eventType === 'member.terminated')!.payload as Record<string, unknown>;
    assert.deepEqual(payload.endedCustomerCoverage, [
      { grantId, customerPartyId: partyId, memberRole: 'primary_owner', responsibleMemberId: null },
    ]);
    assert.deepEqual(payload.unresolvedCustomerPartyIds, [partyId]);
  });

  it('22:20 §1: SuspendMember ends received coverage (current and future-dated), returns it to the active owner, leaves ended rows alone, and nothing revives on reinstatement', async () => {
    const store = new MemoryOsStore();
    const auth = new LocalAuthProviderPort();
    const svc = new WorkforceCommandService(store, auth);
    const org = await store.seedOrganization('ISALWA', 'isalwa');
    const { admin, memberId } = await seedActiveMember(store, svc, org.id);
    const other = await store.seedAdminMember(org.id, 'other2@isalwa.bo', 'Other', 'Two');
    const now = new Date('2026-06-01T12:00:00.000Z');
    const day = 24 * 3600 * 1000;
    const grant = (name: string, startsAt: Date, endsAt: Date | null, revokedAt: Date | null) => {
      const row = {
        id: createId(),
        organizationId: org.id,
        customerPartyId: createId(),
        customerDisplayName: name,
        primaryOwnerMemberId: other.member.id,
        actingAdvisorMemberId: memberId,
        role: 'acting' as const,
        startsAt,
        endsAt,
        revokedAt,
      };
      store.customerCoverageGrants.push(row);
      return row;
    };
    const active = grant('Temporal Activo', new Date(now.getTime() - 30 * day), null, null);
    const future = grant('Futuro', new Date(now.getTime() + 5 * day), new Date(now.getTime() + 20 * day), null);
    const expired = grant('Expirado', new Date(now.getTime() - 90 * day), new Date(now.getTime() - 60 * day), null);
    const earlierRevocation = new Date(now.getTime() - 10 * day);
    const revoked = grant('Revocado', new Date(now.getTime() - 30 * day), null, earlierRevocation);

    const impact = await collectTerminationImpact(store, org.id, memberId, now);
    assert.equal(impact.categories.find((c) => c.key === 'acting_customer_coverage')!.count, 1);
    assert.equal(impact.unresolvedCount, 0);

    await svc.execute('SuspendMember', ctx(org.id, admin.member.id, admin.person.id, admin.auth.id), { memberId });
    assert.ok(active.revokedAt && future.revokedAt, 'current and future-dated coverage ended');
    assert.equal(expired.revokedAt, null, 'already-ended row untouched');
    assert.equal(revoked.revokedAt, earlierRevocation, 'earlier revocation kept');
    const payload = store.businessEvents.find((e) => e.eventType === 'member.suspended')!.payload as Record<string, unknown>;
    const ended = payload.endedCustomerCoverage as Array<Record<string, unknown>>;
    assert.deepEqual(ended.map((e) => e.grantId).sort(), [active.id, future.id].sort());
    assert.ok(ended.every((e) => e.memberRole === 'acting_advisor' && e.responsibleMemberId === other.member.id));
    assert.deepEqual(payload.unresolvedCustomerPartyIds, []);

    const member = store.members.find((m) => m.id === memberId)!;
    member.accessStatus = 'active';
    const later = new Date(now.getTime() + 10 * day);
    assert.deepEqual(await store.listActiveCustomerCoverageInvolvingMember(org.id, memberId, later), [], 'no coverage revives after reinstatement');
  });

  it('excludes cross-tenant customer coverage from termination impact', async () => {
    const store = new MemoryOsStore();
    const auth = new LocalAuthProviderPort();
    const svc = new WorkforceCommandService(store, auth);
    const org = await store.seedOrganization('ISALWA', 'isalwa');
    const foreign = await store.seedOrganization('OTHER', 'other');
    const { memberId } = await seedActiveMember(store, svc, org.id);
    const other = await store.seedAdminMember(org.id, 'peer@isalwa.bo', 'Peer', 'User');
    const asOf = new Date('2026-06-01T12:00:00.000Z');

    store.customerCoverageGrants.push({
      id: createId(),
      organizationId: foreign.id,
      customerPartyId: createId(),
      customerDisplayName: 'Foreign',
      primaryOwnerMemberId: memberId,
      actingAdvisorMemberId: other.member.id,
      role: 'primary',
      startsAt: new Date('2026-01-01T00:00:00.000Z'),
      endsAt: null,
      revokedAt: null,
    });

    const impact = await collectTerminationImpact(store, org.id, memberId, asOf);
    assert.equal(impact.unresolvedCount, 0);
    assert.equal(impact.categories.find((c) => c.key === 'primary_customer_coverage')!.count, 0);
  });
});
