import {
  COMMERCIAL_ORG_READ_SCOPE,
  COMMERCIAL_TEAM_READ_SCOPE,
  MANAGEMENT_ORG_READ_SCOPE,
  hasExplicitScope,
} from '@isalwa/os-contracts';
import type { DateReadDenial } from './coverage';

/**
 * Commercial date facts may be read when the caller holds one of these
 * exact scopes. commercial.team.read does not imply management.org.read,
 * and management.org.read does not imply commercial.team.read.
 * Either exact held scope is sufficient. A sibling write scope does not
 * authorize the read. people.admin does not unlock these reads. Cargo
 * and title are not scopes and grant nothing.
 */
export const DATE_FACT_READ_SCOPES = [
  COMMERCIAL_TEAM_READ_SCOPE,
  COMMERCIAL_ORG_READ_SCOPE,
  MANAGEMENT_ORG_READ_SCOPE,
] as const;

export type DateFactReadScope = (typeof DATE_FACT_READ_SCOPES)[number];

/**
 * Trusted server context. organizationId must already have been derived
 * by the caller from the session. This type has no client organization
 * override. Extra fields on a runtime object are ignored.
 */
export type TrustedDateReadContext = {
  organizationId: string;
  grantedScopes: readonly string[];
};

export type AuthorizedDateRead = {
  organizationId: string;
  grantedScopes: readonly string[];
  heldReadScopes: readonly DateFactReadScope[];
};

export type DateReadAuth =
  | { ok: true; context: AuthorizedDateRead }
  | { ok: false; denial: DateReadDenial };

/**
 * Scopes actually held. Holding one date-read scope does not add the others.
 */
export function heldDateFactReadScopes(grantedScopes: readonly string[]): DateFactReadScope[] {
  return DATE_FACT_READ_SCOPES.filter((scope) => hasExplicitScope(grantedScopes, scope));
}

export function canReadCommercialDateFacts(grantedScopes: readonly string[]): boolean {
  return heldDateFactReadScopes(grantedScopes).length > 0;
}

/**
 * Authorize from the trusted context only. Cargo, title, and any
 * clientOrganizationId on the object are not read.
 */
export function authorizeCommercialDateRead(
  ctx: TrustedDateReadContext | null | undefined,
): DateReadAuth {
  if (!ctx || typeof ctx !== 'object') {
    return { ok: false, denial: 'AUTH_REQUIRED' };
  }
  const organizationId = typeof ctx.organizationId === 'string' ? ctx.organizationId.trim() : '';
  if (!organizationId) return { ok: false, denial: 'AUTH_REQUIRED' };

  const grantedScopes = Array.isArray(ctx.grantedScopes)
    ? ctx.grantedScopes.filter((scope): scope is string => typeof scope === 'string')
    : [];
  const heldReadScopes = heldDateFactReadScopes(grantedScopes);
  if (heldReadScopes.length === 0) return { ok: false, denial: 'PERMISSION_DENIED' };

  return {
    ok: true,
    context: { organizationId, grantedScopes, heldReadScopes },
  };
}
