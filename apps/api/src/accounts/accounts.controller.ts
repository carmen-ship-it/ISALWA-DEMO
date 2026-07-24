import { Controller, Get, Param, Query } from '@nestjs/common';
import { AccountsService } from './accounts.service';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get()
  list(
    @Query('q') q?: string,
    @Query('segment') segment?: string,
    @Query('persona') persona?: string,
    @Query('take') take?: string,
  ) {
    return this.accounts.list({
      q,
      segment,
      persona,
      take: take ? Number(take) : undefined,
    });
  }

  @Get(':id')
  dossier(@Param('id') id: string) {
    return this.accounts.dossier(id);
  }

  @Get(':id/timeline')
  timeline(@Param('id') id: string) {
    return this.accounts.timeline(id);
  }
}
