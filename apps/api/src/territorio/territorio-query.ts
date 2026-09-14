/**
 * Territory map points. Coordinates are tenant data; a map is not exempt.
 * The tenant predicate is the session organization already bound by
 * authentication. A caller-supplied organizationId is not an input.
 *
 * Required read capability is the existing commercial.team.read scope.
 * There is no separate map scope.
 */

import {
  holdsExactScope,
  trustedOrganizationId,
  type TrustedTenantSession,
} from '../auth/trusted-session';

export const TERRITORY_POINTS_SCOPE = 'commercial.team.read';

const DEFAULT_TAKE = 200;

export type TerritoryDenialCode = 'AUTH_REQUIRED' | 'ROLE_FORBIDDEN';

export type TerritoryPoint = {
  accountId: string;
  name: string;
  code: string;
  segment: string;
  creditStatus: string;
  personaKey: string | null;
  territoryCode: string;
  relationshipScore: number;
  lastVisitAt: string | null;
  ownerId: string;
  ownerName: string;
  lat: number;
  lng: number;
  href: string;
};

export type TerritoryPointsResult = {
  points: TerritoryPoint[];
  code: TerritoryDenialCode | null;
  count: number;
};

export type TerritoryLocationRow = {
  lat: number | string;
  lng: number | string;
};

export type TerritoryAccountRow = {
  id: string;
  organizationId: string;
  code: string;
  legalName: string;
  tradeName: string | null;
  segment: string;
  creditStatus: string;
  personaKey: string | null;
  relationshipScore: number;
  lastVisitAt: Date | string | null;
  ownerUserId: string;
  locations: TerritoryLocationRow[];
  territory: { code: string };
  owner: { id: string; name: string };
};

/** Account filter is only the session organization. A box would be additional AND, not a replacement. */
export type TerritoryFindManyArgs = {
  where: { organizationId: string };
  take: number;
  include: {
    locations: { where: { isPrimary: true }; take: 1 };
    territory: true;
    owner: { select: { id: true; name: true } };
  };
};

export type TerritoryReadDb = {
  account: {
    findMany: (args: TerritoryFindManyArgs) => Promise<TerritoryAccountRow[]>;
  };
};

export type TerritoryPointsRequest = {
  authenticatedSession?: unknown;
  query?: { organizationId?: string };
  readDb?: TerritoryReadDb | null;
};

const EMPTY: TerritoryPointsResult = {
  points: [],
  code: null,
  count: 0,
};

function denied(code: TerritoryDenialCode): TerritoryPointsResult {
  return { ...EMPTY, code };
}

function boundedTake(take: string | number | undefined): number {
  if (take === undefined || take === '') return DEFAULT_TAKE;
  const parsed = typeof take === 'number' ? take : Number(take);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_TAKE;
  return Math.min(Math.floor(parsed), DEFAULT_TAKE);
}

function visitIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
}

function toPoint(account: TerritoryAccountRow): TerritoryPoint | null {
  const location = account.locations[0];
  if (!location) return null;
  const lat = Number(location.lat);
  const lng = Number(location.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    accountId: account.id,
    name: account.tradeName ?? account.legalName,
    code: account.code,
    segment: account.segment,
    creditStatus: account.creditStatus,
    personaKey: account.personaKey,
    territoryCode: account.territory.code,
    relationshipScore: account.relationshipScore,
    lastVisitAt: visitIso(account.lastVisitAt),
    ownerId: account.ownerUserId,
    ownerName: account.owner.name,
    lat,
    lng,
    href: `/personas/${account.id}`,
  };
}

export async function listTerritoryPoints(input: {
  take?: string | number;
  session: TrustedTenantSession | null | undefined;
  db: TerritoryReadDb | null;
}): Promise<TerritoryPointsResult> {
  const organizationId = trustedOrganizationId(input.session);
  if (!organizationId || !input.session) return denied('AUTH_REQUIRED');
  if (!holdsExactScope(input.session.grantedScopes, TERRITORY_POINTS_SCOPE)) {
    return denied('ROLE_FORBIDDEN');
  }
  if (!input.db) return { ...EMPTY };

  const take = boundedTake(input.take);
  const accounts = await input.db.account.findMany({
    where: { organizationId },
    take,
    include: {
      locations: { where: { isPrimary: true }, take: 1 },
      territory: true,
      owner: { select: { id: true, name: true } },
    },
  });

  const points = accounts.map(toPoint).filter((point): point is TerritoryPoint => point !== null);

  return { points, code: null, count: points.length };
}
