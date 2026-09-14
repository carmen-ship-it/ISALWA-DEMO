import { Controller, Get, Query, Req } from '@nestjs/common';
import { getPrisma } from '@isalwa/database';
import { sessionFromAuthenticatedRequest } from '../search/search-query';

/** Matches TENANT_SURFACE_REQUIRED_SCOPE.customer. Not a caller-supplied tenant. */
export const TERRITORIO_READ_SCOPE = 'commercial.team.read';

export type TerritorioDenialCode = 'AUTH_REQUIRED' | 'ROLE_FORBIDDEN';

type TerritorioAccount = {
  id: string;
  organizationId: string;
  code: string;
  legalName: string;
  tradeName: string | null;
  segment: string;
  creditStatus: string;
  personaKey: string | null;
  relationshipScore: number;
  lastVisitAt: Date | null;
  ownerUserId: string;
  owner: { id: string; name: string; organizationId?: string };
  territory: { code: string; organizationId?: string };
  locations: Array<{ lat: unknown; lng: unknown; organizationId?: string }>;
};

export type TerritorioReadDb = {
  account: {
    findMany: (args: {
      where: { organizationId: string };
      take: number;
      include: {
        locations: { where: { isPrimary: true; organizationId: string }; take: number };
        territory: true;
        owner: { select: { id: true; name: true } };
      };
    }) => Promise<TerritorioAccount[]>;
  };
};

export type TerritorioHttpRequest = {
  authenticatedSession?: unknown;
  query?: { organizationId?: string };
  headers?: Record<string, string | undefined>;
  readDb?: TerritorioReadDb | null;
};

function denied(code: TerritorioDenialCode) {
  return { points: [], code, count: 0 };
}

@Controller('territorio')
export class TerritorioController {
  /**
   * HTTP stays AUTH_BLOCKED until Nest attaches authenticatedSession.
   * query organizationId is not an input.
   */
  @Get('points')
  async points(@Query('take') take?: string, @Req() req?: TerritorioHttpRequest) {
    const session = sessionFromAuthenticatedRequest({ authenticatedSession: req?.authenticatedSession });
    const organizationId = session?.organizationId?.trim() ?? '';
    if (!organizationId) return denied('AUTH_REQUIRED');
    if (!(session?.grantedScopes ?? []).some((scope) => scope.trim() === TERRITORIO_READ_SCOPE)) {
      return denied('ROLE_FORBIDDEN');
    }
    const prisma = req && 'readDb' in req ? req.readDb : (getPrisma() as TerritorioReadDb | null);
    if (!prisma) return { points: [], code: null, count: 0 };

    const page = take ? Number(take) : 200;
    const accounts = await prisma.account.findMany({
      where: { organizationId },
      take: page,
      include: {
        locations: { where: { isPrimary: true, organizationId }, take: 1 },
        territory: true,
        owner: { select: { id: true, name: true } },
      },
    });
    const points = accounts
      .filter((a) => a.organizationId === organizationId && a.locations[0])
      .map((a) => ({
        accountId: a.id,
        name: a.tradeName ?? a.legalName,
        code: a.code,
        segment: a.segment,
        creditStatus: a.creditStatus,
        personaKey: a.personaKey,
        territoryCode: a.territory.code,
        relationshipScore: a.relationshipScore,
        lastVisitAt: a.lastVisitAt?.toISOString() ?? null,
        ownerId: a.ownerUserId,
        ownerName: a.owner.name,
        lat: Number(a.locations[0]!.lat),
        lng: Number(a.locations[0]!.lng),
        href: `/personas/${a.id}`,
      }));
    return { points, code: null, count: points.length };
  }
}
