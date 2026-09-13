import { Controller, Get, HttpException, Inject, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import { authenticatedSessionHttpError, resolveSession, toAuthenticatedSessionView } from './os-session';
import { OS_STORE } from './os-store.module';

/**
 * Authenticated session read. Member id comes only from resolveSession
 * (Supabase identity → AuthIdentity → active OrganizationMember).
 * Query, body, and client member/org fields are ignored.
 */
@Controller('session')
export class SessionController {
  constructor(@Inject(OS_STORE) private readonly workforceStore: OsWorkforceStore) {}

  @Get('me')
  async current(@Req() req: Request) {
    try {
      const session = await resolveSession(req, this.workforceStore);
      return toAuthenticatedSessionView(session);
    } catch (err) {
      const mapped = authenticatedSessionHttpError(err);
      throw new HttpException(mapped.body, mapped.status);
    }
  }
}
