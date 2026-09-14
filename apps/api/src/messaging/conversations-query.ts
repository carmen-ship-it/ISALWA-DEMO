/**
 * Conversation reads. The tenant predicate is the session organization already
 * bound by authentication. A caller-supplied organizationId is not an input.
 *
 * Capability matches TENANT_SURFACE_REQUIRED_SCOPE.customer_communication.
 * This is not a new conversation scope, and people.admin does not authorize it.
 *
 * There is no contact search on this read. An exact email, phone, or name that
 * exists only in another tenant is not a candidate, a mask, a score, or proof
 * that a conversation exists.
 */

import {
  holdsExactScope,
  sessionFromAuthenticatedRequest,
  trustedOrganizationId,
  type TrustedTenantSession,
} from '../auth/trusted-session';

export {
  holdsExactScope,
  sessionFromAuthenticatedRequest,
  trustedOrganizationId,
};
export type { TrustedTenantSession };

/** Matches TENANT_SURFACE_REQUIRED_SCOPE.customer_communication. */
export const CONVERSATION_READ_CAPABILITY = 'commercial.team.read';

export type ConversationDenialCode = 'AUTH_REQUIRED' | 'ROLE_FORBIDDEN';

type TenantAccount = {
  organizationId?: string;
  tradeName: string | null;
  legalName: string;
  email?: string | null;
};

type TenantChannel = {
  organizationId?: string;
  displayName: string;
  purpose: string;
  phoneE164?: string;
};

type TenantMessage = {
  id: string;
  organizationId?: string;
  direction: string;
  body: string;
  sentAt: Date;
  senderType: string;
};

export type ConversationListRow = {
  id: string;
  organizationId: string;
  accountId: string | null;
  contactPhoneE164: string;
  status: string;
  slaStatus: string | null;
  lastMessageAt: Date;
  account: TenantAccount | null;
  channel: TenantChannel;
  messages: TenantMessage[];
};

export type ConversationOneRow = {
  id: string;
  organizationId: string;
  accountId: string | null;
  contactPhoneE164: string;
  slaStatus: string | null;
  account: TenantAccount | null;
  channel: TenantChannel;
  messages: TenantMessage[];
};

export type ConversationListArgs = {
  where: { organizationId: string };
  orderBy: { lastMessageAt: 'desc' };
  take: number;
  include: {
    account: true;
    channel: true;
    messages: {
      where: { organizationId: string };
      orderBy: { sentAt: 'desc' };
      take: 1;
    };
  };
};

export type ConversationOneArgs = {
  where: { id: string; organizationId: string };
  include: {
    account: true;
    channel: true;
    messages: {
      where: { organizationId: string };
      orderBy: { sentAt: 'asc' };
    };
  };
};

export type ConversationReadDb = {
  conversation: {
    findMany: (args: ConversationListArgs) => Promise<ConversationListRow[]>;
    findFirst: (args: ConversationOneArgs) => Promise<ConversationOneRow | null>;
  };
};

export type ConversationListItem = {
  id: string;
  accountId: string | null;
  accountName: string;
  channel: string;
  purpose: string;
  status: string;
  slaStatus: string | null;
  lastMessageAt: Date;
  preview: string;
  href: string;
};

export type ConversationDetail = {
  id: string;
  accountId: string | null;
  accountName: string | null;
  channel: string;
  purpose: string;
  slaStatus: string | null;
  messages: Array<{
    id: string;
    direction: string;
    body: string;
    sentAt: Date;
    senderType: string;
  }>;
  code: null;
  count: 1;
};

export type ConversationListResult = {
  items: ConversationListItem[];
  code: ConversationDenialCode | null;
  count: number;
};

export type ConversationOneResult =
  | ConversationDetail
  | null
  | { item: null; code: ConversationDenialCode; count: 0 };

const EMPTY_LIST: ConversationListResult = { items: [], code: null, count: 0 };

function deniedList(code: ConversationDenialCode): ConversationListResult {
  return { items: [], code, count: 0 };
}

function deniedOne(code: ConversationDenialCode): ConversationOneResult {
  return { item: null, code, count: 0 };
}

function pageSize(take: string | undefined): number {
  if (!take) return 40;
  const parsed = Number(take);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 40;
}

function sameTenantAccount(
  account: TenantAccount | null | undefined,
  organizationId: string,
): TenantAccount | null {
  if (!account || account.organizationId !== organizationId) return null;
  return account;
}

function sameTenantChannel(
  channel: TenantChannel | null | undefined,
  organizationId: string,
): TenantChannel | null {
  if (!channel || channel.organizationId !== organizationId) return null;
  return channel;
}

function sameTenantMessages(messages: readonly TenantMessage[], organizationId: string): TenantMessage[] {
  return messages.filter((message) => message.organizationId === organizationId);
}

function authorize(session: TrustedTenantSession | null | undefined): {
  organizationId: string;
} | { code: ConversationDenialCode } {
  const organizationId = trustedOrganizationId(session);
  if (!organizationId || !session) return { code: 'AUTH_REQUIRED' };
  if (!holdsExactScope(session.grantedScopes, CONVERSATION_READ_CAPABILITY)) {
    return { code: 'ROLE_FORBIDDEN' };
  }
  return { organizationId };
}

function openDb(db: ConversationReadDb | null | (() => ConversationReadDb | null)): ConversationReadDb | null {
  return typeof db === 'function' ? db() : db;
}

export async function listConversations(input: {
  take?: string;
  session: TrustedTenantSession | null | undefined;
  db: ConversationReadDb | null | (() => ConversationReadDb | null);
}): Promise<ConversationListResult> {
  const gate = authorize(input.session);
  if ('code' in gate) return deniedList(gate.code);

  const organizationId = gate.organizationId;
  const db = openDb(input.db);
  if (!db) return { ...EMPTY_LIST };

  const rows = await db.conversation.findMany({
    where: { organizationId },
    orderBy: { lastMessageAt: 'desc' },
    take: pageSize(input.take),
    include: {
      account: true,
      channel: true,
      messages: { where: { organizationId }, orderBy: { sentAt: 'desc' }, take: 1 },
    },
  });

  const items = rows
    .filter((row) => row.organizationId === organizationId)
    .map((row) => projectListItem(row, organizationId));

  return { items, code: null, count: items.length };
}

function projectListItem(row: ConversationListRow, organizationId: string): ConversationListItem {
  const account = sameTenantAccount(row.account, organizationId);
  const channel = sameTenantChannel(row.channel, organizationId);
  const preview = sameTenantMessages(row.messages, organizationId)[0]?.body ?? '';
  const accountId = account ? row.accountId : null;
  return {
    id: row.id,
    accountId,
    accountName: account?.tradeName ?? account?.legalName ?? row.contactPhoneE164,
    channel: channel?.displayName ?? '',
    purpose: channel?.purpose ?? '',
    status: row.status,
    slaStatus: row.slaStatus,
    lastMessageAt: row.lastMessageAt,
    preview,
    href: accountId ? `/personas/${accountId}` : `/senal?c=${row.id}`,
  };
}

export async function readConversation(input: {
  id: string;
  session: TrustedTenantSession | null | undefined;
  db: ConversationReadDb | null | (() => ConversationReadDb | null);
}): Promise<ConversationOneResult> {
  const gate = authorize(input.session);
  if ('code' in gate) return deniedOne(gate.code);

  const organizationId = gate.organizationId;
  const db = openDb(input.db);
  if (!db) return null;

  const row = await db.conversation.findFirst({
    where: { id: input.id, organizationId },
    include: {
      account: true,
      channel: true,
      messages: { where: { organizationId }, orderBy: { sentAt: 'asc' } },
    },
  });

  if (!row || row.organizationId !== organizationId) return null;
  return projectDetail(row, organizationId);
}

function projectDetail(row: ConversationOneRow, organizationId: string): ConversationDetail {
  const account = sameTenantAccount(row.account, organizationId);
  const channel = sameTenantChannel(row.channel, organizationId);
  return {
    id: row.id,
    accountId: account ? row.accountId : null,
    accountName: account?.tradeName ?? account?.legalName ?? null,
    channel: channel?.displayName ?? '',
    purpose: channel?.purpose ?? '',
    slaStatus: row.slaStatus,
    messages: sameTenantMessages(row.messages, organizationId).map((message) => ({
      id: message.id,
      direction: message.direction,
      body: message.body,
      sentAt: message.sentAt,
      senderType: message.senderType,
    })),
    code: null,
    count: 1,
  };
}
