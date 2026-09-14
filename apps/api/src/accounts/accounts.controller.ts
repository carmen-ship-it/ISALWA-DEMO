import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { sessionFromAuthenticatedRequest } from '../search/search-query';
import { AccountsService, type AccountDenialCode, type AccountReadDb } from './accounts.service';

/**
 * Nest does not attach authenticatedSession. A missing trusted session fails
 * closed. A query or header organizationId is not read. HTTP stays AUTH_BLOCKED
 * until a trusted session is attached; that is not a pass of the live route.
 */
export type AccountHttpRequest = {
  authenticatedSession?: unknown;
  query?: { organizationId?: string };
  headers?: Record<string, string | undefined>;
  readDb?: AccountReadDb | null;
};

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get()
  list(
    @Query('q') q?: string,
    @Query('segment') segment?: string,
    @Query('persona') persona?: string,
    @Query('take') take?: string,
    @Req() req?: AccountHttpRequest,
  ) {
    return this.accounts.list({
      q,
      segment,
      persona,
      take: take ? Number(take) : undefined,
      session: sessionFromAuthenticatedRequest({ authenticatedSession: req?.authenticatedSession }),
      db: req && 'readDb' in req ? req.readDb : undefined,
    });
  }

  @Get(':id')
  dossier(@Param('id') id: string, @Req() req?: AccountHttpRequest) {
    return this.accounts.dossier(
      id,
      sessionFromAuthenticatedRequest({ authenticatedSession: req?.authenticatedSession }),
      req && 'readDb' in req ? req.readDb : undefined,
    );
  }

  @Get(':id/timeline')
  timeline(@Param('id') id: string, @Req() req?: AccountHttpRequest): Promise<{
    items: Array<{
      id: string;
      type: string;
      title: string;
      body: string | null;
      occurredAt: string;
      payload: unknown;
      canonicalType: string | null;
      family: string;
    }>;
    code: AccountDenialCode | null;
    count: number;
  }> {
    return this.accounts.timeline(
      id,
      sessionFromAuthenticatedRequest({ authenticatedSession: req?.authenticatedSession }),
      req && 'readDb' in req ? (req.readDb as never) : undefined,
    );
  }
}
