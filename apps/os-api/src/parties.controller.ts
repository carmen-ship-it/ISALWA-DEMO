import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { SearchPartiesQuerySchema, ListPartyTimelineQuerySchema } from '@isalwa/os-contracts';
import type { OsPartyStore } from '@isalwa/os-party';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import { buildQueryContext, type PartyQueryService, type PartyTimelineQueryService } from '@isalwa/os-query';
import { resolveSession } from './os-session';
import {
  OS_PARTY_QUERY_SERVICE,
  OS_PARTY_STORE,
  OS_PARTY_TIMELINE_QUERY_SERVICE,
  OS_STORE,
} from './os-store.module';

@Controller('parties')
export class PartiesController {
  constructor(
    @Inject(OS_PARTY_STORE) private readonly partyStore: OsPartyStore,
    @Inject(OS_STORE) private readonly workforceStore: OsWorkforceStore,
    @Inject(OS_PARTY_QUERY_SERVICE) private readonly partyQuery: PartyQueryService,
    @Inject(OS_PARTY_TIMELINE_QUERY_SERVICE)
    private readonly partyTimelineQuery: PartyTimelineQueryService,
  ) {}

  @Get()
  async searchParties(@Query() queryParams: Record<string, string>, @Req() req: Request) {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const parsed = SearchPartiesQuerySchema.safeParse(queryParams);
      if (!parsed.success) {
        throw new HttpException({ code: 'VALIDATION_FAILED' }, HttpStatus.BAD_REQUEST);
      }
      const ctx = await buildQueryContext(session, this.workforceStore);
      const result = await this.partyQuery.searchParties(ctx, parsed.data);
      return result;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      const code = err instanceof Error ? err.message : 'INTERNAL_ERROR';
      const status =
        code === 'AUTH_REQUIRED'
          ? HttpStatus.UNAUTHORIZED
          : code === 'TENANT_FORBIDDEN' || code === 'PERMISSION_DENIED'
            ? HttpStatus.FORBIDDEN
            : code === 'VALIDATION_FAILED'
              ? HttpStatus.BAD_REQUEST
              : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException({ code }, status);
    }
  }

  @Get(':partyId/timeline')
  async listPartyTimeline(
    @Param('partyId') partyId: string,
    @Query() queryParams: Record<string, string>,
    @Req() req: Request,
  ) {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const parsed = ListPartyTimelineQuerySchema.safeParse(queryParams);
      if (!parsed.success) {
        throw new HttpException({ code: 'VALIDATION_FAILED' }, HttpStatus.BAD_REQUEST);
      }
      const ctx = await buildQueryContext(session, this.workforceStore);
      return await this.partyTimelineQuery.listPartyTimeline(ctx, partyId, parsed.data);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      const code = err instanceof Error ? err.message : 'INTERNAL_ERROR';
      const status =
        code === 'AUTH_REQUIRED'
          ? HttpStatus.UNAUTHORIZED
          : code === 'NOT_FOUND'
            ? HttpStatus.NOT_FOUND
          : code === 'TENANT_FORBIDDEN' || code === 'PERMISSION_DENIED'
            ? HttpStatus.FORBIDDEN
            : code === 'VALIDATION_FAILED'
              ? HttpStatus.BAD_REQUEST
              : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException({ code }, status);
    }
  }

  @Get(':partyId')
  async getParty(@Param('partyId') partyId: string, @Req() req: Request) {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const party = await this.partyStore.getPartyInOrg(session.organizationId, partyId);
      if (!party) {
        throw new HttpException({ code: 'NOT_FOUND' }, HttpStatus.NOT_FOUND);
      }
      const roles = await this.partyStore.listActivePartyRoles(
        session.organizationId,
        partyId,
        session.effectiveAt,
      );
      const contacts = await this.partyStore.listContactsForOrgParty(session.organizationId, partyId);
      const commercialAccount = await this.partyStore.getCommercialAccountForParty(
        session.organizationId,
        partyId,
      );
      return {
        party,
        roles,
        contacts,
        commercialAccount,
      };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      const code = err instanceof Error ? err.message : 'INTERNAL_ERROR';
      const status =
        code === 'AUTH_REQUIRED'
          ? HttpStatus.UNAUTHORIZED
          : code === 'TENANT_FORBIDDEN' || code === 'PERMISSION_DENIED'
            ? HttpStatus.FORBIDDEN
            : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException({ code }, status);
    }
  }
}
