'use client';

import { useLayoutEffect, useRef, type MutableRefObject } from 'react';
import { cx, EmptyState, SearchField, StatusPill } from '@isalwa/ui';
import { ATTENTION_STATE_TONE, attentionStateLabel } from '@/lib/conversations/composer';
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
  query: string;
  /** True when a filter or a search is narrowing a list that has rows. */
  narrowed: boolean;
  onFilterChange: (filter: ConversationFilter) => void;
  onQueryChange: (query: string) => void;
  onSelect: (id: string) => void;
  /** Scroll position per filter, kept by the host so it survives filter and pane changes. */
  scrollMemory: MutableRefObject<Record<string, number>>;
};

function attentionBadges(conversation: Conversation) {
  const badges: Array<{
    key: string;
    label: string;
    tone: 'amber' | 'sky' | 'soft-teal' | 'overdue' | 'neutral';
  }> = [];
  // Owner-demo fixtures are not stored rows and carry no real state.
  if (!conversation.isDemo) {
    badges.push({
      key: 'attention_state',
      label: attentionStateLabel(conversation.attentionState),
      tone: ATTENTION_STATE_TONE[conversation.attentionState],
    });
  }
  if (conversation.attention.needsResponse) {
    badges.push({ key: 'needs_response', label: 'Necesita respuesta', tone: 'amber' });
  }
  if (conversation.attention.followUp) {
    badges.push({ key: 'follow_up', label: 'Seguimiento', tone: 'sky' });
  }
  if (!conversation.assignedMemberId) {
    badges.push({ key: 'unassigned', label: CONVERSATIONS_COPY.unassigned, tone: 'soft-teal' });
  }
  if (conversation.attention.possibleOpportunity) {
    badges.push({ key: 'possible_opportunity', label: 'Oportunidad posible', tone: 'soft-teal' });
  }
  if (conversation.attention.possibleIssue) {
    badges.push({ key: 'possible_issue', label: 'Incidencia posible', tone: 'overdue' });
  }
  return badges;
}

function formatWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-BO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'America/La_Paz',
  }).format(date);
}

export function ConversationList({
  conversations,
  filter,
  selectedId,
  query,
  narrowed,
  onFilterChange,
  onQueryChange,
  onSelect,
  scrollMemory,
}: ConversationListProps) {
  const listRef = useRef<HTMLUListElement>(null);

  // Best-effort: return to where the person was in this filter (onScroll keeps it current).
  useLayoutEffect(() => {
    const node = listRef.current;
    if (node) node.scrollTop = scrollMemory.current[filter] ?? 0;
  }, [filter, scrollMemory]);

  return (
    <div className="isalwa-conversation-list flex min-h-0 w-full min-w-0 max-w-full flex-col lg:h-full" aria-label={CONVERSATIONS_COPY.listLabel}>
      <div className="pb-3">
        <SearchField
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={CONVERSATIONS_COPY.searchPlaceholder}
          aria-label={CONVERSATIONS_COPY.searchLabel}
          autoComplete="off"
          className="w-full"
        />
      </div>
      <div className="isalwa-conversation-filters flex max-w-full flex-wrap gap-1.5 pb-3">
        {CONVERSATION_FILTERS.map((item) => {
          const active = item === filter;
          return (
            <button
              key={item}
              type="button"
              onClick={() => onFilterChange(item)}
              className={cx(
                'isalwa-t-fast inline-flex h-8 max-w-full items-center rounded-[var(--isalwa-radius-control)] border px-2.5 text-xs font-medium outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]',
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
        narrowed ? (
          <EmptyState title={CONVERSATIONS_COPY.searchEmpty} />
        ) : (
          <EmptyState
            title={CONVERSATIONS_COPY.emptyList}
            description={CONVERSATIONS_COPY.emptyListHint}
          />
        )
      ) : (
        <ul
          ref={listRef}
          onScroll={(event) => {
            scrollMemory.current[filter] = event.currentTarget.scrollTop;
          }}
          className="min-h-0 w-full min-w-0 divide-y divide-[var(--isalwa-mist)] lg:flex-1 lg:overflow-y-auto"
        >
          {conversations.map((item) => {
            const selected = item.id === selectedId;
            return (
              <li key={item.id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className={cx(
                    'isalwa-conversation-row isalwa-t-fast flex min-h-11 w-full min-w-0 flex-col gap-1 px-2 py-3 text-left outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]',
                    selected
                      ? 'bg-[color-mix(in_srgb,var(--isalwa-glaze)_8%,white)]'
                      : 'hover:bg-[color-mix(in_srgb,var(--isalwa-porcelain)_55%,white)]',
                  )}
                  aria-current={selected ? 'true' : undefined}
                >
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="min-w-0 break-words text-sm font-medium text-[var(--isalwa-kiln)]">
                      {item.partyLabel}
                    </span>
                    {attentionBadges(item).map((badge) => (
                      <StatusPill key={badge.key} tone={badge.tone} className="max-w-full truncate">
                        {badge.label}
                      </StatusPill>
                    ))}
                  </div>
                  <p className="line-clamp-2 break-words text-sm text-[var(--isalwa-slate)]">{item.preview}</p>
                  <p className="break-words text-[var(--isalwa-text-2xs)] text-[var(--isalwa-slate)]">
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
