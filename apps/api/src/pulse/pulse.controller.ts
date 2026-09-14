import { Controller, Get, Req } from '@nestjs/common';
import {
  holdsExactScope,
  sessionFromAuthenticatedRequest,
} from '../auth/trusted-session';
import { PulseService } from './pulse.service';
import {
  PULSE_READ_SCOPE,
  resolvePulseDb,
  type AuthenticatedPulseRequest,
} from './pulse-query';

@Controller('pulse')
export class PulseController {
  constructor(private readonly pulse: PulseService) {}

  @Get()
  getPulse(@Req() req?: AuthenticatedPulseRequest) {
    const session = sessionFromAuthenticatedRequest(req);
    const allowed =
      session !== null && holdsExactScope(session.grantedScopes, PULSE_READ_SCOPE);
    return this.pulse.getPulse(session, resolvePulseDb(req, allowed));
  }
}
