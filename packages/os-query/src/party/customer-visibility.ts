import {
  continueCoveredCustomerWorkflow,
  type CustomerCoverageAction,
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
 *
 * Coverage reads the customer's master data under any active grant. Commercial records,
 * work, approvals and commitments reached through coverage need a grant that covers
 * commercial work (NEW-R4-2): a data-only grant (customer.edit) does not read them.
 */

/** Coverage actions that read the covered owner's commercial records, work and approvals. */
export const COMMERCIAL_COVERAGE_READ_ACTIONS: readonly CustomerCoverageAction[] = ['commercial.work', 'quote.convert'];

/**
 * Inbox / conversation coverage. `quote.convert` lets a covering advisor see quotes
 * and convert them (NEW-R4-2, REUSE_MAP §12.1). It does not grant conversation
 * visibility. Conversations require explicit commercial work coverage (V2 §6).
 */
export const CONVERSATION_COVERAGE_READ_ACTIONS: readonly CustomerCoverageAction[] = ['commercial.work'];

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
  /** Party of a commercial account in this organization, or null. Absent: account-linked records fail closed. */
  partyIdForCommercialAccount?(organizationId: string, commercialAccountId: string): Promise<string | null>;
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

/** Without `actions`, any active grant applies (master-data read); otherwise one of them must be covered. */
function coverageApplies(
  ctx: QueryContext,
  facts: CustomerVisibilityFacts,
  grants: readonly CustomerCoverageGrant[],
  actions?: readonly CustomerCoverageAction[],
): boolean {
  const primaryOwnerMemberId = facts.accountOwnerMemberId;
  if (!primaryOwnerMemberId) return false;
  const applies = (action?: CustomerCoverageAction) =>
    continueCoveredCustomerWorkflow({
      actorMemberId: ctx.auth.memberId,
      organizationId: ctx.organizationId,
      customerPartyId: facts.partyId,
      primaryOwnerMemberId,
      grants,
      asOf: asOfFor(ctx),
      action,
    }).allowed;
  return actions ? actions.some((action) => applies(action)) : applies();
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
  coverageActions?: readonly CustomerCoverageAction[];
}): Promise<string | null> {
  const { ctx, lookup } = input;
  if (ctx.auth.accessStatus !== 'active') return null;
  const facts = await lookup.getCustomerFacts(ctx.organizationId, input.partyId, asOfFor(ctx));
  if (!facts || facts.organizationId !== ctx.organizationId) return null;
  const grants = await lookup.listActiveCoverageForAdvisor(ctx.organizationId, ctx.auth.memberId, asOfFor(ctx));
  return coverageApplies(ctx, facts, grants, input.coverageActions) ? facts.accountOwnerMemberId : null;
}

/** Party ids the actor may read, or the whole tenant for commercial.org.read. */
/**
 * The covered account owner's own record (quote, order, opportunity) on a customer the
 * actor covers for commercial work. Shared by commercial detail, approvals and work so
 * the timeline and detail answer the same (NEW-R4-3).
 */
export async function coveredOwnerRecordReadable(input: {
  ctx: QueryContext;
  record: { organizationId: string; ownerMemberId: string; partyId: string };
  lookup: CustomerVisibilityLookup | null;
}): Promise<boolean> {
  const { ctx, record, lookup } = input;
  if (!lookup || record.organizationId !== ctx.organizationId) return false;
  const covered = await coveredAccountOwner({
    ctx,
    partyId: record.partyId,
    lookup,
    coverageActions: COMMERCIAL_COVERAGE_READ_ACTIONS,
  });
  return covered !== null && covered === record.ownerMemberId;
}

export async function resolveCustomerReadScope(input: {
  ctx: QueryContext;
  lookup: CustomerVisibilityLookup;
  directReports: DirectReportLookup | null;
  /**
   * When set, coverage must explicitly cover one of these actions.
   * Unset keeps master-data reads, where any active grant is enough.
   */
  coverageActions?: readonly CustomerCoverageAction[];
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
        .filter((facts) => coverageApplies(ctx, facts, grants, input.coverageActions))
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
  coverageActions?: readonly CustomerCoverageAction[];
}): boolean {
  const { ctx, facts } = input;
  if (facts.organizationId !== ctx.organizationId) return false;
  if (ctx.auth.accessStatus !== 'active') return false;
  if (!isCustomerBoundParty(facts)) return true;
  if (hasCommercialOrgRead(ctx.auth)) return true;
  const owner = facts.accountOwnerMemberId;
  if (owner && owner === ctx.auth.memberId) return true;
  if (coverageApplies(ctx, facts, input.coverageGrants, input.coverageActions)) return true;
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
  /** Set for commercial records, work, approvals and commitments; unset for master data. */
  coverageActions?: readonly CustomerCoverageAction[];
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
    coverageActions: input.coverageActions,
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
