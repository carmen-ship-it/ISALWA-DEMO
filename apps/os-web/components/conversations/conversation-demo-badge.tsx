'use client';

import { StatusPill } from '@isalwa/ui';
import {
  DEMO_WHATSAPP_BADGE,
  DEMO_WHATSAPP_BANNER,
  type Conversation,
} from '@/lib/conversations/model';

export function ConversationDemoBadge({ conversation }: { conversation: Conversation }) {
  if (!conversation.isDemo) return null;
  return (
    <StatusPill tone="demo" aria-label={DEMO_WHATSAPP_BANNER}>
      {DEMO_WHATSAPP_BADGE}
    </StatusPill>
  );
}

export function ConversationDemoBanner({ conversation }: { conversation: Conversation }) {
  if (!conversation.isDemo) return null;
  return (
    <p
      role="status"
      className="rounded-[var(--isalwa-radius-control)] border border-dashed border-[var(--isalwa-slate)] bg-[color-mix(in_srgb,var(--isalwa-porcelain)_40%,white)] px-3 py-2 text-sm text-[var(--isalwa-slate)]"
    >
      {DEMO_WHATSAPP_BANNER}
    </p>
  );
}
