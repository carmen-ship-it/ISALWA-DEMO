import { ISSUE_MANAGE_SCOPE } from '@isalwa/os-contracts';
import type { DirectReportLookup } from '../leadership/direct-reports';
import { canReadOwnedRecord } from '../leadership/leadership-visibility';
import {
  canReadCustomer,
  isCustomerBoundParty,
  type CustomerVisibilityFacts,
  type CustomerVisibilityLookup,
} from '../party/customer-visibility';
import type { QueryContext } from '../query-context';

/**
 * Commitment reads (F07; 23:27 §3). A commitment is readable by:
 * - its owner, or a manager in range of the owner (commercial.team.read over a current
 *   direct report, commercial.org.read) — canReadOwnedRecord;
 * - for a customer-bound party, whoever can read that customer (account owner, active
 *   coverage, team lead of the account owner, commercial.org.read) — canReadCustomer;
 * - for a commitment with no party or a non-customer party, issue.manage holders.
 * Membership, people.admin and having created the commitment authorize nothing.
 */
export type ReadableCommitment = {
  organizationId: string;
  ownerMemberId: string;
  partyId: string | null;
};

export type CommitmentReadDeps = {
  directReports: DirectReportLookup | null;
  /** Without it, party-linked commitments are readable only through the owner rule. */
  customerVisibility: CustomerVisibilityLookup | null;
};

function holdsIssueManage(ctx: QueryContext): boolean {
  return [...ctx.auth.roleKeys, ...ctx.auth.delegatedScopes].includes(ISSUE_MANAGE_SCOPE);
}

/**
 * Creating a commitment against a customer-bound party requires being able to read that
 * customer; a non-customer party (e.g. a supplier) stays linkable by any active member.
 */
export async function canLinkCommitmentParty(
  ctx: QueryContext,
  partyId: string,
  deps: CommitmentReadDeps,
): Promise<boolean> {
  if (ctx.auth.accessStatus !== 'active') return false;
  const lookup = deps.customerVisibility;
  if (!lookup) return false;
  const facts = await lookup.getCustomerFacts(ctx.organizationId, partyId, ctx.effectiveAt ?? new Date());
  if (!facts) return false;
  if (!isCustomerBoundParty(facts)) return true;
  return canReadCustomer({ ctx, partyId, lookup, directReports: deps.directReports });
}

/** Memoized per-request reader, so list filtering looks each party up once. */
export class CommitmentReadAuthorizer {
  private readonly facts = new Map<string, Promise<CustomerVisibilityFacts | null>>();
  private readonly customers = new Map<string, Promise<boolean>>();

  constructor(
    private readonly ctx: QueryContext,
    private readonly deps: CommitmentReadDeps,
  ) {}

  private partyFacts(partyId: string): Promise<CustomerVisibilityFacts | null> {
    const lookup = this.deps.customerVisibility;
    if (!lookup) return Promise.resolve(null);
    let cached = this.facts.get(partyId);
    if (!cached) {
      cached = lookup.getCustomerFacts(this.ctx.organizationId, partyId, this.ctx.effectiveAt ?? new Date());
      this.facts.set(partyId, cached);
    }
    return cached;
  }

  private customerReadable(partyId: string): Promise<boolean> {
    const lookup = this.deps.customerVisibility;
    if (!lookup) return Promise.resolve(false);
    let cached = this.customers.get(partyId);
    if (!cached) {
      cached = canReadCustomer({ ctx: this.ctx, partyId, lookup, directReports: this.deps.directReports });
      this.customers.set(partyId, cached);
    }
    return cached;
  }

  async canRead(commitment: ReadableCommitment): Promise<boolean> {
    const { ctx } = this;
    if (commitment.organizationId !== ctx.organizationId) return false;
    if (ctx.auth.accessStatus !== 'active') return false;
    if (
      await canReadOwnedRecord({
        ctx,
        organizationId: commitment.organizationId,
        ownerMemberId: commitment.ownerMemberId,
        lookup: this.deps.directReports,
      })
    ) {
      return true;
    }
    if (commitment.partyId) {
      if (!this.deps.customerVisibility) return false;
      const facts = await this.partyFacts(commitment.partyId);
      if (!facts) return false;
      if (isCustomerBoundParty(facts)) return this.customerReadable(commitment.partyId);
    }
    return holdsIssueManage(ctx);
  }

  async filter<T extends ReadableCommitment>(commitments: readonly T[]): Promise<T[]> {
    const allowed = await Promise.all(commitments.map((c) => this.canRead(c)));
    return commitments.filter((_, index) => allowed[index]);
  }
}
