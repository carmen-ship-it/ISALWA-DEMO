import { Controller, Get, Query, Req } from '@nestjs/common';
import { getPrisma } from '@isalwa/database';
import {
  holdsExactScope,
  sessionFromAuthenticatedRequest,
  type TrustedTenantSession,
} from '../auth/trusted-session';
import {
  TERRITORY_POINTS_SCOPE,
  listTerritoryPoints,
  type TerritoryPointsRequest,
  type TerritoryPointsResult,
  type TerritoryReadDb,
} from './territorio-query';

@Controller('territorio')
export class TerritorioController {
  @Get('points')
  async points(
    @Query('take') take?: string,
    @Req() req?: TerritoryPointsRequest,
  ): Promise<TerritoryPointsResult> {
    const session: TrustedTenantSession | null = sessionFromAuthenticatedRequest(req);
    if (!session || !holdsExactScope(session.grantedScopes, TERRITORY_POINTS_SCOPE)) {
      return listTerritoryPoints({ take, session, db: null });
    }
    const db = (
      req && 'readDb' in req ? (req.readDb ?? null) : getPrisma()
    ) as TerritoryReadDb | null;
    return listTerritoryPoints({ take, session, db });
  }
}
