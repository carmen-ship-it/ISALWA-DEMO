import { Controller, Get, HttpException, HttpStatus, Inject, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import { buildQueryContext, type CapabilityQueryService } from '@isalwa/os-query';
import { resolveSession } from './os-session';
import { OS_CAPABILITY_QUERY_SERVICE, OS_STORE } from './os-store.module';

@Controller('capabilities')
export class CapabilitiesController {
  constructor(
    @Inject(OS_STORE) private readonly workforceStore: OsWorkforceStore,
    @Inject(OS_CAPABILITY_QUERY_SERVICE)
    private readonly capabilityQuery: CapabilityQueryService,
  ) {}

  @Get()
  async getCapabilityState(@Req() req: Request) {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const ctx = await buildQueryContext(session, this.workforceStore);
      return await this.capabilityQuery.getCapabilityState(ctx);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      const code = err instanceof Error ? err.message : 'INTERNAL_ERROR';
      const status =
        code === 'AUTH_REQUIRED'
          ? HttpStatus.UNAUTHORIZED
          : code === 'TENANT_FORBIDDEN' ||
              code === 'PERMISSION_DENIED' ||
              code === 'ACCESS_REVOKED'
            ? HttpStatus.FORBIDDEN
            : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException({ code }, status);
    }
  }
}
