import { Controller, Get, Req } from '@nestjs/common';
import { sessionFromAuthenticatedRequest } from '../search/search-query';
import { PulseService, type PulseReadDb } from './pulse.service';

export type PulseHttpRequest = {
  authenticatedSession?: unknown;
  query?: { organizationId?: string };
  headers?: Record<string, string | undefined>;
  readDb?: PulseReadDb | null;
};

@Controller('pulse')
export class PulseController {
  constructor(private readonly pulse: PulseService) {}

  /**
   * HTTP stays AUTH_BLOCKED until Nest attaches authenticatedSession.
   * query organizationId is not an input.
   */
  @Get()
  getPulse(@Req() req?: PulseHttpRequest) {
    return this.pulse.getPulse(
      sessionFromAuthenticatedRequest({ authenticatedSession: req?.authenticatedSession }),
      req && 'readDb' in req ? req.readDb : undefined,
    );
  }
}
