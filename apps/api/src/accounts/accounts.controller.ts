import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import {
  sessionFromAuthenticatedRequest,
  type AuthenticatedTenantRequest,
} from '../auth/trusted-session';
import { AccountsService } from './accounts.service';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get()
  list(
    @Req() req: AuthenticatedTenantRequest,
    @Query('q') q?: string,
    @Query('segment') segment?: string,
    @Query('persona') persona?: string,
    @Query('take') take?: string,
  ) {
    return this.accounts.list(sessionFromAuthenticatedRequest(req), {
      q,
      segment,
      persona,
      take: take ? Number(take) : undefined,
    });
  }

  @Get(':id')
  dossier(@Req() req: AuthenticatedTenantRequest, @Param('id') id: string) {
    return this.accounts.dossier(sessionFromAuthenticatedRequest(req), id);
  }

  @Get(':id/timeline')
  timeline(@Req() req: AuthenticatedTenantRequest, @Param('id') id: string) {
    return this.accounts.timeline(sessionFromAuthenticatedRequest(req), id);
  }
}
