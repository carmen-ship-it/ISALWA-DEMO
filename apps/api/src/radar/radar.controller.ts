import { Controller, Get, Req } from '@nestjs/common';
import { getPrisma } from '@isalwa/database';
import { sessionFromAuthenticatedRequest } from '../search/search-query';

/** Matches TENANT_SURFACE_REQUIRED_SCOPE.attention. Not a caller-supplied tenant. */
export const RADAR_READ_SCOPE = 'commercial.team.read';

export type RadarDenialCode = 'AUTH_REQUIRED' | 'ROLE_FORBIDDEN';

type RadarAccount = {
  organizationId: string;
  tradeName: string | null;
  legalName: string;
  segment: string | null;
};

type RadarRow = {
  id: string;
  organizationId: string;
  kind: string;
  score: number;
  reasonJson: unknown;
  accountId: string | null;
  account: RadarAccount | null;
};

export type RadarReadDb = {
  attentionItem: {
    findMany: (args: {
      where: { organizationId: string; status: 'open' };
      orderBy: { score: 'desc' };
      take: number;
      include: { account: true };
    }) => Promise<RadarRow[]>;
  };
};

export type RadarHttpRequest = {
  authenticatedSession?: unknown;
  query?: { organizationId?: string };
  headers?: Record<string, string | undefined>;
  readDb?: RadarReadDb | null;
};

export type RadarListResult = {
  items: Array<{
    id: string;
    kind: string;
    score: number;
    reason: unknown;
    accountId: string | null;
    title: string;
    segment: string | null;
    href: string;
  }>;
  code: RadarDenialCode | null;
  count: number;
};

const PAGE = 30;

function trustedOrganization(session: { organizationId?: string } | null): string | null {
  if (!session || typeof session.organizationId !== 'string') return null;
  const trimmed = session.organizationId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function holdsScope(session: { grantedScopes?: readonly string[] } | null): boolean {
  return (session?.grantedScopes ?? []).some((scope) => scope.trim() === RADAR_READ_SCOPE);
}

function denied(code: RadarDenialCode): RadarListResult {
  return { items: [], code, count: 0 };
}

@Controller('radar')
export class RadarController {
  /**
   * HTTP stays AUTH_BLOCKED until Nest attaches authenticatedSession.
   * query/header organizationId is not an input.
   */
  @Get('items')
  async items(@Req() req?: RadarHttpRequest): Promise<RadarListResult> {
    const session = sessionFromAuthenticatedRequest({ authenticatedSession: req?.authenticatedSession });
    const organizationId = trustedOrganization(session);
    if (!organizationId || !session) return denied('AUTH_REQUIRED');
    if (!holdsScope(session)) return denied('ROLE_FORBIDDEN');
    const prisma = req && 'readDb' in req ? req.readDb : (getPrisma() as RadarReadDb | null);
    if (!prisma) return { items: [], code: null, count: 0 };

    const rows = await prisma.attentionItem.findMany({
      where: { organizationId, status: 'open' },
      orderBy: { score: 'desc' },
      take: PAGE,
      include: { account: true },
    });
    const items = rows.map((r) => {
      const account =
        r.account && r.account.organizationId === organizationId ? r.account : null;
      return {
        id: r.id,
        kind: r.kind,
        score: r.score,
        reason: r.reasonJson,
        accountId: account ? r.accountId : null,
        title: account?.tradeName ?? account?.legalName ?? r.kind,
        segment: account?.segment ?? null,
        href: account && r.accountId ? `/personas/${r.accountId}` : '/radar',
      };
    });
    return { items, code: null, count: items.length };
  }
}
