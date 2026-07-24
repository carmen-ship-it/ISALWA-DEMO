import { Controller, Get, Query } from '@nestjs/common';
import { getPrisma } from '@isalwa/database';
import { DEMO_HEROES } from '@isalwa/contracts';

const HERO_CODES = new Set(Object.values(DEMO_HEROES));

@Controller('search')
export class SearchController {
  @Get()
  async search(@Query('q') q = '', @Query('limit') limit = '10') {
    const prisma = getPrisma();
    if (!prisma || !q.trim()) return { results: [] };
    const take = Math.min(Number(limit) || 10, 25);
    const needle = q.trim();
    const [accounts, products] = await Promise.all([
      prisma.account.findMany({
        where: {
          OR: [
            { legalName: { contains: needle, mode: 'insensitive' } },
            { tradeName: { contains: needle, mode: 'insensitive' } },
            { code: { contains: needle, mode: 'insensitive' } },
          ],
        },
        // Over-fetch then rank — heroes and longer exact matches must surface first
        take: Math.min(take * 4, 40),
        orderBy: { relationshipScore: 'desc' },
      }),
      prisma.product.findMany({
        where: {
          OR: [
            { name: { contains: needle, mode: 'insensitive' } },
            { sku: { contains: needle, mode: 'insensitive' } },
          ],
        },
        take: 5,
      }),
    ]);

    const ranked = [...accounts].sort((a, b) => rankAccount(b, needle) - rankAccount(a, needle));

    return {
      results: [
        ...ranked.slice(0, take).map((a) => ({
          id: a.id,
          type: 'account' as const,
          title: a.tradeName ?? a.legalName,
          subtitle: `${a.code} · Segmento ${a.segment} · Score ${a.relationshipScore}`,
          href: `/personas/${a.id}`,
        })),
        ...products.map((p) => ({
          id: p.id,
          type: 'product' as const,
          title: p.name,
          subtitle: p.sku,
          href: `/cierre?product=${p.id}`,
        })),
      ],
    };
  }
}

function rankAccount(
  a: { code: string; tradeName: string | null; legalName: string; relationshipScore: number },
  needle: string,
): number {
  const n = needle.toLowerCase();
  const trade = (a.tradeName ?? '').toLowerCase();
  const legal = a.legalName.toLowerCase();
  let score = a.relationshipScore;
  if (HERO_CODES.has(a.code as (typeof DEMO_HEROES)[keyof typeof DEMO_HEROES])) score += 10_000;
  if (a.code.toLowerCase().startsWith('h-')) score += 5_000;
  if (trade === n || legal === n) score += 2_000;
  if (trade.includes(n) && trade.length > n.length + 4) score += 800; // longer, more specific name
  if (a.code.toLowerCase().includes(n)) score += 1_500;
  return score;
}
