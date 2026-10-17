import { createHash } from 'node:crypto';
import { ADDITIONAL_ASSIGNABLE_SCOPE_KEYS } from '@isalwa/os-contracts';
import { computeEffectiveScopes } from '@isalwa/os-domain';
import { buildAuditEntry, buildBusinessEvent, buildOutboxForEvent } from '@isalwa/os-events';
import type { OsPrismaClient } from '../client';
import { PrismaOsWorkforceStore } from '../prisma-workforce-store';

/**
 * Initial commercial provisioning plan (owner approval 2026-10-16 20:39 §1; 22:29 decision 2).
 *
 * Under independent possession nobody can grant a commercial scope that nobody holds.
 * One explicit, owner-approved plan names every initial holder and their minimal grants,
 * so no single person needs people.admin plus commercial authority to finish the roster:
 * - first-time establishment: a scope in the plan that no active member holds and that no
 *   earlier plan bootstrapped in this organization;
 * - distribution: the same scope to other holders named in the same plan, same transaction;
 * - anything after the plan is applied goes through the governed application commands
 *   (GrantAdditionalRole etc.). A scope held outside the plan refuses the whole plan.
 *
 * Validation covers the complete plan before any write: tenant, each holder's identity and
 * standing, proposal/range/scope bounds, manager-relationship prerequisites for team-range
 * holders (the exact current direct reports must be listed), and current holding state.
 * Dry run by default; execution needs the exact plan hash. One transaction; role ids are
 * deterministic, so concurrent or repeated runs cannot add a second set. One business
 * event, outbox row and audit row per applied plan. No default proposal, person, scope
 * or recipient; no all-scopes proposal.
 *
 * Internal operations module: not exported from the package index, not reachable from
 * os-api (a test enforces it). It creates no identity, password or session.
 */

/** `own`: the holder's own customers and quotes only; no read range, no direct reports. */
export type BootstrapRange = 'own' | 'team' | 'organization';

/**
 * Minimal role-specific proposals for owner approval (21:33 §4). A holder names one
 * proposal, its range and a subset of its scopes. Scopes outside every proposal stay
 * ungrantable until a later approved change adds a proposal for them.
 *
 * The advisor proposal (23:47 §B.1) registers customers and converts the holder's own
 * submitted quotes; it has no read range, people.admin or organization-wide scope.
 * Managers may also take the advisor scopes so that, after the plan, they can grant them
 * to later advisors through GrantAdditionalRole (the grantor must hold what it grants).
 */
const ADVISOR_SCOPES = ['commercial.customer.create', 'commercial.quote.convert.own'] as const;

export const BOOTSTRAP_PROPOSALS = {
  advisor: {
    range: 'own',
    scopes: ADVISOR_SCOPES,
  },
  team_manager: {
    range: 'team',
    scopes: ['commercial.team.read', 'commercial.customer.edit', 'commercial.work.manage', ...ADVISOR_SCOPES],
  },
  commercial_manager: {
    range: 'organization',
    scopes: ['commercial.org.read', 'commercial.customer.edit', 'commercial.work.manage', ...ADVISOR_SCOPES],
  },
  customer_data_steward: {
    range: 'team',
    scopes: ['commercial.team.read', 'commercial.customer.create', 'commercial.customer.edit'],
  },
} as const satisfies Record<string, { range: BootstrapRange; scopes: readonly string[] }>;

export type BootstrapProposalKey = keyof typeof BOOTSTRAP_PROPOSALS;

/** Scopes whose reach is the whole organization; refused unless range is `organization`. */
export const ORGANIZATION_RANGE_SCOPES: readonly string[] = [
  'commercial.org.read',
  'commercial.assignment.org',
  'commercial.intake.assign',
];

export const BOOTSTRAP_SCOPE_ALLOWLIST: readonly string[] = [
  ...new Set(Object.values(BOOTSTRAP_PROPOSALS).flatMap((proposal) => proposal.scopes)),
].filter((scope) => (ADDITIONAL_ASSIGNABLE_SCOPE_KEYS as readonly string[]).includes(scope));

export type BootstrapHolderRequest = {
  memberId: string;
  memberEmail: string;
  proposal: string;
  range: string;
  scopes: readonly string[];
  /** Required for range `team`: the holder's exact current direct reports (set ChangeManager first). */
  directReportIds?: readonly string[];
};

export type BootstrapRequest = {
  organizationId: string;
  organizationSlug: string;
  holders: readonly BootstrapHolderRequest[];
  approvalReference: string;
  operator: string;
  reason: string;
};

export type BootstrapGrantKind = 'establish' | 'distribute';

export type BootstrapHolderPlan = {
  memberId: string;
  proposal: BootstrapProposalKey;
  range: BootstrapRange;
  directReportIds: string[];
  currentScopes: string[];
  grants: Array<{ scope: string; kind: BootstrapGrantKind; assignmentId: string }>;
};

export type BootstrapPlan = {
  organization: { id: string; slug: string };
  holders: BootstrapHolderPlan[];
  establishedScopes: string[];
  alreadyApplied: boolean;
  planHash: string;
};

export type BootstrapRefusal =
  | 'INVALID_INPUT'
  | 'SCOPE_NOT_ALLOWED'
  | 'RANGE_MISMATCH'
  | 'WRONG_TENANT'
  | 'MEMBER_NOT_FOUND'
  | 'MEMBER_NOT_ACTIVE'
  | 'IDENTITY_MISMATCH'
  | 'IDENTITY_AMBIGUOUS'
  | 'PREREQUISITE_NOT_MET'
  | 'SCOPE_HELD_OUTSIDE_PLAN'
  | 'PLAN_HASH_MISMATCH';

export class BootstrapRefused extends Error {
  constructor(readonly reason: BootstrapRefusal, readonly detail: string) {
    super(`${reason}: ${detail}`);
  }
}

const BOOTSTRAP_ID_PREFIX = 'bootstrap:';

/** The establishing holder keeps the single-scope id, so two plans cannot both establish a scope. */
function bootstrapAssignmentId(organizationId: string, scope: string, memberId: string, kind: BootstrapGrantKind): string {
  return kind === 'establish'
    ? `${BOOTSTRAP_ID_PREFIX}${organizationId}:${scope}`
    : `${BOOTSTRAP_ID_PREFIX}${organizationId}:${scope}:${memberId}`;
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

const nonEmpty = (value: unknown): value is string => typeof value === 'string' && value.trim() !== '';

type NormalizedHolder = {
  memberId: string;
  memberEmail: string;
  proposal: BootstrapProposalKey;
  range: BootstrapRange;
  scopes: string[];
  directReportIds: string[];
};

function normalizeHolder(holder: BootstrapHolderRequest): NormalizedHolder {
  if (!holder || typeof holder !== 'object') throw new BootstrapRefused('INVALID_INPUT', 'holder must be an object');
  if (![holder.memberId, holder.memberEmail, holder.proposal, holder.range].every(nonEmpty)) {
    throw new BootstrapRefused('INVALID_INPUT', 'every holder field is required and explicit');
  }
  if (!Array.isArray(holder.scopes)) throw new BootstrapRefused('INVALID_INPUT', 'scopes must be listed explicitly');
  const scopes = [...new Set(holder.scopes)].sort();
  if (scopes.length === 0) throw new BootstrapRefused('INVALID_INPUT', `no scopes requested for ${holder.memberId}`);
  if (!Object.prototype.hasOwnProperty.call(BOOTSTRAP_PROPOSALS, holder.proposal)) {
    throw new BootstrapRefused('INVALID_INPUT', 'unknown proposal');
  }
  const proposalKey = holder.proposal as BootstrapProposalKey;
  const proposal = BOOTSTRAP_PROPOSALS[proposalKey];
  const proposalScopes: readonly string[] = proposal.scopes;
  const outside = scopes.filter((scope) => !BOOTSTRAP_SCOPE_ALLOWLIST.includes(scope) || !proposalScopes.includes(scope));
  if (outside.length > 0) throw new BootstrapRefused('SCOPE_NOT_ALLOWED', outside.join(','));
  if (holder.range !== proposal.range) {
    throw new BootstrapRefused('RANGE_MISMATCH', `${holder.proposal} has range ${proposal.range}`);
  }
  const orgWide = scopes.filter((scope) => ORGANIZATION_RANGE_SCOPES.includes(scope));
  if (orgWide.length > 0 && holder.range !== 'organization') {
    throw new BootstrapRefused('RANGE_MISMATCH', `${orgWide.join(',')} needs range organization`);
  }
  let directReportIds: string[] = [];
  if (holder.directReportIds !== undefined) {
    if (!Array.isArray(holder.directReportIds) || !holder.directReportIds.every(nonEmpty)) {
      throw new BootstrapRefused('INVALID_INPUT', 'directReportIds must list member ids');
    }
    directReportIds = [...new Set(holder.directReportIds)].sort();
  }
  if (proposal.range === 'own' && directReportIds.length > 0) {
    throw new BootstrapRefused('INVALID_INPUT', `${holder.memberId}: range own has no direct reports`);
  }
  if (proposal.range === 'team' && directReportIds.length === 0) {
    throw new BootstrapRefused('PREREQUISITE_NOT_MET', `${holder.memberId}: team range needs its direct reports set and listed first`);
  }
  return {
    memberId: holder.memberId,
    memberEmail: normalizeEmail(holder.memberEmail),
    proposal: proposalKey,
    range: proposal.range,
    scopes,
    directReportIds,
  };
}

function planHashOf(organizationId: string, holders: readonly NormalizedHolder[], approvalReference: string): string {
  const canonical = JSON.stringify({
    organizationId,
    holders: holders.map((holder) => ({
      memberId: holder.memberId,
      proposal: holder.proposal,
      range: holder.range,
      scopes: holder.scopes,
      directReportIds: holder.directReportIds,
    })),
    approvalReference: approvalReference.trim(),
  });
  return createHash('sha256').update(canonical).digest('hex');
}

export async function planInitialCommercialBootstrap(
  prisma: OsPrismaClient,
  request: BootstrapRequest,
  asOf: Date = new Date(),
): Promise<BootstrapPlan> {
  if (![request.organizationId, request.organizationSlug, request.approvalReference, request.operator, request.reason].every(nonEmpty)) {
    throw new BootstrapRefused('INVALID_INPUT', 'every input is required and explicit');
  }
  if (!Array.isArray(request.holders) || request.holders.length === 0) {
    throw new BootstrapRefused('INVALID_INPUT', 'the plan must name its holders');
  }
  const holders = request.holders.map(normalizeHolder).sort((a, b) => a.memberId.localeCompare(b.memberId));
  if (new Set(holders.map((holder) => holder.memberId)).size !== holders.length) {
    throw new BootstrapRefused('INVALID_INPUT', 'each holder appears once with one proposal');
  }

  const org = await prisma.osOrganization.findUnique({ where: { id: request.organizationId } });
  if (!org || org.slug !== request.organizationSlug) {
    throw new BootstrapRefused('WRONG_TENANT', 'organization id and slug do not name the same organization');
  }

  const holderStates: Array<{ holder: NormalizedHolder; currentScopes: string[] }> = [];
  for (const holder of holders) {
    const member = await prisma.osOrganizationMember.findFirst({ where: { id: holder.memberId, organizationId: org.id } });
    if (!member) throw new BootstrapRefused('MEMBER_NOT_FOUND', `${holder.memberId} is not in this organization`);
    if (member.accessStatus !== 'active') throw new BootstrapRefused('MEMBER_NOT_ACTIVE', `${holder.memberId}: ${member.accessStatus}`);

    const identities = await prisma.osAuthIdentity.findMany({
      where: { status: 'active', email: { equals: holder.memberEmail, mode: 'insensitive' } },
      select: { personId: true },
    });
    const personsWithEmail = new Set(identities.map((row) => row.personId));
    if (!personsWithEmail.has(member.personId)) {
      throw new BootstrapRefused('IDENTITY_MISMATCH', `${holder.memberId}: email is not an active identity of this member`);
    }
    const sameEmailMembers = await prisma.osOrganizationMember.count({
      where: { organizationId: org.id, accessStatus: 'active', personId: { in: [...personsWithEmail] } },
    });
    if (personsWithEmail.size !== 1 || sameEmailMembers !== 1) {
      throw new BootstrapRefused('IDENTITY_AMBIGUOUS', `${holder.memberId}: email resolves to more than one person or membership`);
    }

    if (holder.directReportIds.length > 0) {
      const reports = await prisma.osManagerAssignment.findMany({
        where: {
          organizationId: org.id,
          managerMemberId: holder.memberId,
          effectiveAt: { lte: asOf },
          OR: [{ endedAt: null }, { endedAt: { gt: asOf } }],
        },
        select: { memberId: true },
      });
      const current = [...new Set(reports.map((row) => row.memberId))].sort();
      if (JSON.stringify(current) !== JSON.stringify(holder.directReportIds)) {
        throw new BootstrapRefused('PREREQUISITE_NOT_MET', `${holder.memberId}: listed direct reports differ from current manager relationships`);
      }
    }

    const roles = await prisma.osRoleAssignment.findMany({ where: { organizationId: org.id, memberId: member.id } });
    holderStates.push({ holder, currentScopes: computeEffectiveScopes(roles, [], asOf).sort() });
  }

  const planScopes = [...new Set(holders.flatMap((holder) => holder.scopes))].sort();
  const plannedHolders: BootstrapHolderPlan[] = holderStates.map(({ holder, currentScopes }) => ({
    memberId: holder.memberId,
    proposal: holder.proposal,
    range: holder.range,
    directReportIds: holder.directReportIds,
    currentScopes,
    grants: holder.scopes.map((scope) => {
      const establisher = holders.find((candidate) => candidate.scopes.includes(scope))!;
      const kind: BootstrapGrantKind = establisher.memberId === holder.memberId ? 'establish' : 'distribute';
      return { scope, kind, assignmentId: bootstrapAssignmentId(org.id, scope, holder.memberId, kind) };
    }),
  }));
  const expectedIds = new Set(plannedHolders.flatMap((holder) => holder.grants.map((grant) => grant.assignmentId)));

  const existingBootstrapIds = new Set<string>();
  for (const scope of planScopes) {
    const outsideHolders = await prisma.osRoleAssignment.count({
      where: {
        organizationId: org.id,
        roleKey: scope,
        NOT: { id: { startsWith: BOOTSTRAP_ID_PREFIX } },
        effectiveAt: { lte: asOf },
        OR: [{ endedAt: null }, { endedAt: { gt: asOf } }],
        member: { accessStatus: 'active' },
      },
    });
    if (outsideHolders > 0) {
      throw new BootstrapRefused('SCOPE_HELD_OUTSIDE_PLAN', `${scope} already has an active holder; use GrantAdditionalRole`);
    }
    const bootstrapped = await prisma.osRoleAssignment.findMany({
      where: { organizationId: org.id, roleKey: scope, id: { startsWith: BOOTSTRAP_ID_PREFIX } },
      select: { id: true },
    });
    for (const row of bootstrapped) existingBootstrapIds.add(row.id);
  }
  const alreadyApplied = existingBootstrapIds.size > 0;
  if (alreadyApplied && (existingBootstrapIds.size !== expectedIds.size || [...expectedIds].some((id) => !existingBootstrapIds.has(id)))) {
    throw new BootstrapRefused('SCOPE_HELD_OUTSIDE_PLAN', 'a scope in this plan was bootstrapped by a different plan; use GrantAdditionalRole');
  }

  return {
    organization: { id: org.id, slug: org.slug },
    holders: plannedHolders,
    establishedScopes: planScopes,
    alreadyApplied,
    planHash: planHashOf(org.id, holders, request.approvalReference),
  };
}

export async function executeInitialCommercialBootstrap(
  prisma: OsPrismaClient,
  request: BootstrapRequest,
  confirmPlanHash: string,
  asOf: Date = new Date(),
): Promise<{ applied: Array<{ memberId: string; scopes: string[] }>; alreadyApplied: boolean; eventId: string | null }> {
  const plan = await planInitialCommercialBootstrap(prisma, request, asOf);
  if (confirmPlanHash !== plan.planHash) {
    throw new BootstrapRefused('PLAN_HASH_MISMATCH', 'execute only the plan that was reviewed');
  }
  if (plan.alreadyApplied) return { applied: [], alreadyApplied: true, eventId: null };

  const store = new PrismaOsWorkforceStore(prisma);
  const correlationId = `bootstrap:${plan.planHash.slice(0, 16)}`;
  return store.runInTransaction(async (tx) => {
    for (const holder of plan.holders) {
      await tx.lockMemberForUpdate(plan.organization.id, holder.memberId);
      const member = await tx.getMemberInOrg(plan.organization.id, holder.memberId);
      if (!member || member.accessStatus !== 'active') {
        throw new BootstrapRefused('MEMBER_NOT_ACTIVE', `${holder.memberId} changed during execution`);
      }
    }
    for (const holder of plan.holders) {
      for (const grant of holder.grants) {
        // A primary-key collision aborts the whole plan if another run got here first.
        await tx.insertRoleAssignment({
          id: grant.assignmentId,
          organizationId: plan.organization.id,
          memberId: holder.memberId,
          roleKey: grant.scope,
          effectiveAt: asOf,
          endedAt: null,
        });
      }
    }
    const applied = plan.holders.map((holder) => ({ memberId: holder.memberId, scopes: holder.grants.map((grant) => grant.scope) }));
    const payload = {
      holders: plan.holders.map((holder) => ({
        memberId: holder.memberId,
        proposal: holder.proposal,
        range: holder.range,
        directReportIds: holder.directReportIds,
        grants: holder.grants.map(({ scope, kind }) => ({ scope, kind })),
      })),
      establishedScopes: plan.establishedScopes,
      planHash: plan.planHash,
      approvalReference: request.approvalReference.trim(),
      operator: request.operator.trim(),
      reason: request.reason.trim(),
    };
    const event = buildBusinessEvent({
      organizationId: plan.organization.id,
      eventType: 'organization.bootstrap_plan.applied',
      occurredAt: asOf,
      actorMemberId: null,
      authorizationContext: { procedure: 'initial-commercial-bootstrap', approvalReference: payload.approvalReference, operator: payload.operator },
      primaryEntityType: 'organization',
      primaryEntityId: plan.organization.id,
      payload,
      correlationId,
      capabilityKey: 'workforce',
      provenance: 'bootstrap',
    });
    const audit = buildAuditEntry(
      plan.organization.id,
      null,
      'organization.bootstrap_plan.applied',
      'organization',
      plan.organization.id,
      correlationId,
      { holders: plan.holders.map((holder) => ({ memberId: holder.memberId, roleKeys: holder.currentScopes })) },
      {
        ...payload,
        holders: plan.holders.map((holder) => ({
          memberId: holder.memberId,
          grantedRoleKeys: holder.grants.map((grant) => grant.scope),
          roleKeys: [...new Set([...holder.currentScopes, ...holder.grants.map((grant) => grant.scope)])].sort(),
        })),
      },
    );
    await tx.appendEventAndAudit(event, buildOutboxForEvent(event), audit);
    return { applied, alreadyApplied: false, eventId: event.id };
  });
}
