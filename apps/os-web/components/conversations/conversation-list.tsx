'use client';

import { cx, EmptyState, StatusPill } from '@isalwa/ui';
import { ConversationDemoBadge } from '@/components/conversations/conversation-demo-badge';
import { CONVERSATIONS_COPY } from '@/lib/conversations/copy';
import {
  channelLabel,
  CONVERSATION_FILTER_LABELS,
  CONVERSATION_FILTERS,
  type Conversation,
  type ConversationFilter,
} from '@/lib/conversations/model';

type ConversationListProps = {
  conversations: readonly Conversation[];
  filter: ConversationFilter;
  selectedId: string | null;
  onFilterChange: (filter: ConversationFilter) => void;
  onSelect: (id: string) => void;
};

function formatWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

export function ConversationList({
  conversations,
  filter,
  selectedId,
  onFilterChange,
  onSelect,
}: ConversationListProps) {
  return (
    <div className="flex h-full min-h-0 flex-col" aria-label={CONVERSATIONS_COPY.listLabel}>
      <div className="flex flex-wrap gap-1.5 pb-3">
        {CONVERSATION_FILTERS.map((item) => {
          const active = item === filter;
          return (
            <button
              key={item}
              type="button"
              onClick={() => onFilterChange(item)}
              className={cx(
                'isalwa-t-fast inline-flex h-8 items-center rounded-[var(--isalwa-radius-control)] border px-2.5 text-xs font-medium outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]',
                active
                  ? 'border-[var(--isalwa-glaze)] bg-[color-mix(in_srgb,var(--isalwa-glaze)_10%,white)] text-[var(--isalwa-kiln)]'
                  : 'border-[var(--isalwa-mist)] bg-white text-[var(--isalwa-slate)] hover:text-[var(--isalwa-kiln)]',
              )}
              aria-pressed={active}
            >
              {CONVERSATION_FILTER_LABELS[item]}
            </button>
          );
        })}
      </div>
      {conversations.length === 0 ? (
        <EmptyState
          title={CONVERSATIONS_COPY.emptyList}
          description={CONVERSATIONS_COPY.emptyListHint}
        />
      ) : (
        <ul className="min-h-0 flex-1 divide-y divide-[var(--isalwa-mist)] overflow-y-auto">
          {conversations.map((item) => {
            const selected = item.id === selectedId;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className={cx(
                    'isalwa-t-fast flex w-full flex-col gap-1 px-2 py-3 text-left outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]',
                    selected
                      ? 'bg-[color-mix(in_srgb,var(--isalwa-glaze)_8%,white)]'
                      : 'hover:bg-[color-mix(in_srgb,var(--isalwa-porcelain)_55%,white)]',
                  )}
                  aria-current={selected ? 'true' : undefined}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-[var(--isalwa-kiln)]">
                      {item.partyLabel}
                    </span>
                    <ConversationDemoBadge conversation={item} />
                    {item.attention.needsResponse ? (
                      <StatusPill tone="warning">Respuesta</StatusPill>
                    ) : null}
                  </div>
                  <p className="line-clamp-2 text-sm text-[var(--isalwa-slate)]">{item.preview}</p>
                  <p className="text-[var(--isalwa-text-2xs)] text-[var(--isalwa-slate)]">
                    {channelLabel(item.channel)} · {formatWhen(item.lastOccurredAt)}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
