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
import {
  canGrantCustomerCoverage,
  canReassignCommercialAccountOwner,
  CursorPaginationSchema,
  ListPartyTimelineQuerySchema,
  resolveAccountAssignmentAuthority,
  SearchPartiesQuerySchema,
  grantableCoverageActionsFor,
} from '@isalwa/os-contracts';
import type { OsPartyStore } from '@isalwa/os-party';
import type { OsCommercialStore } from '@isalwa/os-commercial';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import {
  assertCustomerReadable,
  buildQueryContext,
  type CustomerVisibilityLookup,
  type DirectReportLookup,
  type PartyQueryService,
  type PartyTimelineQueryService,
} from '@isalwa/os-query';
import { resolveSession } from './os-session';
import { enforceRequestRateLimit, type RateLimitCounter } from './request-rate-limit';
import {
  OS_COMMERCIAL_STORE,
  OS_CUSTOMER_VISIBILITY,
  OS_MEMBER_QUERY_STORE,
  OS_PARTY_QUERY_SERVICE,
  OS_PARTY_STORE,
  OS_PARTY_TIMELINE_QUERY_SERVICE,
  OS_RATE_LIMIT_COUNTER,
  OS_STORE,
} from './os-store.module';

@Controller('parties')
export class PartiesController {
  constructor(
    @Inject(OS_PARTY_STORE) private readonly partyStore: OsPartyStore,
    @Inject(OS_STORE) private readonly workforceStore: OsWorkforceStore,
    @Inject(OS_COMMERCIAL_STORE) private readonly commercialStore: OsCommercialStore,
    @Inject(OS_PARTY_QUERY_SERVICE) private readonly partyQuery: PartyQueryService,
    @Inject(OS_PARTY_TIMELINE_QUERY_SERVICE)
    private readonly partyTimelineQuery: PartyTimelineQueryService,
    @Inject(OS_CUSTOMER_VISIBILITY) private readonly customerVisibility: CustomerVisibilityLookup,
    @Inject(OS_MEMBER_QUERY_STORE) private readonly directReports: DirectReportLookup,
    @Inject(OS_RATE_LIMIT_COUNTER) private readonly rateLimits: RateLimitCounter,
  ) {}

  /**
   * UI hints only; the commands recheck. Reassignment/coverage needs the action
   * permission plus assignment scope over this account (any eligible target in scope).
   */
  private async accountAssignmentFlags(
    organizationId: string,
    actorMemberId: string,
    asOf: Date,
    grantedScopes: string[],
    ownerMemberId: string | null,
  ): Promise<{ canReassignOwner: boolean; canManageCoverage: boolean; grantableCoverageActions: string[] }> {
    const authority = resolveAccountAssignmentAuthority({
      grantedScopes,
      currentOwnerMemberId: ownerMemberId,
      actorLeadsCurrentOwner: ownerMemberId
        ? await this.partyStore.isDirectReport(organizationId, actorMemberId, ownerMemberId, asOf)
        : false,
      actorLeadsTarget: true,
    });
    const canManageCoverage = authority !== null && ownerMemberId !== null && canGrantCustomerCoverage(grantedScopes);
    return {
      canReassignOwner: authority !== null && canReassignCommercialAccountOwner(grantedScopes),
      canManageCoverage,
      grantableCoverageActions: canManageCoverage ? grantableCoverageActionsFor(grantedScopes) : [],
    };
  }

  /** Session, query context and the customer boundary. Unreadable is NOT_FOUND. */
  private async readableCustomer(req: Request, partyId: string) {
    const session = await resolveSession(req, this.workforceStore);
    const ctx = await buildQueryContext(session, this.workforceStore);
    await assertCustomerReadable({
      ctx,
      partyId,
      lookup: this.customerVisibility,
      directReports: this.directReports,
    });
    return { session, ctx };
  }

  @Get()
  async searchParties(@Query() queryParams: Record<string, string>, @Req() req: Request) {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const parsed = SearchPartiesQuerySchema.safeParse(queryParams);
      if (!parsed.success) {
        throw new HttpException({ code: 'VALIDATION_FAILED' }, HttpStatus.BAD_REQUEST);
      }
      await enforceRequestRateLimit(this.rateLimits, 'search', session);
      const ctx = await buildQueryContext(session, this.workforceStore);
      const result = await this.partyQuery.searchParties(ctx, parsed.data);
      return result;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      const code = err instanceof Error ? err.message : 'INTERNAL_ERROR';
      const status =
        code === 'AUTH_REQUIRED'
          ? HttpStatus.UNAUTHORIZED
          : code === 'NOT_FOUND'
            ? HttpStatus.NOT_FOUND
          : code === 'TENANT_FORBIDDEN' ||
              code === 'PERMISSION_DENIED' ||
              code === 'ACCESS_REVOKED'
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
          : code === 'TENANT_FORBIDDEN' ||
              code === 'PERMISSION_DENIED' ||
              code === 'ACCESS_REVOKED'
            ? HttpStatus.FORBIDDEN
            : code === 'VALIDATION_FAILED'
              ? HttpStatus.BAD_REQUEST
              : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException({ code }, status);
    }
  }

  @Get(':partyId/locations')
  async listPartyLocations(@Param('partyId') partyId: string, @Req() req: Request) {
    try {
      const parsed = CursorPaginationSchema.safeParse(req.query ?? {});
      if (!parsed.success) {
        throw new HttpException({ code: 'VALIDATION_FAILED' }, HttpStatus.BAD_REQUEST);
      }
      const { session } = await this.readableCustomer(req, partyId);
      const party = await this.partyStore.getPartyInOrg(session.organizationId, partyId);
      if (!party) {
        throw new HttpException({ code: 'NOT_FOUND' }, HttpStatus.NOT_FOUND);
      }
      const page = await this.partyStore.listLocationsForParty(session.organizationId, partyId, {
        limit: parsed.data.limit,
        cursor: parsed.data.cursor,
      });
      return {
        partyId,
        locations: page.items,
        meta: {
          nextCursor: page.nextCursor,
          limit: parsed.data.limit,
          hasMore: page.hasMore,
        },
      };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      const code = err instanceof Error ? err.message : 'INTERNAL_ERROR';
      const status =
        code === 'AUTH_REQUIRED'
          ? HttpStatus.UNAUTHORIZED
          : code === 'NOT_FOUND'
            ? HttpStatus.NOT_FOUND
          : code === 'TENANT_FORBIDDEN' ||
              code === 'PERMISSION_DENIED' ||
              code === 'ACCESS_REVOKED'
            ? HttpStatus.FORBIDDEN
            : code === 'VALIDATION_FAILED'
              ? HttpStatus.BAD_REQUEST
              : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException({ code }, status);
    }
  }

  @Get(':partyId/contacts')
  async listPartyContacts(@Param('partyId') partyId: string, @Req() req: Request) {
    try {
      const parsed = CursorPaginationSchema.safeParse(req.query ?? {});
      if (!parsed.success) {
        throw new HttpException({ code: 'VALIDATION_FAILED' }, HttpStatus.BAD_REQUEST);
      }
      const { session } = await this.readableCustomer(req, partyId);
      const party = await this.partyStore.getPartyInOrg(session.organizationId, partyId);
      if (!party) {
        throw new HttpException({ code: 'NOT_FOUND' }, HttpStatus.NOT_FOUND);
      }
      const page = await this.partyStore.listContactsForOrgParty(session.organizationId, partyId, {
        limit: parsed.data.limit,
        cursor: parsed.data.cursor,
      });
      return {
        partyId,
        contacts: page.items,
        meta: {
          nextCursor: page.nextCursor,
          limit: parsed.data.limit,
          hasMore: page.hasMore,
        },
      };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      const code = err instanceof Error ? err.message : 'INTERNAL_ERROR';
      const status =
        code === 'AUTH_REQUIRED'
          ? HttpStatus.UNAUTHORIZED
          : code === 'NOT_FOUND'
            ? HttpStatus.NOT_FOUND
          : code === 'TENANT_FORBIDDEN' ||
              code === 'PERMISSION_DENIED' ||
              code === 'ACCESS_REVOKED'
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
      const { session, ctx: queryCtx } = await this.readableCustomer(req, partyId);
      const party = await this.partyStore.getPartyInOrg(session.organizationId, partyId);
      if (!party) {
        throw new HttpException({ code: 'NOT_FOUND' }, HttpStatus.NOT_FOUND);
      }
      const roles = await this.partyStore.listActivePartyRoles(
        session.organizationId,
        partyId,
        session.effectiveAt,
      );
      const contactsPage = await this.partyStore.listContactsForOrgParty(
        session.organizationId,
        partyId,
        { limit: 25 },
      );
      const contacts = contactsPage.items;
      const contactsMeta = {
        limit: 25,
        hasMore: contactsPage.hasMore,
        nextCursor: contactsPage.nextCursor,
      };
      const commercialAccount = await this.partyStore.getCommercialAccountForParty(
        session.organizationId,
        partyId,
      );
      const coverageRows = await this.commercialStore.listActiveCustomerCoverageForParty({
        organizationId: session.organizationId,
        customerPartyId: partyId,
        asOf: session.effectiveAt ?? new Date(),
      });
      const activeCoverage = coverageRows[0]
        ? {
            grantId: coverageRows[0].id,
            primaryOwnerMemberId: coverageRows[0].primaryOwnerMemberId,
            actingAdvisorMemberId: coverageRows[0].actingAdvisorMemberId,
            startsAt: coverageRows[0].startsAt.toISOString(),
            endsAt: coverageRows[0].endsAt?.toISOString() ?? null,
            recordedByMemberId: coverageRows[0].recordedByMemberId,
            coveredActions: [...coverageRows[0].coveredActions],
          }
        : null;
      return {
        party,
        roles,
        contacts,
        contactsMeta,
        commercialAccount,
        activeCoverage,
        commercialAuthority: await this.accountAssignmentFlags(
          session.organizationId,
          session.actorMemberId,
          session.effectiveAt ?? new Date(),
          [...queryCtx.auth.roleKeys, ...queryCtx.auth.delegatedScopes],
          commercialAccount?.ownerMemberId ?? null,
        ),
      };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      const code = err instanceof Error ? err.message : 'INTERNAL_ERROR';
      const status =
        code === 'AUTH_REQUIRED'
          ? HttpStatus.UNAUTHORIZED
          : code === 'NOT_FOUND'
            ? HttpStatus.NOT_FOUND
          : code === 'TENANT_FORBIDDEN' ||
              code === 'PERMISSION_DENIED' ||
              code === 'ACCESS_REVOKED'
            ? HttpStatus.FORBIDDEN
            : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException({ code }, status);
    }
  }
}
