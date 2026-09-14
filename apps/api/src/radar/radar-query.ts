/**
 * Open attention for Radar. The tenant predicate is the session organization
 * already bound by authentication. A caller-supplied organizationId is not an
 * input and must not widen the query.
 *
 * Scope matches the existing attention surface: commercial.team.read.
 * Do not invent a new scope. people.admin and management.org.read do not grant this read.
 */

import { getPrisma } from '@isalwa/database';
import {
  holdsExactScope,
  trustedOrganizationId,
  type TenantDenialCode,
  type TrustedTenantSession,
} from '../auth/trusted-session';

export {
  holdsExactScope,
  sessionFromAuthenticatedRequest,
  trustedOrganizationId,
  type TrustedTenantSession,
} from '../auth/trusted-session';

export const RADAR_ATTENTION_SCOPE = 'commercial.team.read';
export const RADAR_TAKE = 30;

export type RadarDenialCode = TenantDenialCode;

export type RadarAttentionWhere = {
  organizationId: string;
  status: 'open';
};

export type RadarFindManyArgs = {
  where: RadarAttentionWhere;
  orderBy: { score: 'desc' };
  take: number;
  include: { account: true };
};

export type RadarAttentionRow = {
  id: string;
  organizationId: string;
  status: string;
  kind: string;
  score: number;
  reasonJson: unknown;
  accountId: string | null;
  account: {
    id: string;
    organizationId: string;
    tradeName: string | null;
    legalName: string;
    segment: string | null;
  } | null;
};

export type RadarReadDb = {
  attentionItem: {
    findMany: (args: RadarFindManyArgs) => Promise<RadarAttentionRow[]>;
  };
};

export type RadarItem = {
  id: string;
  kind: string;
  score: number;
  reason: unknown;
  accountId: string | null;
  title: string;
  segment: string | null;
  href: string;
};

export type RadarReadResult = {
  items: RadarItem[];
  code: RadarDenialCode | null;
  count: number;
};

export type AuthenticatedRadarRequest = {
  authenticatedSession?: unknown;
  query?: { organizationId?: string };
  body?: { organizationId?: string };
  readDb?: RadarReadDb | null;
};

const EMPTY_ITEMS: RadarItem[] = [];

function denied(code: RadarDenialCode): RadarReadResult {
  return { items: EMPTY_ITEMS, code, count: 0 };
}

function readDbOverride(req: AuthenticatedRadarRequest | undefined): RadarReadDb | null | undefined {
  if (!req || !Object.prototype.hasOwnProperty.call(req, 'readDb')) return undefined;
  return req.readDb ?? null;
}

export function canReadRadar(session: TrustedTenantSession | null): boolean {
  return session !== null && holdsExactScope(session.grantedScopes, RADAR_ATTENTION_SCOPE);
}

/**
 * Loads Prisma only after the session is allowed and no test override is present.
 * query.organizationId and body.organizationId are not read.
 */
export function resolveRadarDb(
  req: AuthenticatedRadarRequest | undefined,
  allowed: boolean,
  loadPrisma: () => RadarReadDb | null = () => (getPrisma() as RadarReadDb | null) ?? null,
): RadarReadDb | null {
  const override = readDbOverride(req);
  if (!allowed) return override ?? null;
  if (override !== undefined) return override;
  return loadPrisma();
}

export async function listRadarItems(input: {
  session: TrustedTenantSession | null | undefined;
  db: RadarReadDb | null;
}): Promise<RadarReadResult> {
  const organizationId = trustedOrganizationId(input.session);
  if (!organizationId || !input.session) return denied('AUTH_REQUIRED');
  if (!holdsExactScope(input.session.grantedScopes, RADAR_ATTENTION_SCOPE)) {
    return denied('ROLE_FORBIDDEN');
  }
  if (!input.db) return { items: EMPTY_ITEMS, code: null, count: 0 };

  const rows = await input.db.attentionItem.findMany({
    where: { organizationId, status: 'open' },
    orderBy: { score: 'desc' },
    take: RADAR_TAKE,
    include: { account: true },
  });

  const items = rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    score: row.score,
    reason: row.reasonJson,
    accountId: row.accountId,
    title: row.account?.tradeName ?? row.account?.legalName ?? row.kind,
    segment: row.account?.segment ?? null,
    href: row.accountId ? `/personas/${row.accountId}` : '/radar',
  }));

  return { items, code: null, count: items.length };
}
