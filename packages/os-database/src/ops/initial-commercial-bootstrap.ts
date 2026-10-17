import { createHash } from 'node:crypto';
import { ADDITIONAL_ASSIGNABLE_SCOPE_KEYS } from '@isalwa/os-contracts';
import { computeEffectiveScopes } from '@isalwa/os-domain';
import { buildAuditEntry, buildBusinessEvent, buildOutboxForEvent } from '@isalwa/os-events';
import type { OsPrismaClient } from '../client';
import { PrismaOsWorkforceStore } from '../prisma-workforce-store';

/**
 * Initial commercial provisioning (owner approval 2026-10-16 20:39 §1, preparation only).
 *
 * Under independent possession nobody can grant a commercial scope that nobody holds.
 * This procedure gives the first holder of each such scope to one existing, active,
 * unambiguously identified member, once per scope per organization:
 * - dry run by default; execution needs the exact plan hash the dry run printed;
 * - refuses wrong tenant, ambiguous or inactive identity, scopes outside the allowlist,
 *   and any scope that an active member already holds (then GrantAdditionalRole applies);
 * - one transaction; role assignment ids are `bootstrap:<org>:<scope>`, so a scope can be
 *   bootstrapped at most once per organization, concurrent runs included;
 * - writes one business event, outbox row and audit row naming the operator and approval.
 *
 * Internal operations module: not exported from the package index, not reachable from
 * os-api (a test enforces it). It creates no identity, password or session.
 */

export const BOOTSTRAP_SCOPE_ALLOWLIST: readonly string[] = ADDITIONAL_ASSIGNABLE_SCOPE_KEYS;

export type BootstrapRequest = {
  organizationId: string;
  organizationSlug: string;
  memberId: string;
  memberEmail: string;
  scopes: readonly string[];
  approvalReference: string;
  operator: string;
  reason: string;
};

export type BootstrapPlan = {
  organization: { id: string; slug: string };
  member: { id: string };
  currentScopes: string[];
  proposedScopes: string[];
  alreadyAppliedScopes: string[];
  planHash: string;
};

export type BootstrapRefusal =
  | 'INVALID_INPUT'
  | 'SCOPE_NOT_ALLOWED'
  | 'WRONG_TENANT'
  | 'MEMBER_NOT_FOUND'
  | 'MEMBER_NOT_ACTIVE'
  | 'IDENTITY_MISMATCH'
  | 'IDENTITY_AMBIGUOUS'
  | 'SCOPE_ALREADY_HELD'
  | 'PLAN_HASH_MISMATCH';

export class BootstrapRefused extends Error {
  constructor(readonly reason: BootstrapRefusal, readonly detail: string) {
    super(`${reason}: ${detail}`);
  }
}

const bootstrapAssignmentId = (organizationId: string, scope: string) => `bootstrap:${organizationId}:${scope}`;

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function planHashOf(request: BootstrapRequest, scopes: readonly string[]): string {
  const canonical = JSON.stringify({
    organizationId: request.organizationId,
    memberId: request.memberId,
    scopes: [...scopes].sort(),
    approvalReference: request.approvalReference.trim(),
  });
  return createHash('sha256').update(canonical).digest('hex');
}

export async function planInitialCommercialBootstrap(
  prisma: OsPrismaClient,
  request: BootstrapRequest,
  asOf: Date = new Date(),
): Promise<BootstrapPlan> {
  const fields = [request.organizationId, request.organizationSlug, request.memberId, request.memberEmail, request.approvalReference, request.operator, request.reason];
  if (fields.some((value) => typeof value !== 'string' || value.trim() === '')) {
    throw new BootstrapRefused('INVALID_INPUT', 'every input is required and explicit');
  }
  const scopes = [...new Set(request.scopes)];
  if (scopes.length === 0) throw new BootstrapRefused('INVALID_INPUT', 'no scopes requested');
  const outside = scopes.filter((scope) => !BOOTSTRAP_SCOPE_ALLOWLIST.includes(scope));
  if (outside.length > 0) throw new BootstrapRefused('SCOPE_NOT_ALLOWED', outside.join(','));

  const org = await prisma.osOrganization.findUnique({ where: { id: request.organizationId } });
  if (!org || org.slug !== request.organizationSlug) {
    throw new BootstrapRefused('WRONG_TENANT', 'organization id and slug do not name the same organization');
  }
  const member = await prisma.osOrganizationMember.findFirst({
    where: { id: request.memberId, organizationId: org.id },
  });
  if (!member) throw new BootstrapRefused('MEMBER_NOT_FOUND', 'member is not in this organization');
  if (member.accessStatus !== 'active') throw new BootstrapRefused('MEMBER_NOT_ACTIVE', member.accessStatus);

  const email = normalizeEmail(request.memberEmail);
  const identities = await prisma.osAuthIdentity.findMany({
    where: { status: 'active', email: { equals: email, mode: 'insensitive' } },
    select: { personId: true },
  });
  const personsWithEmail = new Set(identities.map((row) => row.personId));
  if (!personsWithEmail.has(member.personId)) {
    throw new BootstrapRefused('IDENTITY_MISMATCH', 'email is not an active identity of this member');
  }
  const sameEmailMembers = await prisma.osOrganizationMember.count({
    where: { organizationId: org.id, accessStatus: 'active', personId: { in: [...personsWithEmail] } },
  });
  if (personsWithEmail.size !== 1 || sameEmailMembers !== 1) {
    throw new BootstrapRefused('IDENTITY_AMBIGUOUS', 'email resolves to more than one person or membership');
  }

  const roles = await prisma.osRoleAssignment.findMany({ where: { organizationId: org.id, memberId: member.id } });
  const currentScopes = computeEffectiveScopes(roles, [], asOf).sort();
  const alreadyAppliedScopes = scopes
    .filter((scope) =>
      roles.some((row) => row.id === bootstrapAssignmentId(org.id, scope) && row.roleKey === scope && row.endedAt === null),
    )
    .sort();
  const proposedScopes = scopes.filter((scope) => !alreadyAppliedScopes.includes(scope)).sort();

  for (const scope of proposedScopes) {
    const holders = await prisma.osRoleAssignment.findMany({
      where: {
        organizationId: org.id,
        roleKey: scope,
        effectiveAt: { lte: asOf },
        OR: [{ endedAt: null }, { endedAt: { gt: asOf } }],
        member: { accessStatus: 'active' },
      },
      select: { id: true },
    });
    if (holders.length > 0) {
      throw new BootstrapRefused('SCOPE_ALREADY_HELD', `${scope} already has an active holder; use GrantAdditionalRole`);
    }
    const prior = await prisma.osRoleAssignment.findUnique({ where: { id: bootstrapAssignmentId(org.id, scope) } });
    if (prior) {
      throw new BootstrapRefused('SCOPE_ALREADY_HELD', `${scope} was bootstrapped before in this organization`);
    }
  }

  return {
    organization: { id: org.id, slug: org.slug },
    member: { id: member.id },
    currentScopes,
    proposedScopes,
    alreadyAppliedScopes,
    planHash: planHashOf(request, scopes),
  };
}

export async function executeInitialCommercialBootstrap(
  prisma: OsPrismaClient,
  request: BootstrapRequest,
  confirmPlanHash: string,
  asOf: Date = new Date(),
): Promise<{ applied: string[]; alreadyApplied: string[]; eventId: string | null }> {
  const plan = await planInitialCommercialBootstrap(prisma, request, asOf);
  if (confirmPlanHash !== plan.planHash) {
    throw new BootstrapRefused('PLAN_HASH_MISMATCH', 'execute only the plan that was reviewed');
  }
  if (plan.proposedScopes.length === 0) {
    return { applied: [], alreadyApplied: plan.alreadyAppliedScopes, eventId: null };
  }
  const store = new PrismaOsWorkforceStore(prisma);
  const correlationId = `bootstrap:${plan.planHash.slice(0, 16)}`;
  return store.runInTransaction(async (tx) => {
    const member = await tx.getMemberInOrg(plan.organization.id, plan.member.id);
    if (!member || member.accessStatus !== 'active') {
      throw new BootstrapRefused('MEMBER_NOT_ACTIVE', 'member changed during execution');
    }
    for (const scope of plan.proposedScopes) {
      // Primary-key collision aborts the whole transaction if another run got here first.
      await tx.insertRoleAssignment({
        id: bootstrapAssignmentId(plan.organization.id, scope),
        organizationId: plan.organization.id,
        memberId: plan.member.id,
        roleKey: scope,
        effectiveAt: asOf,
        endedAt: null,
      });
    }
    const payload = {
      memberId: plan.member.id,
      roleKeys: plan.proposedScopes,
      planHash: plan.planHash,
      approvalReference: request.approvalReference.trim(),
      operator: request.operator.trim(),
      reason: request.reason.trim(),
    };
    const event = buildBusinessEvent({
      organizationId: plan.organization.id,
      eventType: 'member.bootstrap_grant.applied',
      occurredAt: asOf,
      actorMemberId: null,
      authorizationContext: { procedure: 'initial-commercial-bootstrap', approvalReference: payload.approvalReference, operator: payload.operator },
      primaryEntityType: 'organization_member',
      primaryEntityId: plan.member.id,
      payload,
      correlationId,
      capabilityKey: 'workforce',
      provenance: 'bootstrap',
    });
    const audit = buildAuditEntry(
      plan.organization.id,
      null,
      'member.bootstrap_grant.applied',
      'organization_member',
      plan.member.id,
      correlationId,
      { roleKeys: plan.currentScopes },
      { ...payload, grantedRoleKeys: payload.roleKeys, roleKeys: [...new Set([...plan.currentScopes, ...plan.proposedScopes])].sort() },
    );
    await tx.appendEventAndAudit(event, buildOutboxForEvent(event), audit);
    return { applied: plan.proposedScopes, alreadyApplied: plan.alreadyAppliedScopes, eventId: event.id };
  });
}
