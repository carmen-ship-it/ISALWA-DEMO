import {
  COMMERCIAL_ORG_READ_SCOPE,
  COMMERCIAL_TEAM_READ_SCOPE,
  type CommercialVisibilityMode,
} from '@isalwa/os-contracts';
import { memberHasGrantedScope, memberHasScope } from '@isalwa/os-domain';
import type { QueryContext } from '../query-context';
import type { DirectReportLookup } from './direct-reports';

export const FOLLOW_UP_WORK_SUBJECT_TYPES = ['party', 'commercial_account'] as const;

/** Server-applied owner constraint. Never accepted from the client. */
export type OwnerReadScope =
  | { kind: 'self'; ownerMemberId: string }
  | { kind: 'unrestricted'; ownerMemberId?: string }
  | { kind: 'members'; ownerMemberIds: string[] };

export function hasCommercialTeamRead(auth: QueryContext['auth']): boolean {
  return memberHasGrantedScope(auth, COMMERCIAL_TEAM_READ_SCOPE);
}

export function hasCommercialOrgRead(auth: QueryContext['auth']): boolean {
  return memberHasGrantedScope(auth, COMMERCIAL_ORG_READ_SCOPE);
}

/**
 * people.admin is not a leadership shortcut.
 * Default lists still honor the existing people.admin org read.
 * visibility=team|org requires the matching read scope even for people.admin.
 */
export async function resolveOwnerReadScope(input: {
  ctx: QueryContext;
  visibility?: CommercialVisibilityMode;
  requestedOwnerMemberId?: string;
  lookup: DirectReportLookup | null;
}): Promise<OwnerReadScope> {
  const { ctx, requestedOwnerMemberId } = input;
  const visibility = input.visibility ?? 'own';

  if (visibility === 'own') {
    if (memberHasScope(ctx.auth, 'people.admin')) {
      return { kind: 'unrestricted', ownerMemberId: requestedOwnerMemberId };
    }
    if (requestedOwnerMemberId && requestedOwnerMemberId !== ctx.auth.memberId) {
      throw new Error('PERMISSION_DENIED');
    }
    return { kind: 'self', ownerMemberId: ctx.auth.memberId };
  }

  if (visibility === 'org') {
    if (!hasCommercialOrgRead(ctx.auth)) throw new Error('PERMISSION_DENIED');
    return { kind: 'unrestricted', ownerMemberId: requestedOwnerMemberId };
  }

  if (!hasCommercialTeamRead(ctx.auth)) throw new Error('PERMISSION_DENIED');
  if (!input.lookup) throw new Error('PERMISSION_DENIED');

  const reports = await input.lookup.listDirectReportMemberIds(
    ctx.organizationId,
    ctx.auth.memberId,
    ctx.effectiveAt,
  );
  const direct = [...new Set(reports.filter((id) => id && id !== ctx.auth.memberId))];

  if (requestedOwnerMemberId) {
    if (!direct.includes(requestedOwnerMemberId)) throw new Error('PERMISSION_DENIED');
    return { kind: 'members', ownerMemberIds: [requestedOwnerMemberId] };
  }

  return { kind: 'members', ownerMemberIds: direct };
}

export function ownerInReadScope(ownerMemberId: string, scope: OwnerReadScope): boolean {
  if (scope.kind === 'unrestricted') {
    return scope.ownerMemberId ? ownerMemberId === scope.ownerMemberId : true;
  }
  if (scope.kind === 'self') return ownerMemberId === scope.ownerMemberId;
  return scope.ownerMemberIds.includes(ownerMemberId);
}

export function toStoreOwnerFilter(scope: OwnerReadScope):
  | { empty: true }
  | { ownerMemberId?: string; ownerMemberIds?: string[] } {
  if (scope.kind === 'members') {
    if (scope.ownerMemberIds.length === 0) return { empty: true };
    if (scope.ownerMemberIds.length === 1) return { ownerMemberId: scope.ownerMemberIds[0] };
    return { ownerMemberIds: scope.ownerMemberIds };
  }
  return { ownerMemberId: scope.ownerMemberId };
}

export async function canReadOwnedRecord(input: {
  ctx: QueryContext;
  organizationId: string;
  ownerMemberId: string;
  lookup: DirectReportLookup | null;
}): Promise<boolean> {
  if (input.organizationId !== input.ctx.organizationId) return false;
  if (input.ownerMemberId === input.ctx.auth.memberId) return true;
  if (memberHasScope(input.ctx.auth, 'people.admin')) return true;
  if (hasCommercialOrgRead(input.ctx.auth)) return true;
  if (!hasCommercialTeamRead(input.ctx.auth) || !input.lookup) return false;
  const reports = await input.lookup.listDirectReportMemberIds(
    input.ctx.organizationId,
    input.ctx.auth.memberId,
    input.ctx.effectiveAt,
  );
  return reports.includes(input.ownerMemberId) && input.ownerMemberId !== input.ctx.auth.memberId;
}
