import { createHash } from 'node:crypto';
import { ADDITIONAL_ASSIGNABLE_SCOPE_KEYS } from '@isalwa/os-contracts';
import { buildAuditEntry, buildBusinessEvent, buildOutboxForEvent } from '@isalwa/os-events';
import type { OsPrismaClient } from '../client';
import { PrismaOsWorkforceStore } from '../prisma-workforce-store';

/**
 * Historical backfill proposal (owner message 2026-10-16 22:20 §3; release
 * dependency). Before `ce74648` suspension and termination did not end
 * delegations, and before `3520dfe` they did not end customer coverage. Rows
 * left from then confer nothing while the member is inactive (use-time rule),
 * and reactivation now ends them (`0316531`), but they are still open in data.
 *
 * - Dry run by default. Execution needs the exact plan hash and an approval
 *   reference; it is not authorized against shared or hosted data.
 * - Ends only what current lifecycle rules would already have ended:
 *   delegations issued or received by a suspended or removed member; coverage
 *   received by one; coverage issued by a removed member; coverage issued by a
 *   suspended member before their latest suspension. Only `revokedAt` is set.
 * - Lists, never writes: coverage issued by a suspended member that cannot be
 *   dated against a suspension event, and open commercial scopes that were
 *   given through ChangeRole (now behave as explicit persistent grants).
 * - One organization per run, one transaction, one event + outbox + audit row.
 *
 * Internal operations module: not exported from the package index, not
 * reachable from os-api.
 */

export type BackfillRequest = {
  organizationId: string;
  organizationSlug: string;
  approvalReference: string;
  operator: string;
  reason: string;
};

type InactiveStatus = 'suspended' | 'revoked';

export type BackfillDelegation = {
  delegationId: string;
  delegatorMemberId: string;
  delegateMemberId: string;
  inactiveMemberId: string;
  inactiveStatus: InactiveStatus;
};

export type BackfillCoverage = {
  grantId: string;
  customerPartyId: string;
  primaryOwnerMemberId: string;
  actingAdvisorMemberId: string;
  basis:
    | 'acting_advisor_inactive'
    | 'primary_owner_removed'
    | 'primary_owner_suspended_before_grant_end'
    | 'primary_owner_suspended_undated';
};

export type LegacyRoleChangeGrant = {
  memberId: string;
  roleKey: string;
  roleAssignmentIds: string[];
  roleChangedEventId: string;
};

export type BackfillPlan = {
  organization: { id: string; slug: string };
  asOf: string;
  endDelegations: BackfillDelegation[];
  endCoverage: BackfillCoverage[];
  reviewCoverage: BackfillCoverage[];
  reviewLegacyRoleChangeGrants: LegacyRoleChangeGrant[];
  planHash: string;
};

export type BackfillRefusal = 'INVALID_INPUT' | 'WRONG_TENANT' | 'PLAN_HASH_MISMATCH';

export class BackfillRefused extends Error {
  constructor(readonly reason: BackfillRefusal, readonly detail: string) {
    super(`${reason}: ${detail}`);
  }
}

const ADDITIONAL_KEYS: readonly string[] = ADDITIONAL_ASSIGNABLE_SCOPE_KEYS;

function planHashOf(request: BackfillRequest, plan: Omit<BackfillPlan, 'planHash' | 'asOf'>): string {
  const canonical = JSON.stringify({
    organizationId: plan.organization.id,
    endDelegationIds: plan.endDelegations.map((row) => row.delegationId),
    endCoverageIds: plan.endCoverage.map((row) => row.grantId),
    approvalReference: request.approvalReference.trim(),
  });
  return createHash('sha256').update(canonical).digest('hex');
}

export async function planLifecycleRevivalBackfill(
  prisma: OsPrismaClient,
  request: BackfillRequest,
  asOf: Date = new Date(),
): Promise<BackfillPlan> {
  const fields = [request.organizationId, request.organizationSlug, request.approvalReference, request.operator, request.reason];
  if (fields.some((value) => typeof value !== 'string' || value.trim() === '')) {
    throw new BackfillRefused('INVALID_INPUT', 'every input is required and explicit');
  }
  const org = await prisma.osOrganization.findUnique({ where: { id: request.organizationId } });
  if (!org || org.slug !== request.organizationSlug) {
    throw new BackfillRefused('WRONG_TENANT', 'organization id and slug do not name the same organization');
  }

  const inactiveMembers = await prisma.osOrganizationMember.findMany({
    where: { organizationId: org.id, accessStatus: { in: ['suspended', 'revoked'] } },
    select: { id: true, accessStatus: true },
  });
  const inactive = new Map(inactiveMembers.map((row) => [row.id, row.accessStatus as InactiveStatus]));
  const inactiveIds = [...inactive.keys()];

  const delegations =
    inactiveIds.length === 0
      ? []
      : await prisma.osDelegation.findMany({
          where: {
            organizationId: org.id,
            revokedAt: null,
            expiresAt: { gt: asOf },
            OR: [{ delegatorMemberId: { in: inactiveIds } }, { delegateMemberId: { in: inactiveIds } }],
          },
          orderBy: { id: 'asc' },
        });
  const endDelegations = delegations.map((row) => {
    const inactiveMemberId = inactive.has(row.delegatorMemberId) ? row.delegatorMemberId : row.delegateMemberId;
    return {
      delegationId: row.id,
      delegatorMemberId: row.delegatorMemberId,
      delegateMemberId: row.delegateMemberId,
      inactiveMemberId,
      inactiveStatus: inactive.get(inactiveMemberId)!,
    };
  });

  const coverage =
    inactiveIds.length === 0
      ? []
      : await prisma.osCustomerCoverageGrant.findMany({
          where: {
            organizationId: org.id,
            revokedAt: null,
            OR: [{ endsAt: null }, { endsAt: { gt: asOf } }],
            AND: [
              {
                OR: [
                  { actingAdvisorMemberId: { in: inactiveIds } },
                  { primaryOwnerMemberId: { in: inactiveIds } },
                ],
              },
            ],
          },
          orderBy: { id: 'asc' },
        });
  const suspendedOwners = [
    ...new Set(coverage.map((row) => row.primaryOwnerMemberId).filter((id) => inactive.get(id) === 'suspended')),
  ];
  const lastSuspension = new Map<string, Date>();
  if (suspendedOwners.length > 0) {
    const events = await prisma.osBusinessEvent.findMany({
      where: { organizationId: org.id, eventType: 'member.suspended', primaryEntityId: { in: suspendedOwners } },
      select: { primaryEntityId: true, occurredAt: true },
    });
    for (const event of events) {
      const seen = lastSuspension.get(event.primaryEntityId);
      if (!seen || event.occurredAt > seen) lastSuspension.set(event.primaryEntityId, event.occurredAt);
    }
  }
  const endCoverage: BackfillCoverage[] = [];
  const reviewCoverage: BackfillCoverage[] = [];
  for (const row of coverage) {
    const base = {
      grantId: row.id,
      customerPartyId: row.customerPartyId,
      primaryOwnerMemberId: row.primaryOwnerMemberId,
      actingAdvisorMemberId: row.actingAdvisorMemberId,
    };
    if (inactive.has(row.actingAdvisorMemberId)) {
      endCoverage.push({ ...base, basis: 'acting_advisor_inactive' });
    } else if (inactive.get(row.primaryOwnerMemberId) === 'revoked') {
      endCoverage.push({ ...base, basis: 'primary_owner_removed' });
    } else {
      const suspendedAt = lastSuspension.get(row.primaryOwnerMemberId);
      if (!suspendedAt) reviewCoverage.push({ ...base, basis: 'primary_owner_suspended_undated' });
      else if (row.recordedAt < suspendedAt) endCoverage.push({ ...base, basis: 'primary_owner_suspended_before_grant_end' });
      // Granted during the suspension: legitimate "Apoyo temporal", kept.
    }
  }

  const roleChanges = await prisma.osBusinessEvent.findMany({
    where: { organizationId: org.id, eventType: 'member.role.changed' },
    select: { id: true, primaryEntityId: true, payloadJson: true },
    orderBy: { occurredAt: 'asc' },
  });
  const legacy = new Map<string, LegacyRoleChangeGrant>();
  for (const event of roleChanges) {
    const roleKey = (event.payloadJson as { roleKey?: unknown } | null)?.roleKey;
    if (typeof roleKey !== 'string' || !ADDITIONAL_KEYS.includes(roleKey)) continue;
    const open = await prisma.osRoleAssignment.findMany({
      where: { organizationId: org.id, memberId: event.primaryEntityId, roleKey, endedAt: null },
      select: { id: true },
      orderBy: { id: 'asc' },
    });
    if (open.length === 0) continue;
    legacy.set(`${event.primaryEntityId}|${roleKey}`, {
      memberId: event.primaryEntityId,
      roleKey,
      roleAssignmentIds: open.map((row) => row.id),
      roleChangedEventId: event.id,
    });
  }
  const reviewLegacyRoleChangeGrants = [...legacy.values()].sort((a, b) =>
    `${a.memberId}|${a.roleKey}`.localeCompare(`${b.memberId}|${b.roleKey}`),
  );

  const body = {
    organization: { id: org.id, slug: org.slug },
    endDelegations,
    endCoverage,
    reviewCoverage,
    reviewLegacyRoleChangeGrants,
  };
  return { ...body, asOf: asOf.toISOString(), planHash: planHashOf(request, body) };
}

export async function executeLifecycleRevivalBackfill(
  prisma: OsPrismaClient,
  request: BackfillRequest,
  confirmPlanHash: string,
  asOf: Date = new Date(),
): Promise<{ endedDelegationIds: string[]; endedCoverageIds: string[]; eventId: string | null }> {
  const plan = await planLifecycleRevivalBackfill(prisma, request, asOf);
  if (confirmPlanHash !== plan.planHash) {
    throw new BackfillRefused('PLAN_HASH_MISMATCH', 'execute only the plan that was reviewed');
  }
  const endedDelegationIds = plan.endDelegations.map((row) => row.delegationId);
  const endedCoverageIds = plan.endCoverage.map((row) => row.grantId);
  if (endedDelegationIds.length === 0 && endedCoverageIds.length === 0) {
    return { endedDelegationIds, endedCoverageIds, eventId: null };
  }
  const store = new PrismaOsWorkforceStore(prisma);
  const correlationId = `lifecycle-backfill:${plan.planHash.slice(0, 16)}`;
  return store.runInTransaction(async (tx) => {
    for (const id of endedDelegationIds) await tx.revokeDelegation(id, asOf);
    for (const id of endedCoverageIds) await tx.revokeCustomerCoverageGrant(id, asOf);
    const payload = {
      endedDelegationIds,
      endedCoverageIds,
      planHash: plan.planHash,
      approvalReference: request.approvalReference.trim(),
      operator: request.operator.trim(),
      reason: request.reason.trim(),
    };
    const event = buildBusinessEvent({
      organizationId: plan.organization.id,
      eventType: 'organization.lifecycle_backfill.applied',
      occurredAt: asOf,
      actorMemberId: null,
      authorizationContext: {
        procedure: 'lifecycle-revival-backfill',
        approvalReference: payload.approvalReference,
        operator: payload.operator,
      },
      primaryEntityType: 'organization',
      primaryEntityId: plan.organization.id,
      payload,
      correlationId,
      capabilityKey: 'workforce',
      provenance: 'backfill',
    });
    const audit = buildAuditEntry(
      plan.organization.id,
      null,
      'organization.lifecycle_backfill.applied',
      'organization',
      plan.organization.id,
      correlationId,
      { openDelegationIds: endedDelegationIds, openCoverageIds: endedCoverageIds },
      payload,
    );
    await tx.appendEventAndAudit(event, buildOutboxForEvent(event), audit);
    return { endedDelegationIds, endedCoverageIds, eventId: event.id };
  });
}
