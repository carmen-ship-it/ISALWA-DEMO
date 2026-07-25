import { Controller, Get, Query } from '@nestjs/common';
import { getPrisma } from '@isalwa/database';

@Controller('territorio')
export class TerritorioController {
  @Get('points')
  async points(@Query('take') take?: string) {
    const prisma = getPrisma();
    if (!prisma) return { points: [] };
    const accounts = await prisma.account.findMany({
      take: take ? Number(take) : 200,
      include: {
        locations: { where: { isPrimary: true }, take: 1 },
        territory: true,
        owner: { select: { id: true, name: true } },
      },
    });
    return {
      points: accounts
        .filter((a) => a.locations[0])
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
        })),
    };
  }
}
