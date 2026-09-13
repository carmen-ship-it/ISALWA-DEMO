import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import type { OsPartyStore } from '@isalwa/os-party';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import { resolveSession } from './os-session';
import { OS_PARTY_STORE, OS_STORE } from './os-store.module';

@Controller('locations')
export class LocationsController {
  constructor(
    @Inject(OS_PARTY_STORE) private readonly partyStore: OsPartyStore,
    @Inject(OS_STORE) private readonly workforceStore: OsWorkforceStore,
  ) {}

  @Get(':locationId')
  async getLocation(@Param('locationId') locationId: string, @Req() req: Request) {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const location = await this.partyStore.getLocationInOrg(session.organizationId, locationId);
      if (!location) {
        throw new HttpException({ code: 'NOT_FOUND' }, HttpStatus.NOT_FOUND);
      }
      return { location };
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
