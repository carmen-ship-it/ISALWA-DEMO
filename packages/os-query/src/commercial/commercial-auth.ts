import { COMMERCIAL_ORG_READ_SCOPE } from '@isalwa/os-contracts';
import { memberHasGrantedScope, type MemberAccessSnapshot } from '@isalwa/os-domain';
import type { QueryContext } from '../query-context';
import type {
  StoredOpportunityReadModel,
  StoredOrderReadModel,
  StoredQuoteReadModel,
} from '../projection-store-port';

/** Org-wide commercial read is commercial.org.read; people.admin is not a commercial read (V2 T03). */
export function isCommercialOrgAdmin(auth: MemberAccessSnapshot): boolean {
  return memberHasGrantedScope(auth, COMMERCIAL_ORG_READ_SCOPE);
}

type OwnedCommercialRecord = {
  organizationId: string;
  ownerMemberId: string;
};

export function canViewCommercialRecord(
  ctx: QueryContext,
  record: OwnedCommercialRecord,
): boolean {
  if (record.organizationId !== ctx.organizationId) return false;
  if (isCommercialOrgAdmin(ctx.auth)) return true;
  return record.ownerMemberId === ctx.auth.memberId;
}

export function assertCommercialListScope(
  ctx: QueryContext,
  ownerMemberId?: string,
): string | undefined {
  if (isCommercialOrgAdmin(ctx.auth)) {
    return ownerMemberId;
  }
  if (ownerMemberId && ownerMemberId !== ctx.auth.memberId) {
    throw new Error('PERMISSION_DENIED');
  }
  return ctx.auth.memberId;
}

export function filterVisibleOpportunities(
  ctx: QueryContext,
  items: StoredOpportunityReadModel[],
): StoredOpportunityReadModel[] {
  return items.filter((item) => canViewCommercialRecord(ctx, item));
}

export function filterVisibleQuotes(
  ctx: QueryContext,
  items: StoredQuoteReadModel[],
): StoredQuoteReadModel[] {
  return items.filter((item) => canViewCommercialRecord(ctx, item));
}

export function filterVisibleOrders(
  ctx: QueryContext,
  items: StoredOrderReadModel[],
): StoredOrderReadModel[] {
  return items.filter((item) => canViewCommercialRecord(ctx, item));
}
