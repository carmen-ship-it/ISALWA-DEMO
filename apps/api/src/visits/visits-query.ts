/**
 * Visit check-in authorization and tenant target lookup.
 *
 * Check-in is a write. commercial.team.read is a read scope and does not
 * authorize it. people.admin and management.org.read do not authorize it.
 * packages/os-contracts has no visit write scope. Do not invent one.
 *
 * A caller-supplied organizationId, including body.account organization
 * claims, is not an input and must not be read.
 */

import {
  sessionFromAuthenticatedRequest,
  trustedOrganizationId,
  type TrustedTenantSession,
} from '../auth/trusted-session';

/**
 * Deployment blocker until Control Tower assigns an existing or approved write capability.
 * This is not a scope string.
 */
export const VISIT_CHECK_IN_AUTHORITY = 'CROSS_LANE_CHANGE_REQUEST' as const;

export type VisitDenialCode = 'AUTH_REQUIRED' | 'ROLE_FORBIDDEN';

export type VisitAccountLookupArgs = {
  where: { id: string; organizationId: string };
  include?: {
    locations: { where: { isPrimary: true }; take: number };
  };
};

export type VisitAccountRow = {
  id: string;
  organizationId: string;
  ownerUserId: string;
  locations?: Array<{ lat: unknown; lng: unknown }>;
};

export type VisitTargetAccount = {
  id: string;
  organizationId: string;
  ownerUserId: string;
  locations: Array<{ lat: unknown; lng: unknown }>;
};

export type VisitAccountLookupDb = {
  account: {
    findFirst: (args: VisitAccountLookupArgs) => Promise<VisitAccountRow | null>;
  };
};

export type VisitCheckInGate =
  | { allowed: false; code: 'AUTH_REQUIRED'; account: null }
  | {
      allowed: false;
      code: 'ROLE_FORBIDDEN';
      account: null;
      authority: typeof VISIT_CHECK_IN_AUTHORITY;
    }
  | { allowed: false; code: 'NOT_FOUND'; account: null }
  | { allowed: true; code: null; account: VisitTargetAccount };

export { sessionFromAuthenticatedRequest, trustedOrganizationId };
export type { TrustedTenantSession };

/**
 * No existing write scope authorizes visit check-in.
 * Read scopes and admin scopes are not write authority.
 * Intentionally always false until Control Tower assigns a write capability.
 */
export function visitCheckInWriteGranted(_grantedScopes: readonly string[] | undefined): boolean {
  return false;
}

/**
 * Tenant predicate for a later write capability. Missing and foreign accounts
 * both return null: no name, lat, lng, or owner.
 */
export async function assertVisitTargetInTenant(
  db: VisitAccountLookupDb | null,
  accountId: string,
  organizationId: string,
): Promise<VisitTargetAccount | null> {
  if (!db || !accountId.trim() || !organizationId.trim()) return null;
  const account = await db.account.findFirst({
    where: { id: accountId, organizationId },
    include: { locations: { where: { isPrimary: true }, take: 1 } },
  });
  if (!account || account.organizationId !== organizationId || account.id !== accountId) return null;
  return {
    id: account.id,
    organizationId: account.organizationId,
    ownerUserId: account.ownerUserId,
    locations: account.locations ?? [],
  };
}

/**
 * Session, then write capability, then tenant lookup.
 * Capability denial happens before lookup so it cannot leak existence.
 * allowed stays false until a write capability exists. There is no caller allow flag.
 */
export async function prepareVisitCheckIn(input: {
  session: TrustedTenantSession | null | undefined;
  accountId: string;
  db: VisitAccountLookupDb | null;
}): Promise<VisitCheckInGate> {
  const organizationId = trustedOrganizationId(input.session);
  if (!organizationId || !input.session) {
    return { allowed: false, code: 'AUTH_REQUIRED', account: null };
  }
  if (!visitCheckInWriteGranted(input.session.grantedScopes)) {
    return {
      allowed: false,
      code: 'ROLE_FORBIDDEN',
      account: null,
      authority: VISIT_CHECK_IN_AUTHORITY,
    };
  }
  const account = await assertVisitTargetInTenant(input.db, input.accountId, organizationId);
  if (!account) return { allowed: false, code: 'NOT_FOUND', account: null };
  return { allowed: true, code: null, account };
}
