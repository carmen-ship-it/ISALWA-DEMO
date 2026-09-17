import type { PaletteItem } from '@/lib/shell/command-palette';
import { conversationHref, searchConversations, type Conversation } from './model';

/** Search registry hook: company-entered / demo conversations only. Never live WhatsApp. */
export function conversationPaletteItems(
  conversations: readonly Conversation[],
  query: string,
): PaletteItem[] {
  return searchConversations(conversations, query).slice(0, 6).map((item) => ({
    key: `conversation:${item.id}`,
    kind: 'follow-up' as const,
    label: item.partyLabel,
    detail: item.isDemo
      ? `Conversación demo · ${item.preview}`
      : `Conversación · ${item.preview}`,
    href: conversationHref(item.id),
    partyId: item.partyId,
  }));
}

export function registerConversationActionItem(): PaletteItem {
  return {
    key: 'action:register-conversation',
    kind: 'action',
    label: 'Registrar conversación',
    detail: 'Registro de la empresa. Canal no conectado.',
    href: '/conversaciones?registrar=1',
  };
}
