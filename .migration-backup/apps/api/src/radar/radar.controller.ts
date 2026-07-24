import { Controller, Get } from '@nestjs/common';
import { getPrisma } from '@isalwa/database';

@Controller('radar')
export class RadarController {
  @Get('items')
  async items() {
    const prisma = getPrisma();
    if (!prisma) return { items: [] };
    const rows = await prisma.attentionItem.findMany({
      where: { status: 'open' },
      orderBy: { score: 'desc' },
      take: 30,
      include: { account: true },
    });
    return {
      items: rows.map((r) => ({
        id: r.id,
        kind: r.kind,
        score: r.score,
        reason: r.reasonJson,
        accountId: r.accountId,
        title: r.account?.tradeName ?? r.account?.legalName ?? r.kind,
        segment: r.account?.segment ?? null,
        href: r.accountId ? `/personas/${r.accountId}` : '/radar',
      })),
    };
  }
}
