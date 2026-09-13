import { memberHasScope, type MemberAccessSnapshot } from '@isalwa/os-domain';
import type { QueryContext } from '../query-context';
import type { StoredApprovalReadModel, StoredWorkReadModel } from '../projection-store-port';

export function isOrgAdmin(auth: MemberAccessSnapshot): boolean {
  return memberHasScope(auth, 'people.admin');
}

export function canViewWork(ctx: QueryContext, work: StoredWorkReadModel): boolean {
  if (work.organizationId !== ctx.organizationId) return false;
  if (isOrgAdmin(ctx.auth)) return true;
  if (work.ownerMemberId === ctx.auth.memberId) return true;
  if (work.createdByMemberId === ctx.auth.memberId) return true;
  return false;
}

export function canViewApproval(ctx: QueryContext, approval: StoredApprovalReadModel): boolean {
  if (approval.organizationId !== ctx.organizationId) return false;
  if (isOrgAdmin(ctx.auth)) return true;
  if (approval.requestedByMemberId === ctx.auth.memberId) return true;
  if (approval.approverMemberId === ctx.auth.memberId) return true;
  return canActAsApproverDelegate(ctx, approval.approverMemberId);
}

export function canActAsApproverDelegate(ctx: QueryContext, approverMemberId: string): boolean {
  if (ctx.auth.memberId === approverMemberId) return true;
  return ctx.auth.delegatedApproverFor?.includes(approverMemberId) ?? false;
}

export function assertWorkListScope(ctx: QueryContext, ownerMemberId?: string): string | undefined {
  if (isOrgAdmin(ctx.auth)) {
    return ownerMemberId;
  }
  if (ownerMemberId && ownerMemberId !== ctx.auth.memberId) {
    throw new Error('PERMISSION_DENIED');
  }
  return ctx.auth.memberId;
}

export function assertApprovalListScope(ctx: QueryContext, approverMemberId?: string): string | undefined {
  if (isOrgAdmin(ctx.auth)) {
    return approverMemberId;
  }
  if (approverMemberId && approverMemberId !== ctx.auth.memberId) {
    throw new Error('PERMISSION_DENIED');
  }
  return ctx.auth.memberId;
}
