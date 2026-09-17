'use client';

import { EmptyState } from '@isalwa/ui';
import { ConversationDemoBanner, ConversationDemoBadge } from '@/components/conversations/conversation-demo-badge';
import { CONVERSATIONS_COPY } from '@/lib/conversations/copy';
import { channelLabel, type Conversation } from '@/lib/conversations/model';

type ConversationThreadProps = {
  conversation: Conversation | null;
};

function formatWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function ConversationThread({ conversation }: ConversationThreadProps) {
  if (!conversation) {
    return (
      <EmptyState
        title={CONVERSATIONS_COPY.emptyThread}
        description={CONVERSATIONS_COPY.emptyThreadHint}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col" aria-label={CONVERSATIONS_COPY.threadLabel}>
      <header className="shrink-0 space-y-2 border-b border-[var(--isalwa-mist)] pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-medium text-[var(--isalwa-kiln)]">{conversation.partyLabel}</h2>
          <ConversationDemoBadge conversation={conversation} />
        </div>
        <p className="text-sm text-[var(--isalwa-slate)]">
          {channelLabel(conversation.channel)}
          {conversation.contactLabel ? ` · ${conversation.contactLabel}` : ''}
        </p>
        <ConversationDemoBanner conversation={conversation} />
        <p className="text-xs text-[var(--isalwa-slate)]">{CONVERSATIONS_COPY.noReadTicks}</p>
      </header>
      <ul className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {conversation.messages.map((message) => {
          const inbound = message.direction === 'inbound';
          return (
            <li
              key={message.id}
              className={`flex ${inbound ? 'justify-start' : 'justify-end'}`}
            >
              <article
                className={`max-w-[85%] rounded-[var(--isalwa-radius-control)] px-3 py-2 text-sm leading-relaxed shadow-[var(--isalwa-shadow-resting)] ${
                  inbound
                    ? 'bg-white text-[var(--isalwa-kiln)]'
                    : 'bg-[color-mix(in_srgb,var(--isalwa-glaze)_12%,white)] text-[var(--isalwa-kiln)]'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.body}</p>
                <p className="mt-1.5 text-[var(--isalwa-text-2xs)] text-[var(--isalwa-slate)]">
                  {formatWhen(message.occurredAt)} · {channelLabel(message.channel)}
                  {message.actorLabel ? ` · ${message.actorLabel}` : ''}
                </p>
              </article>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
