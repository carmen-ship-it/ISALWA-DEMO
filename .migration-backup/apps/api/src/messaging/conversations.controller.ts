import { Controller, Get, Param, Query } from '@nestjs/common';
import { getPrisma } from '@isalwa/database';

@Controller('conversations')
export class ConversationsController {
  @Get()
  async list(@Query('take') take?: string) {
    const prisma = getPrisma();
    if (!prisma) return { items: [] };
    const rows = await prisma.conversation.findMany({
      orderBy: { lastMessageAt: 'desc' },
      take: take ? Number(take) : 40,
      include: {
        account: true,
        channel: true,
        messages: { orderBy: { sentAt: 'desc' }, take: 1 },
      },
    });
    return {
      items: rows.map((c) => ({
        id: c.id,
        accountId: c.accountId,
        accountName: c.account?.tradeName ?? c.account?.legalName ?? c.contactPhoneE164,
        channel: c.channel.displayName,
        purpose: c.channel.purpose,
        status: c.status,
        slaStatus: c.slaStatus,
        lastMessageAt: c.lastMessageAt,
        preview: c.messages[0]?.body ?? '',
        href: c.accountId ? `/personas/${c.accountId}` : `/senal?c=${c.id}`,
      })),
    };
  }

  @Get(':id')
  async one(@Param('id') id: string) {
    const prisma = getPrisma();
    if (!prisma) return null;
    const c = await prisma.conversation.findUnique({
      where: { id },
      include: {
        account: true,
        channel: true,
        messages: { orderBy: { sentAt: 'asc' } },
      },
    });
    if (!c) return null;
    return {
      id: c.id,
      accountId: c.accountId,
      accountName: c.account?.tradeName ?? c.account?.legalName,
      channel: c.channel.displayName,
      purpose: c.channel.purpose,
      slaStatus: c.slaStatus,
      messages: c.messages.map((m) => ({
        id: m.id,
        direction: m.direction,
        body: m.body,
        sentAt: m.sentAt,
        senderType: m.senderType,
      })),
    };
  }
}
