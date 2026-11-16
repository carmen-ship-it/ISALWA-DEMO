import {
  canManageCustomerAccountWork,
  COMMERCIAL_ORG_READ_SCOPE,
  PEOPLE_ADMIN_SCOPE,
} from '@isalwa/os-contracts';
import { memberHasScope } from '@isalwa/os-domain';
import type { QueryContext } from '../query-context';
import {
  canLinkCommitmentParty,
  type CommitmentReadDeps,
  type ReadableCommitment,
} from './commitment-auth';
import { isCustomerBoundParty, type CustomerVisibilityFacts } from '../party/customer-visibility';

/**
 * Who may hand a commitment to someone else, besides its current owner (T08 handover).
 *
 * - A customer commitment (linked to a customer-bound party): the same authority that moves
 *   customer work (R4 23:27 §1) — `commercial.work.manage` plus range over the account
 *   (`commercial.org.read`, or `commercial.team.read` with the account owner a direct report).
 * - An internal commitment (no customer, no linked record) whose owner no longer has access:
 *   workforce continuity, `people.admin`. An owner who still has access keeps it until they or
 *   a manager of the account act; people.admin alone never reads or moves anyone's live promises.
 * - A commitment linked to another record (work item, order, issue…) without a customer: no
 *   handover authority is defined, so only its owner can move it. Production, warehouse and
 *   purchasing responsibility is not invented here.
 *
 * Read scopes alone, membership and having recorded the commitment authorize nothing.
 */
export type CommitmentHandoverFacts = ReadableCommitment & {
  relatedSubjectType: string | null;
};

export type CommitmentHandoverAuthority =
  | { kind: 'customer_manager'; range: 'org' | 'team' }
  | { kind: 'workforce_continuity' };

export class CommitmentHandoverAuthorizer {
  private readonly facts = new Map<string, Promise<CustomerVisibilityFacts | null>>();

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

  /** `customer` when the commitment is about a customer-bound party; `general` when it has no record; else `other`. */
  private async classify(
    commitment: CommitmentHandoverFacts,
  ): Promise<{ kind: 'customer'; facts: CustomerVisibilityFacts } | { kind: 'general' } | { kind: 'other' }> {
    if (commitment.partyId) {
      const facts = await this.partyFacts(commitment.partyId);
      if (!facts) return { kind: 'other' };
      return isCustomerBoundParty(facts) ? { kind: 'customer', facts } : { kind: 'general' };
    }
    return commitment.relatedSubjectType ? { kind: 'other' } : { kind: 'general' };
  }

  /**
   * Authority of the context's member to hand this commitment over when they are not its owner.
   * `ownerIsActive` is whether the current owner still has access.
   */
  async authority(
    commitment: CommitmentHandoverFacts,
    ownerIsActive: boolean,
  ): Promise<CommitmentHandoverAuthority | null> {
    const { ctx } = this;
    if (commitment.organizationId !== ctx.organizationId) return null;
    if (ctx.auth.accessStatus !== 'active') return null;
    const kind = await this.classify(commitment);
    if (kind.kind === 'other') return null;
    if (kind.kind === 'general') {
      return !ownerIsActive && memberHasScope(ctx.auth, PEOPLE_ADMIN_SCOPE)
        ? { kind: 'workforce_continuity' }
        : null;
    }
    const accountOwner = kind.facts.accountOwnerMemberId;
    if (!accountOwner) return null;
    const granted = [...ctx.auth.roleKeys, ...ctx.auth.delegatedScopes];
    const reports = this.deps.directReports
      ? await this.deps.directReports.listDirectReportMemberIds(
          ctx.organizationId,
          ctx.auth.memberId,
          ctx.effectiveAt ?? new Date(),
        )
      : [];
    const allowed = canManageCustomerAccountWork({
      actorMemberId: ctx.auth.memberId,
      organizationId: ctx.organizationId,
      customerPartyId: kind.facts.partyId,
      grantedScopes: granted,
      accountOwnerMemberId: accountOwner,
      ownerIsDirectReportOfActor: accountOwner !== ctx.auth.memberId && reports.includes(accountOwner),
    });
    if (!allowed) return null;
    return { kind: 'customer_manager', range: granted.includes(COMMERCIAL_ORG_READ_SCOPE) ? 'org' : 'team' };
  }

  /**
   * Whether `target` may hold this commitment. A customer commitment only goes to someone who can
   * work that customer (handing it over grants nothing); under team range the target is the
   * actor or one of their direct reports.
   */
  async mayHold(
    commitment: CommitmentHandoverFacts,
    target: QueryContext,
    handover: { kind: 'owner' } | CommitmentHandoverAuthority,
  ): Promise<boolean> {
    if (target.auth.accessStatus !== 'active') return false;
    const kind = await this.classify(commitment);
    if (kind.kind === 'other') return handover.kind === 'owner';
    if (kind.kind === 'general') return true;
    if (handover.kind === 'customer_manager' && handover.range === 'team') {
      const memberId = target.auth.memberId;
      if (memberId !== this.ctx.auth.memberId) {
        const reports = this.deps.directReports
          ? await this.deps.directReports.listDirectReportMemberIds(
              this.ctx.organizationId,
              this.ctx.auth.memberId,
              this.ctx.effectiveAt ?? new Date(),
            )
          : [];
        if (!reports.includes(memberId)) return false;
      }
    }
    return canLinkCommitmentParty(target, commitment.partyId!, this.deps);
  }
}
