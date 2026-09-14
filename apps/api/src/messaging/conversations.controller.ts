import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { getPrisma } from '@isalwa/database';
import { sessionFromAuthenticatedRequest } from '../search/search-query';

/** Matches TENANT_SURFACE_REQUIRED_SCOPE.customer_communication. Not a caller-supplied tenant. */
export const CONVERSATION_READ_SCOPE = 'commercial.team.read';

export type ConversationDenialCode = 'AUTH_REQUIRED' | 'ROLE_FORBIDDEN';

type ConversationAccount = {
  organizationId?: string;
  tradeName: string | null;
  legalName: string;
};

type ConversationListRow = {
  id: string;
  organizationId: string;
  accountId: string | null;
  contactPhoneE164: string;
  status: string;
  slaStatus: string | null;
  lastMessageAt: Date;
  account: ConversationAccount | null;
  channel: { displayName: string; purpose: string };
  messages: Array<{ body: string; organizationId?: string }>;
};

type ConversationOneRow = {
  id: string;
  organizationId: string;
  accountId: string | null;
  slaStatus: string | null;
  account: ConversationAccount | null;
  channel: { displayName: string; purpose: string };
  messages: Array<{
    id: string;
    organizationId?: string;
    direction: string;
    body: string;
    sentAt: Date;
    senderType: string;
  }>;
};

export type ConversationReadDb = {
  conversation: {
    findMany: (args: {
      where: { organizationId: string };
      orderBy: { lastMessageAt: 'desc' };
      take: number;
      include: {
        account: true;
        channel: true;
        messages: { where: { organizationId: string }; orderBy: { sentAt: 'desc' }; take: number };
      };
    }) => Promise<ConversationListRow[]>;
    findFirst: (args: {
      where: { id: string; organizationId: string };
      include: {
        account: true;
        channel: true;
        messages: { where: { organizationId: string }; orderBy: { sentAt: 'asc' } };
      };
    }) => Promise<ConversationOneRow | null>;
  };
};

export type ConversationHttpRequest = {
  authenticatedSession?: unknown;
  query?: { organizationId?: string };
  headers?: Record<string, string | undefined>;
  readDb?: ConversationReadDb | null;
};

function denied(code: ConversationDenialCode) {
  return { items: [], code, count: 0 };
}

function sessionGate(req: ConversationHttpRequest | undefined) {
  const session = sessionFromAuthenticatedRequest({ authenticatedSession: req?.authenticatedSession });
  const organizationId = session?.organizationId?.trim() ?? '';
  if (!organizationId || !session) return { organizationId: null, code: 'AUTH_REQUIRED' as const };
  const allowed = session.grantedScopes.some((scope) => scope.trim() === CONVERSATION_READ_SCOPE);
  if (!allowed) return { organizationId: null, code: 'ROLE_FORBIDDEN' as const };
  return { organizationId, code: null };
}

@Controller('conversations')
export class ConversationsController {
  /**
   * HTTP stays AUTH_BLOCKED until Nest attaches authenticatedSession.
   * query organizationId is not an input.
   */
  @Get()
  async list(@Query('take') take?: string, @Req() req?: ConversationHttpRequest) {
    const gate = sessionGate(req);
    if (!gate.organizationId) return denied(gate.code ?? 'AUTH_REQUIRED');
    const organizationId = gate.organizationId;
    const prisma = req && 'readDb' in req ? req.readDb : (getPrisma() as ConversationReadDb | null);
    if (!prisma) return { items: [], code: null, count: 0 };

    const rows = await prisma.conversation.findMany({
      where: { organizationId },
      orderBy: { lastMessageAt: 'desc' },
      take: take ? Number(take) : 40,
      include: {
        account: true,
        channel: true,
        messages: { where: { organizationId }, orderBy: { sentAt: 'desc' }, take: 1 },
      },
    });
    const items = rows
      .filter((c) => c.organizationId === organizationId)
      .map((c) => {
        const account =
          c.account && c.account.organizationId === organizationId ? c.account : null;
        return {
          id: c.id,
          accountId: account ? c.accountId : null,
          accountName: account?.tradeName ?? account?.legalName ?? c.contactPhoneE164,
          channel: c.channel.displayName,
          purpose: c.channel.purpose,
          status: c.status,
          slaStatus: c.slaStatus,
          lastMessageAt: c.lastMessageAt,
          preview: c.messages[0]?.body ?? '',
          href: account && c.accountId ? `/personas/${c.accountId}` : `/senal?c=${c.id}`,
        };
      });
    return { items, code: null, count: items.length };
  }

  @Get(':id')
  async one(@Param('id') id: string, @Req() req?: ConversationHttpRequest) {
    const gate = sessionGate(req);
    if (!gate.organizationId) return { code: gate.code ?? 'AUTH_REQUIRED', count: 0 };
    const organizationId = gate.organizationId;
    const prisma = req && 'readDb' in req ? req.readDb : (getPrisma() as ConversationReadDb | null);
    if (!prisma) return { code: null, count: 0 };

    const c = await prisma.conversation.findFirst({
      where: { id, organizationId },
      include: {
        account: true,
        channel: true,
        messages: { where: { organizationId }, orderBy: { sentAt: 'asc' } },
      },
    });
    if (!c || c.organizationId !== organizationId) return { code: null, count: 0 };
    const account = c.account && c.account.organizationId === organizationId ? c.account : null;
    return {
      id: c.id,
      accountId: account ? c.accountId : null,
      accountName: account?.tradeName ?? account?.legalName ?? null,
      channel: c.channel.displayName,
      purpose: c.channel.purpose,
      slaStatus: c.slaStatus,
      messages: c.messages
        .filter((m) => !m.organizationId || m.organizationId === organizationId)
        .map((m) => ({
          id: m.id,
          direction: m.direction,
          body: m.body,
          sentAt: m.sentAt,
          senderType: m.senderType,
        })),
      code: null,
      count: 1,
    };
  }
}
