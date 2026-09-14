/**
 * Company operating reads use the existing management.org.read scope.
 * Same rule as pulse: commercial.team.read does not unlock company stores.
 *
 * Write scopes do not authorize these readers. A department home that needs
 * its own read capability is a CROSS_LANE_CHANGE_REQUEST. Do not invent the string.
 */

import { COMPANY_OPERATING_READ_SCOPE, unproven, type UnprovenRead } from './source-state';

export const WRITE_SCOPES_THAT_DO_NOT_AUTHORIZE_READS = [
  'purchasing.operational.record',
  'production.entry.member',
  'production.review.member',
  'production.operational.record',
  'warehouse.finished_goods.receive',
  'warehouse.finished_goods.allocate',
] as const;

/** Exact strings that must not open purchase, production, or warehouse company stores. */
export const SCOPES_THAT_DO_NOT_UNLOCK_COMPANY_OPERATING_STORES = [
  'commercial.team.read',
  'people.admin',
  ...WRITE_SCOPES_THAT_DO_NOT_AUTHORIZE_READS,
] as const;

export type TrustedOperatingSession = {
  readonly organizationId: string;
  readonly grantedScopes: readonly string[];
  readonly accessStatus?: string;
  /** Present only so callers can see it is ignored. Cargo grants nothing. */
  readonly cargo?: string | null;
  /** Present only so callers can see it is ignored. Title grants nothing. */
  readonly title?: string | null;
};

export function trustedOrganizationId(
  session: { organizationId?: string | null } | null | undefined,
): string | null {
  if (!session || typeof session.organizationId !== 'string') return null;
  const trimmed = session.organizationId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function holdsExactScope(
  granted: readonly string[] | undefined,
  required: string,
): boolean {
  const needle = required.trim();
  if (!needle) return false;
  return (granted ?? []).some((scope) => scope.trim() === needle);
}

/** Cargo and title never assign a read. The arguments are ignored on purpose. */
export function cargoAndTitleGrantNothing(
  _cargo: string | null | undefined,
  _title: string | null | undefined,
): readonly [] {
  return [];
}

export type CompanyReadGate =
  | { ok: true; organizationId: string }
  | { ok: false; result: UnprovenRead };

/**
 * Organization comes only from the trusted session.
 * A caller-supplied organization id is not an argument of this function.
 */
export function gateCompanyOperatingRead(
  session: TrustedOperatingSession | null | undefined,
): CompanyReadGate {
  const organizationId = trustedOrganizationId(session);
  if (!organizationId || !session) {
    return {
      ok: false,
      result: unproven({
        reasonCode: 'auth_required',
        reason: 'auth_required',
        detail: 'No trusted organization in the session. A caller-supplied organization id is not read.',
      }),
    };
  }

  cargoAndTitleGrantNothing(session.cargo, session.title);
  if (session.accessStatus !== 'active') {
    return {
      ok: false,
      result: unproven({
        organizationId,
        reasonCode: 'unauthorized',
        reason: 'unauthorized',
        detail: 'An inactive member cannot read company operating stores. Cargo and title grant nothing.',
      }),
    };
  }

  if (!holdsExactScope(session.grantedScopes, COMPANY_OPERATING_READ_SCOPE)) {
    return {
      ok: false,
      result: unproven({
        organizationId,
        reasonCode: 'unauthorized',
        reason: 'unauthorized',
        detail:
          'Company operating reads require management.org.read exactly. commercial.team.read, people.admin, cargo, title, and write scopes do not authorize this reader.',
      }),
    };
  }

  return { ok: true, organizationId };
}
