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
import {
  buildQueryContext,
  canReadCustomer,
  type CustomerVisibilityLookup,
  type DirectReportLookup,
} from '@isalwa/os-query';
import { resolveSession } from './os-session';
import {
  OS_CUSTOMER_VISIBILITY,
  OS_MEMBER_QUERY_STORE,
  OS_PARTY_STORE,
  OS_STORE,
} from './os-store.module';

@Controller('locations')
export class LocationsController {
  constructor(
    @Inject(OS_PARTY_STORE) private readonly partyStore: OsPartyStore,
    @Inject(OS_STORE) private readonly workforceStore: OsWorkforceStore,
    @Inject(OS_CUSTOMER_VISIBILITY) private readonly customerVisibility: CustomerVisibilityLookup,
    @Inject(OS_MEMBER_QUERY_STORE) private readonly directReports: DirectReportLookup,
  ) {}

  /**
   * Tenant-scoped through getLocationInOrg, then the customer boundary of the
   * owning party. Missing, foreign and unreadable are the same NOT_FOUND.
   */
  @Get(':locationId')
  async getLocation(@Param('locationId') locationId: string, @Req() req: Request) {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const ctx = await buildQueryContext(session, this.workforceStore);
      const location = await this.partyStore.getLocationInOrg(session.organizationId, locationId);
      const readable =
        !!location &&
        (await canReadCustomer({
          ctx,
          partyId: location.partyId,
          lookup: this.customerVisibility,
          directReports: this.directReports,
        }));
      if (!location || !readable) {
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
