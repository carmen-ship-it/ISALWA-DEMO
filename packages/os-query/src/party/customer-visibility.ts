import {
  continueCoveredCustomerWorkflow,
  type CustomerCoverageGrant,
} from '@isalwa/os-contracts';
import type { DirectReportLookup } from '../leadership/direct-reports';
import { hasCommercialOrgRead, hasCommercialTeamRead } from '../leadership/leadership-visibility';
import type { QueryContext } from '../query-context';

/**
 * Customer contact visibility (V2 §6, T02 engineering decision).
 *
 * A customer-bound party is readable by:
 * - the current commercial account owner;
 * - the acting advisor of an active coverage grant whose primary owner is still
 *   the current account owner (same rule as continueCoveredCustomerWorkflow);
 * - a commercial.team.read holder whose active direct report owns the account;
 * - a commercial.org.read holder.
 *
 * Membership alone, people.admin alone, and having entered a record do not grant it.
 */

export type CustomerVisibilityFacts = {
  organizationId: string;
  partyId: string;
  hasCommercialAccount: boolean;
  accountOwnerMemberId: string | null;
  activeRoleKeys: readonly string[];
};

export interface CustomerVisibilityLookup {
  /** Source-of-truth facts for one party in this organization, or null when absent. */
  getCustomerFacts(
    organizationId: string,
    partyId: string,
    asOf: Date,
  ): Promise<CustomerVisibilityFacts | null>;
  /** Same facts for many parties in this organization. Absent parties are omitted. */
  listCustomerFacts(
    organizationId: string,
    partyIds: readonly string[],
    asOf: Date,
  ): Promise<CustomerVisibilityFacts[]>;
  /** Party ids whose commercial account is currently owned by one of these members. */
  listPartyIdsOwnedBy(organizationId: string, ownerMemberIds: readonly string[]): Promise<string[]>;
  /** Active coverage grants where this member is the acting advisor. */
  listActiveCoverageForAdvisor(
    organizationId: string,
    advisorMemberId: string,
    asOf: Date,
  ): Promise<CustomerCoverageGrant[]>;
}

export type CustomerReadScope =
  | { kind: 'org' }
  | { kind: 'parties'; partyIds: string[] };

/**
 * Customer, holder of a commercial account, or a party with no active role.
 * A party whose active roles are all non-customer (supplier, vendor, ...) is outside
 * this boundary and keeps its existing read rule.
 */
export function isCustomerBoundParty(
  facts: Pick<CustomerVisibilityFacts, 'hasCommercialAccount' | 'activeRoleKeys'>,
): boolean {
  return (
    facts.hasCommercialAccount ||
    facts.activeRoleKeys.length === 0 ||
    facts.activeRoleKeys.includes('customer')
  );
}

function asOfFor(ctx: QueryContext): Date {
  return ctx.effectiveAt ?? new Date();
}

async function directReportsFor(
  ctx: QueryContext,
  lookup: DirectReportLookup | null,
): Promise<string[]> {
  if (!hasCommercialTeamRead(ctx.auth) || !lookup) return [];
  const reports = await lookup.listDirectReportMemberIds(
    ctx.organizationId,
    ctx.auth.memberId,
    asOfFor(ctx),
  );
  return reports.filter((id) => id && id !== ctx.auth.memberId);
}

function coverageApplies(
  ctx: QueryContext,
  facts: CustomerVisibilityFacts,
  grants: readonly CustomerCoverageGrant[],
): boolean {
  if (!facts.accountOwnerMemberId) return false;
  return continueCoveredCustomerWorkflow({
    actorMemberId: ctx.auth.memberId,
    organizationId: ctx.organizationId,
    customerPartyId: facts.partyId,
    primaryOwnerMemberId: facts.accountOwnerMemberId,
    grants,
    asOf: asOfFor(ctx),
  }).allowed;
}

/**
 * The account owner whose records on this customer the actor continues under active
 * coverage, or null. Coverage reads the owner's records on that customer only; it
 * does not change the owner (V2 T03).
 */
export async function coveredAccountOwner(input: {
  ctx: QueryContext;
  partyId: string;
  lookup: CustomerVisibilityLookup;
}): Promise<string | null> {
  const { ctx, lookup } = input;
  if (ctx.auth.accessStatus !== 'active') return null;
  const facts = await lookup.getCustomerFacts(ctx.organizationId, input.partyId, asOfFor(ctx));
  if (!facts || facts.organizationId !== ctx.organizationId) return null;
  const grants = await lookup.listActiveCoverageForAdvisor(ctx.organizationId, ctx.auth.memberId, asOfFor(ctx));
  return coverageApplies(ctx, facts, grants) ? facts.accountOwnerMemberId : null;
}

/** Party ids the actor may read, or the whole tenant for commercial.org.read. */
export async function resolveCustomerReadScope(input: {
  ctx: QueryContext;
  lookup: CustomerVisibilityLookup;
  directReports: DirectReportLookup | null;
}): Promise<CustomerReadScope> {
  const { ctx, lookup } = input;
  if (ctx.auth.accessStatus !== 'active') return { kind: 'parties', partyIds: [] };
  if (hasCommercialOrgRead(ctx.auth)) return { kind: 'org' };

  const owners = [ctx.auth.memberId, ...(await directReportsFor(ctx, input.directReports))];
  const owned = await lookup.listPartyIdsOwnedBy(ctx.organizationId, owners);

  const grants = await lookup.listActiveCoverageForAdvisor(
    ctx.organizationId,
    ctx.auth.memberId,
    asOfFor(ctx),
  );
  const grantedPartyIds = [...new Set(grants.map((grant) => grant.customerPartyId))];
  const covered = grantedPartyIds.length
    ? (await lookup.listCustomerFacts(ctx.organizationId, grantedPartyIds, asOfFor(ctx)))
        .filter((facts) => coverageApplies(ctx, facts, grants))
        .map((facts) => facts.partyId)
    : [];

  return { kind: 'parties', partyIds: [...new Set([...owned, ...covered])] };
}

/** Pure check against already-loaded facts. */
export function customerFactsReadable(input: {
  ctx: QueryContext;
  facts: CustomerVisibilityFacts;
  directReportMemberIds: readonly string[];
  coverageGrants: readonly CustomerCoverageGrant[];
}): boolean {
  const { ctx, facts } = input;
  if (facts.organizationId !== ctx.organizationId) return false;
  if (ctx.auth.accessStatus !== 'active') return false;
  if (!isCustomerBoundParty(facts)) return true;
  if (hasCommercialOrgRead(ctx.auth)) return true;
  const owner = facts.accountOwnerMemberId;
  if (owner && owner === ctx.auth.memberId) return true;
  if (coverageApplies(ctx, facts, input.coverageGrants)) return true;
  return (
    !!owner &&
    hasCommercialTeamRead(ctx.auth) &&
    input.directReportMemberIds.includes(owner)
  );
}

/** Missing, foreign and unreadable parties are the same answer: false. */
export async function canReadCustomer(input: {
  ctx: QueryContext;
  partyId: string;
  lookup: CustomerVisibilityLookup;
  directReports: DirectReportLookup | null;
}): Promise<boolean> {
  const { ctx, lookup } = input;
  const facts = await lookup.getCustomerFacts(ctx.organizationId, input.partyId, asOfFor(ctx));
  if (!facts) return false;
  if (!isCustomerBoundParty(facts) || hasCommercialOrgRead(ctx.auth)) {
    return customerFactsReadable({ ctx, facts, directReportMemberIds: [], coverageGrants: [] });
  }
  const grants = (
    await lookup.listActiveCoverageForAdvisor(ctx.organizationId, ctx.auth.memberId, asOfFor(ctx))
  ).filter((grant) => grant.customerPartyId === facts.partyId);
  return customerFactsReadable({
    ctx,
    facts,
    directReportMemberIds: await directReportsFor(ctx, input.directReports),
    coverageGrants: grants,
  });
}

/** Throws NOT_FOUND so an unreadable customer looks exactly like a missing one. */
export async function assertCustomerReadable(input: {
  ctx: QueryContext;
  partyId: string;
  lookup: CustomerVisibilityLookup;
  directReports: DirectReportLookup | null;
}): Promise<void> {
  if (!(await canReadCustomer(input))) throw new Error('NOT_FOUND');
}
