import { Controller, Get, Query, Req } from '@nestjs/common';
import { getPrisma } from '@isalwa/database';
import { DEMO_HEROES } from '@isalwa/contracts';
import {
  searchAccountsAndProducts,
  sessionFromAuthenticatedRequest,
  type AuthenticatedSearchRequest,
  type SearchReadResult,
} from './search-query';

const HERO_CODES = new Set(Object.values(DEMO_HEROES));

@Controller('search')
export class SearchController {
  @Get()
  async search(
    @Query('q') q = '',
    @Query('limit') limit = '10',
    @Req() req?: AuthenticatedSearchRequest,
  ): Promise<SearchReadResult> {
    const session = sessionFromAuthenticatedRequest(req);
    if (!session) {
      return searchAccountsAndProducts({
        query: q,
        limit,
        session: null,
        db: null,
        rankAccount,
      });
    }
    const db = req && 'readDb' in req ? (req.readDb ?? null) : getPrisma();
    return searchAccountsAndProducts({
      query: q,
      limit,
      session,
      db,
      rankAccount,
    });
  }
}

function rankAccount(
  account: { code: string; tradeName: string | null; legalName: string; relationshipScore: number },
  needle: string,
): number {
  const normalized = needle.toLowerCase();
  const trade = (account.tradeName ?? '').toLowerCase();
  const legal = account.legalName.toLowerCase();
  let score = account.relationshipScore;
  if (HERO_CODES.has(account.code as (typeof DEMO_HEROES)[keyof typeof DEMO_HEROES])) score += 10_000;
  if (account.code.toLowerCase().startsWith('h-')) score += 5_000;
  if (trade === normalized || legal === normalized) score += 2_000;
  if (trade.includes(normalized) && trade.length > normalized.length + 4) score += 800;
  if (account.code.toLowerCase().includes(normalized)) score += 1_500;
  return score;
}
