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
import { MASTER_DATA_ADMIN_SCOPE, SearchPartiesQuerySchema } from '@isalwa/os-contracts';
import { memberHasScope } from '@isalwa/os-domain';
import type { OsPartyStore } from '@isalwa/os-party';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import { buildQueryContext, type MasterDataPartySummary, type PartyQueryService } from '@isalwa/os-query';
import { resolveSession } from './os-session';
import { enforceRequestRateLimit, type RateLimitCounter } from './request-rate-limit';
import {
  OS_PARTY_QUERY_SERVICE,
  OS_PARTY_STORE,
  OS_RATE_LIMIT_COUNTER,
  OS_STORE,
} from './os-store.module';

/**
 * Data-steward lookup (T03, 2026-10-16 19:30). master_data.admin only; party
 * identity and fiscal identity, the fields that scope maintains. No contacts,
 * locations, account owner, conversations, quotes or payments, and no commercial
 * action follows from this access.
 */
@Controller('master-data/parties')
export class MasterDataController {
  constructor(
    @Inject(OS_PARTY_STORE) private readonly partyStore: OsPartyStore,
    @Inject(OS_STORE) private readonly workforceStore: OsWorkforceStore,
    @Inject(OS_PARTY_QUERY_SERVICE) private readonly partyQuery: PartyQueryService,
    @Inject(OS_RATE_LIMIT_COUNTER) private readonly rateLimits: RateLimitCounter,
  ) {}

  private async stewardContext(req: Request) {
    const session = await resolveSession(req, this.workforceStore);
    const ctx = await buildQueryContext(session, this.workforceStore);
    if (!memberHasScope(ctx.auth, MASTER_DATA_ADMIN_SCOPE)) throw new Error('PERMISSION_DENIED');
    return { session, ctx };
  }

  /** `?q=` matches display or legal name; `?nit=` is an exact active NIT. */
  @Get()
  async search(@Query() queryParams: Record<string, string>, @Req() req: Request) {
    try {
      const { session, ctx } = await this.stewardContext(req);
      await enforceRequestRateLimit(this.rateLimits, 'search', session);
      const nit = queryParams.nit?.trim();
      if (nit) {
        const fiscal = await this.partyStore.findActiveFiscalByNit(session.organizationId, nit);
        const party = fiscal ? await this.partyStore.getPartyInOrg(session.organizationId, fiscal.partyId) : null;
        if (!party || party.organizationId !== session.organizationId) {
          return { items: [], meta: { nextCursor: null, limit: 1, hasMore: false } };
        }
        const roles = await this.partyStore.listActivePartyRoles(
          session.organizationId,
          party.id,
          session.effectiveAt ?? new Date(),
        );
        const item: MasterDataPartySummary = {
          partyId: party.id,
          partyKind: party.partyKind,
          displayName: party.displayName,
          legalName: party.legalName,
          status: party.status,
          activeRoleKeys: roles.map((role) => role.roleKey),
          mergedIntoPartyId: party.mergedIntoPartyId ?? null,
        };
        return { items: [item], meta: { nextCursor: null, limit: 1, hasMore: false } };
      }
      const { nit: _nit, ...rest } = queryParams;
      const parsed = SearchPartiesQuerySchema.safeParse(rest);
      if (!parsed.success) throw new Error('VALIDATION_FAILED');
      return await this.partyQuery.searchMasterDataParties(ctx, parsed.data);
    } catch (err) {
      throw toHttp(err);
    }
  }

  @Get(':partyId')
  async detail(@Param('partyId') partyId: string, @Req() req: Request) {
    try {
      const { session } = await this.stewardContext(req);
      const party = await this.partyStore.getPartyInOrg(session.organizationId, partyId);
      if (!party || party.organizationId !== session.organizationId) throw new Error('NOT_FOUND');
      const asOf = session.effectiveAt ?? new Date();
      const roles = await this.partyStore.listActivePartyRoles(session.organizationId, partyId, asOf);
      const fiscal = await this.partyStore.listFiscalIdentitiesForParty(session.organizationId, partyId);
      return {
        partyId: party.id,
        partyKind: party.partyKind,
        displayName: party.displayName,
        legalName: party.legalName,
        status: party.status,
        mergedIntoPartyId: party.mergedIntoPartyId ?? null,
        version: party.version,
        activeRoleKeys: roles.map((role) => role.roleKey),
        fiscalIdentities: fiscal.map((row) => ({
          nit: row.nit,
          razonSocial: row.razonSocial,
          effectiveAt: row.effectiveAt.toISOString(),
          endedAt: row.endedAt?.toISOString() ?? null,
        })),
      };
    } catch (err) {
      throw toHttp(err);
    }
  }
}

function toHttp(err: unknown): HttpException {
  if (err instanceof HttpException) return err;
  const code = err instanceof Error ? err.message : 'INTERNAL_ERROR';
  const status =
    code === 'AUTH_REQUIRED'
      ? HttpStatus.UNAUTHORIZED
      : code === 'NOT_FOUND'
        ? HttpStatus.NOT_FOUND
        : code === 'VALIDATION_FAILED'
          ? HttpStatus.BAD_REQUEST
          : code === 'RATE_LIMITED'
            ? HttpStatus.TOO_MANY_REQUESTS
            : code === 'TENANT_FORBIDDEN' || code === 'PERMISSION_DENIED' || code === 'ACCESS_REVOKED'
              ? HttpStatus.FORBIDDEN
              : HttpStatus.INTERNAL_SERVER_ERROR;
  return new HttpException({ code }, status);
}
