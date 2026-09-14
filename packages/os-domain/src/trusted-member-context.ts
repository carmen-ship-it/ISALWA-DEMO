import { scopeImplies, scopesGrantedByCargoOrTitle } from '@isalwa/os-contracts';
import { computeEffectiveScopes } from './authorization';

/**
 * One trusted authorization context for the live API and web server loaders.
 *
 * Chain:
 * auth provider session → canonical AuthIdentity → active Member
 * → organization on that Member → explicit stored assignments → this context.
 *
 * Gate A's `TrustedTenantSession` (`apps/api/src/auth/trusted-session.ts`, not
 * edited here) is a projection of `organizationId` and `grantedScopes` from
 * this context. It is not a second grant source. Request-attached scopes and
 * a client organizationId are not read as authority.
 *
 * Cargo and title grant nothing. A held scope never implies another scope.
 * `people.admin` is an explicit assignment only.
 */

export type TrustedCapabilityDecision =
  | 'allow'
  | 'AUTH_REQUIRED'
  | 'ROLE_FORBIDDEN'
  | 'TENANT_FORBIDDEN'
  | 'MEMBER_INACTIVE';

export type TrustedContextDenial = 'AUTH_REQUIRED' | 'MEMBER_INACTIVE' | 'TENANT_FORBIDDEN';

export type TrustedMemberContext = {
  readonly authIdentityId: string;
  readonly personId: string;
  readonly memberId: string;
  readonly organizationId: string;
  readonly accessStatus: 'active';
  readonly employmentStatus: string;
  readonly grantedScopes: readonly string[];
};

export type TrustedContextResult =
  | { readonly ok: true; readonly context: TrustedMemberContext }
  | { readonly ok: false; readonly denial: TrustedContextDenial };

export type TrustedAuthIdentity = {
  id: string;
  personId: string;
  provider: string;
  providerSubject: string | null;
  status: string;
};

export type TrustedMemberRecord = {
  id: string;
  organizationId: string;
  personId: string;
  accessStatus: string;
  employmentStatus: string;
};

export type TrustedRoleAssignment = {
  memberId?: string;
  organizationId?: string;
  roleKey: string;
  effectiveAt: Date;
  endedAt: Date | null;
};

export type TrustedDelegation = {
  delegateMemberId?: string;
  organizationId?: string;
  scopes: readonly string[];
  startsAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  delegatorMemberId: string;
};

/** Store reads already used by the workforce membership path. Not a second auth system. */
export type TrustedMembershipReader = {
  findAuthIdentityByProviderSubject(
    provider: string,
    providerSubject: string,
  ): Promise<TrustedAuthIdentity | null>;
  listMembersForPerson(personId: string): Promise<TrustedMemberRecord[]>;
  listRoleAssignmentsForMember(memberId: string): Promise<TrustedRoleAssignment[]>;
  listDelegationsForDelegate(memberId: string): Promise<TrustedDelegation[]>;
};

export type ResolveTrustedMemberContextInput = {
  provider: string;
  providerSubject: string;
  asOf?: Date;
  /**
   * Ignored. A client organization id must not select the member or tenant.
   * Present so callers can forward a claim and tests can prove it is unused.
   */
  organizationId?: string | null;
  /** Ignored. Capability strings come from stored assignments only. */
  grantedScopes?: readonly string[] | null;
  /** Ignored. Cargo grants no scopes. */
  cargo?: string | null;
  /** Ignored. Title grants no scopes. */
  title?: string | null;
};

const ACTIVE_ACCESS = 'active';
const INVITED_ACCESS = 'invited';

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function denied(denial: TrustedContextDenial): TrustedContextResult {
  return { ok: false, denial };
}

function isClosedEmployment(employmentStatus: string): boolean {
  return employmentStatus === 'terminated' || employmentStatus === 'inactive';
}

function isClosedAccess(accessStatus: string): boolean {
  return (
    accessStatus === 'suspended' ||
    accessStatus === 'revoked' ||
    accessStatus === 'inactive' ||
    accessStatus === 'terminated'
  );
}

/**
 * Same rule as scopeImplies and decideCapability: invited is not yet able to
 * act; suspended, inactive, terminated, and revoked fail closed.
 * on_leave is not denied here — existing access checks do not treat it as closed.
 */
export function lifecycleDenial(input: {
  accessStatus?: string | null;
  employmentStatus?: string | null;
}): TrustedCapabilityDecision | null {
  const accessStatus = text(input.accessStatus);
  const employmentStatus = text(input.employmentStatus);
  if (accessStatus === INVITED_ACCESS && !isClosedEmployment(employmentStatus)) {
    return 'AUTH_REQUIRED';
  }
  if (isClosedEmployment(employmentStatus) || isClosedAccess(accessStatus)) {
    return 'MEMBER_INACTIVE';
  }
  if (accessStatus !== ACTIVE_ACCESS) return 'MEMBER_INACTIVE';
  return null;
}

function belongsToMember(
  row: { memberId?: string; delegateMemberId?: string; organizationId?: string },
  member: TrustedMemberRecord,
): boolean {
  const rowMemberId = text(row.memberId) || text(row.delegateMemberId);
  if (rowMemberId && rowMemberId !== member.id) return false;
  const organizationId = text(row.organizationId);
  if (organizationId && organizationId !== member.organizationId) return false;
  return true;
}

function uniqueScopes(scopes: readonly string[]): string[] {
  const granted: string[] = [];
  for (const scope of scopes) {
    const key = text(scope);
    if (key && !granted.includes(key)) granted.push(key);
  }
  return granted.sort();
}

function selectMember(
  personId: string,
  members: readonly TrustedMemberRecord[],
): TrustedContextResult | TrustedMemberRecord {
  const own = members.filter((member) => member.personId === personId);
  const eligible = own.filter((member) => {
    if (!text(member.id) || !text(member.organizationId)) return false;
    return lifecycleDenial(member) === null;
  });

  if (eligible.length > 1) return denied('TENANT_FORBIDDEN');
  if (eligible.length === 1) return eligible[0]!;
  if (own.some((member) => lifecycleDenial(member) === 'MEMBER_INACTIVE')) {
    return denied('MEMBER_INACTIVE');
  }
  return denied('AUTH_REQUIRED');
}

/**
 * Resolves the member and grants for an already-proven provider subject.
 * `organizationId`, `grantedScopes`, `cargo`, and `title` are not inputs.
 */
export async function resolveTrustedMemberContext(
  reader: TrustedMembershipReader,
  input: ResolveTrustedMemberContextInput,
): Promise<TrustedContextResult> {
  void input.organizationId;
  void input.grantedScopes;
  void scopesGrantedByCargoOrTitle(input.cargo, input.title);

  const provider = text(input.provider);
  const providerSubject = text(input.providerSubject);
  if (!provider || !providerSubject) return denied('AUTH_REQUIRED');

  const identity = await reader.findAuthIdentityByProviderSubject(provider, providerSubject);
  if (!identity || identity.status !== ACTIVE_ACCESS) return denied('AUTH_REQUIRED');
  const personId = text(identity.personId);
  const authIdentityId = text(identity.id);
  if (!personId || !authIdentityId) return denied('AUTH_REQUIRED');
  if (text(identity.providerSubject) !== providerSubject) return denied('AUTH_REQUIRED');

  const selected = selectMember(personId, await reader.listMembersForPerson(personId));
  if (!('id' in selected)) return selected;
  if (selected.personId !== personId) return denied('TENANT_FORBIDDEN');

  const asOf = input.asOf ?? new Date();
  const roles = (await reader.listRoleAssignmentsForMember(selected.id)).filter((row) =>
    belongsToMember(row, selected),
  );
  const delegations = (await reader.listDelegationsForDelegate(selected.id)).filter((row) =>
    belongsToMember({ ...row, delegateMemberId: row.delegateMemberId }, selected),
  );

  const grantedScopes = uniqueScopes(
    computeEffectiveScopes(
      roles.map((row) => ({
        roleKey: text(row.roleKey),
        effectiveAt: row.effectiveAt,
        endedAt: row.endedAt,
      })),
      delegations.map((row) => ({
        scopes: row.scopes.filter((scope): scope is string => typeof scope === 'string'),
        startsAt: row.startsAt,
        expiresAt: row.expiresAt,
        revokedAt: row.revokedAt,
        delegatorMemberId: row.delegatorMemberId,
      })),
      asOf,
    ),
  );

  return {
    ok: true,
    context: {
      authIdentityId,
      personId,
      memberId: selected.id,
      organizationId: selected.organizationId,
      accessStatus: 'active',
      employmentStatus: selected.employmentStatus,
      grantedScopes,
    },
  };
}

export type DecideStoredGrantInput = {
  organizationId?: string | null;
  memberId?: string | null;
  accessStatus?: string | null;
  employmentStatus?: string | null;
  grantedScopes?: readonly string[] | null;
  requiredScope?: string | null;
  resourceOrganizationId?: string | null;
};

/** Exact stored grant only. Caller-supplied cargo and title are not part of this type. */
export function decideStoredGrant(input: DecideStoredGrantInput): TrustedCapabilityDecision {
  const organizationId = text(input.organizationId);
  const memberId = text(input.memberId);
  if (!organizationId || !memberId) return 'AUTH_REQUIRED';

  const lifecycle = lifecycleDenial(input);
  if (lifecycle) return lifecycle;

  const resourceOrganizationId = text(input.resourceOrganizationId);
  if (!resourceOrganizationId || resourceOrganizationId !== organizationId) {
    return 'TENANT_FORBIDDEN';
  }

  const requiredScope = text(input.requiredScope);
  const held = (input.grantedScopes ?? []).some(
    (scope) => typeof scope === 'string' && scopeImplies(scope, requiredScope),
  );
  if (!requiredScope || !held) return 'ROLE_FORBIDDEN';
  return 'allow';
}

export function authorizeTrustedMemberContext(
  context: TrustedMemberContext | null,
  requiredScope: string,
  resourceOrganizationId?: string | null,
): TrustedCapabilityDecision {
  if (!context) return 'AUTH_REQUIRED';
  return decideStoredGrant({
    organizationId: context.organizationId,
    memberId: context.memberId,
    accessStatus: context.accessStatus,
    employmentStatus: context.employmentStatus,
    grantedScopes: context.grantedScopes,
    requiredScope,
    resourceOrganizationId,
  });
}

/**
 * Accepts a server-computed context payload. Extra fields, including cargo,
 * title, roleKeys, and a second organization or scope list, are ignored.
 * A payload that is only organizationId plus grantedScopes is not enough.
 */
export function acceptTrustedMemberContext(payload: unknown): TrustedMemberContext | null {
  if (!payload || typeof payload !== 'object') return null;
  const body = payload as {
    authIdentityId?: unknown;
    personId?: unknown;
    memberId?: unknown;
    organizationId?: unknown;
    accessStatus?: unknown;
    employmentStatus?: unknown;
    grantedScopes?: unknown;
  };
  const authIdentityId = text(body.authIdentityId);
  const personId = text(body.personId);
  const memberId = text(body.memberId);
  const organizationId = text(body.organizationId);
  const accessStatus = text(body.accessStatus);
  const employmentStatus = text(body.employmentStatus);
  if (!authIdentityId || !personId || !memberId || !organizationId || !employmentStatus) {
    return null;
  }
  if (lifecycleDenial({ accessStatus, employmentStatus })) return null;
  if (!Array.isArray(body.grantedScopes)) return null;
  if (!body.grantedScopes.every((scope) => typeof scope === 'string')) return null;

  return {
    authIdentityId,
    personId,
    memberId,
    organizationId,
    accessStatus: 'active',
    employmentStatus,
    grantedScopes: uniqueScopes(body.grantedScopes),
  };
}

/** Fields Gate A's tenant session already names. Not a second session type. */
export function trustedTenantFields(context: TrustedMemberContext): {
  readonly organizationId: string;
  readonly grantedScopes: readonly string[];
} {
  return {
    organizationId: context.organizationId,
    grantedScopes: context.grantedScopes,
  };
}
