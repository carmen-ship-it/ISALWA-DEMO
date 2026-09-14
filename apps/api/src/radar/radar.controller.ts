import { Controller, Get, Req } from '@nestjs/common';
import {
  holdsExactScope,
  sessionFromAuthenticatedRequest,
} from '../auth/trusted-session';
import {
  listRadarItems,
  RADAR_ATTENTION_SCOPE,
  resolveRadarDb,
  type AuthenticatedRadarRequest,
} from './radar-query';

@Controller('radar')
export class RadarController {
  @Get('items')
  items(@Req() req?: AuthenticatedRadarRequest) {
    const session = sessionFromAuthenticatedRequest(req);
    const allowed =
      session !== null && holdsExactScope(session.grantedScopes, RADAR_ATTENTION_SCOPE);
    return listRadarItems({
      session,
      db: resolveRadarDb(req, allowed),
    });
  }
}
