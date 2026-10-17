import { canRecordPurchasing, PEOPLE_ADMIN_SCOPE } from '@isalwa/os-contracts';
import type { MemberAccessSnapshot } from '@isalwa/os-domain';
import type { QueryContext } from '../query-context';
import type { DirectReportLookup } from '../leadership/direct-reports';
import { canReadOwnedRecord } from '../leadership/leadership-visibility';
import {
  canReadCustomer,
  COMMERCIAL_COVERAGE_READ_ACTIONS,
  isCustomerBoundParty,
  type CustomerVisibilityLookup,
} from '../party/customer-visibility';
import type { OsProjectionStorePort, StoredApprovalReadModel, StoredWorkReadModel } from '../projection-store-port';

/**
 * Work and approval reads (20:03 §4): applicable customer/account scope (canReadCustomer
 * on the linked customer), assigned responsibility, the approver (or a delegate whose
 * delegation still confers approval.act), operational authority (Compras on open
 * purchasing prep reviews), or explicit managerial read scope via canReadOwnedRecord.
 * Membership, people.admin and authorship authorize nothing.
 *
 * The customer branch applies only to customer-bound parties. Work and approvals about a
 * non-customer party (supplier, vendor) are not readable through it, even though that
 * party's master data stays open to members.
 */

/** Without a customer lookup, customer-linked reads fail closed. */
export type CustomerScopeLookup = CustomerVisibilityLookup | null;

async function customerOfSubjectReadable(input: {
  ctx: QueryContext;
  subjectType: string | null;
  subjectId: string | null;
  customer: CustomerScopeLookup;
  lookup: DirectReportLookup | null;
}): Promise<boolean> {
  const { ctx, subjectType, subjectId, customer } = input;
  if (!customer || !subjectId) return false;
  const partyId =
    subjectType === 'party'
      ? subjectId
      : subjectType === 'commercial_account'
        ? ((await customer.partyIdForCommercialAccount?.(ctx.organizationId, subjectId)) ?? null)
        : null;
  if (!partyId) return false;
  const facts = await customer.getCustomerFacts(ctx.organizationId, partyId, ctx.effectiveAt ?? new Date());
  if (!facts || !isCustomerBoundParty(facts)) return false;
  return canReadCustomer({
    ctx,
    partyId,
    lookup: customer,
    directReports: input.lookup,
    coverageActions: COMMERCIAL_COVERAGE_READ_ACTIONS,
  });
}

function authGrantedScopes(auth: MemberAccessSnapshot): string[] {
  return [...auth.roleKeys, ...auth.delegatedScopes];
}

/** Open Pedido prep reviews owned by the requester must still reach Compras. */
export function isOpenPurchasingPrepReview(work: Pick<StoredWorkReadModel, 'status' | 'title' | 'description'>): boolean {
  if (work.status !== 'open') return false;
  const text = `${work.title ?? ''}
${work.description ?? ''}`;
  return /\[\[order-prep:purchasing:[^\]]+\]\]/.test(text);
}

/** Synchronous part of the work rule; managerial reads need canReadWork. */
export function canViewWork(ctx: QueryContext, work: StoredWorkReadModel): boolean {
  if (work.organizationId !== ctx.organizationId) return false;
  if (work.ownerMemberId === ctx.auth.memberId) return true;
  if (canRecordPurchasing(authGrantedScopes(ctx.auth)) && isOpenPurchasingPrepReview(work)) {
    return true;
  }
  return false;
}

export async function canReadWork(input: {
  ctx: QueryContext;
  work: StoredWorkReadModel;
  lookup: DirectReportLookup | null;
  customer: CustomerScopeLookup;
}): Promise<boolean> {
  const { ctx, work, lookup, customer } = input;
  if (canViewWork(ctx, work)) return true;
  if (await canReadOwnedRecord({ ctx, organizationId: work.organizationId, ownerMemberId: work.ownerMemberId, lookup })) {
    return true;
  }
  return customerOfSubjectReadable({ ctx, subjectType: work.subjectType, subjectId: work.subjectId, customer, lookup });
}

/** Subjects whose approvals are read through current authority over the subject. */
const RULED_APPROVAL_SUBJECTS = ['quote', 'order', 'work_item', 'party', 'organization_member'] as const;

function hasSubjectReadRule(subjectType: string): boolean {
  return (RULED_APPROVAL_SUBJECTS as readonly string[]).includes(subjectType);
}

/**
 * Synchronous part of the approval rule. For quote, order, work_item and party subjects
 * the requester reads through current authority over the subject (canReadApproval), not
 * as its author. An organization_member approval carries personnel context: its
 * requester reads it only while currently holding people.admin (directly or by a
 * delegation that still confers it). Other subjects keep the requester.
 */
export function canViewApproval(ctx: QueryContext, approval: StoredApprovalReadModel): boolean {
  if (approval.organizationId !== ctx.organizationId) return false;
  if (canActAsApproverDelegate(ctx, approval.approverMemberId)) return true;
  if (approval.requestedByMemberId !== ctx.auth.memberId) return false;
  if (approval.subjectType === 'organization_member') {
    return authGrantedScopes(ctx.auth).includes(PEOPLE_ADMIN_SCOPE);
  }
  return !hasSubjectReadRule(approval.subjectType);
}

export type ApprovalReadSources = Pick<OsProjectionStorePort, 'getWorkReadModel' | 'getQuoteReadModel' | 'getOrderReadModel'>;

export async function canReadApproval(input: {
  ctx: QueryContext;
  approval: StoredApprovalReadModel;
  sources: ApprovalReadSources;
  lookup: DirectReportLookup | null;
  customer: CustomerScopeLookup;
}): Promise<boolean> {
  const { ctx, approval, sources, lookup, customer } = input;
  if (canViewApproval(ctx, approval)) return true;
  if (approval.organizationId !== ctx.organizationId) return false;
  if (approval.subjectType === 'quote' || approval.subjectType === 'order') {
    const subject =
      approval.subjectType === 'quote'
        ? await sources.getQuoteReadModel(ctx.organizationId, approval.subjectId)
        : await sources.getOrderReadModel(ctx.organizationId, approval.subjectId);
    if (subject && (await canReadOwnedRecord({ ctx, organizationId: subject.organizationId, ownerMemberId: subject.ownerMemberId, lookup }))) {
      return true;
    }
  }
  if (approval.subjectType === 'party' && (await customerOfSubjectReadable({ ctx, subjectType: 'party', subjectId: approval.subjectId, customer, lookup }))) {
    return true;
  }
  const workItemIds = [approval.workItemId, approval.subjectType === 'work_item' ? approval.subjectId : null];
  for (const workItemId of new Set(workItemIds.filter((id): id is string => Boolean(id)))) {
    const work = await sources.getWorkReadModel(ctx.organizationId, workItemId);
    if (work && (await canReadWork({ ctx, work, lookup, customer }))) return true;
  }
  return false;
}

export function canActAsApproverDelegate(ctx: QueryContext, approverMemberId: string): boolean {
  if (ctx.auth.memberId === approverMemberId) return true;
  return ctx.auth.delegatedApproverFor?.includes(approverMemberId) ?? false;
}

export function assertWorkListScope(ctx: QueryContext, ownerMemberId?: string): string {
  if (ownerMemberId && ownerMemberId !== ctx.auth.memberId) {
    throw new Error('PERMISSION_DENIED');
  }
  return ctx.auth.memberId;
}

export function assertApprovalListScope(ctx: QueryContext, approverMemberId?: string): string {
  if (approverMemberId && approverMemberId !== ctx.auth.memberId) {
    throw new Error('PERMISSION_DENIED');
  }
  return ctx.auth.memberId;
}
