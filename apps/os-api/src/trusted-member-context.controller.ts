import { Controller, Get, HttpException, Inject, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import { authenticatedSessionHttpError } from './os-session';
import { OS_STORE } from './os-store.module';
import { loadTrustedMemberContextFromRequest } from './trusted-member-context';

/**
 * Server read of the trusted member context. Other controllers are not
 * switched onto this object. A successful response is not proof that HTTP
 * session attachment covers the rest of the API.
 */
@Controller('session')
export class TrustedMemberContextController {
  constructor(@Inject(OS_STORE) private readonly workforceStore: OsWorkforceStore) {}

  @Get('authorization')
  async current(@Req() req: Request) {
    try {
      const result = await loadTrustedMemberContextFromRequest(req, this.workforceStore);
      if (!result.ok) {
        const status = result.denial === 'AUTH_REQUIRED' ? 401 : 403;
        throw new HttpException({ code: result.denial }, status);
      }
      return result.context;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      const mapped = authenticatedSessionHttpError(err);
      throw new HttpException(mapped.body, mapped.status);
    }
  }
}
