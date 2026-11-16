'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button, ContextDrawer, Panel, StatusPill } from '@isalwa/ui';
import {
  ManualConversationPanel,
  type ManualConversationActor,
  type ManualConversationSaveOutcome,
} from '@/components/conversations/manual-conversation-panel';
import { ConversationContextPanel } from '@/components/conversations/conversation-context-panel';
import { ConversationList } from '@/components/conversations/conversation-list';
import { ConversationThread } from '@/components/conversations/conversation-thread';
import { mergeConversationSources } from '@/lib/conversations/adapters';
import {
  searchConversationCustomerIdsAction,
  takeConversationAction,
} from '@/lib/conversations/actions';
import { CONVERSATIONS_COPY } from '@/lib/conversations/copy';
import {
  CONVERSATION_FILTERS,
  filterConversations,
  searchInbox,
  type Conversation,
  type ConversationFilter,
} from '@/lib/conversations/model';
import { projectManualConversation } from '@/lib/conversations/project-manual';
import type { ManualCustomerConversation } from '@isalwa/os-contracts';
import { isSuggestionDecisionRecord } from '@/lib/conversations/suggestion-decision';

type ConversationsWorkspaceProps = {
  actor: ManualConversationActor | null;
  initialConversations?: readonly Conversation[];
  /** Durable company-entered Ignore decisions keyed by source conversation id. */
  ignoredSuggestionIdsByConversation?: Record<string, string[]>;
};

function parseFilter(raw: string | null): ConversationFilter {
  // An old bookmarked value (e.g. possible_issue) falls back to Todos.
  return (CONVERSATION_FILTERS as readonly string[]).includes(raw ?? '')
    ? (raw as ConversationFilter)
    : 'all';
}

const SEARCH_DEBOUNCE_MS = 250;

export function ConversationsWorkspace({
  actor,
  initialConversations = [],
  ignoredSuggestionIdsByConversation = {},
}: ConversationsWorkspaceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filter = parseFilter(searchParams.get('filtro'));
  const selectedId = searchParams.get('c');
  const registrarOpen = searchParams.get('registrar') === '1';
  const query = searchParams.get('q') ?? '';

  const [recorded, setRecorded] = useState<Conversation[]>([]);
  const [mobilePane, setMobilePane] = useState<'list' | 'thread'>(() =>
    searchParams.get('c') ? 'thread' : 'list',
  );
  const [contextOpen, setContextOpen] = useState(false);
  // Assignment taken in this session, applied over the server rows until the refresh lands.
  const [taken, setTaken] = useState<
    Record<string, { assignedMemberId: string; assignedLabel: string }>
  >({});
  const [takingId, setTakingId] = useState<string | null>(null);
  const [takeError, setTakeError] = useState<{ id: string; message: string } | null>(null);
  const [queryDraft, setQueryDraft] = useState(query);
  const [phoneCustomerIds, setPhoneCustomerIds] = useState<ReadonlySet<string>>(new Set());
  const scrollMemory = useRef<Record<string, number>>({});

  const organizationId = actor?.organizationId ?? '';

  const conversations = useMemo(
    () =>
      mergeConversationSources({
        organizationId,
        recorded,
        initial: initialConversations,
      }).map((item) =>
        taken[item.id] && !item.assignedMemberId ? { ...item, ...taken[item.id] } : item,
      ),
    [organizationId, recorded, initialConversations, taken],
  );

  // The search box is typed locally and written to the URL after a pause, so reload and
  // back/forward keep it. A phone is resolved by the authorized customer search.
  useEffect(() => {
    if (queryDraft === query) return;
    const timer = setTimeout(() => {
      replaceParams((params) => {
        if (queryDraft.trim()) params.set('q', queryDraft);
        else params.delete('q');
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- URL write is the effect
  }, [queryDraft]);

  useEffect(() => {
    let cancelled = false;
    if (query.trim().length < 3) {
      setPhoneCustomerIds(new Set());
      return;
    }
    void searchConversationCustomerIdsAction(query).then((ids) => {
      if (!cancelled) setPhoneCustomerIds(new Set(ids));
    });
    return () => {
      cancelled = true;
    };
  }, [query]);

  const searched = useMemo(
    () => searchInbox(conversations, query, phoneCustomerIds),
    [conversations, query, phoneCustomerIds],
  );
  const visible = useMemo(
    () => filterConversations(searched, filter, actor?.memberId ?? null),
    [searched, filter, actor?.memberId],
  );
  const narrowed = (filter !== 'all' || query.trim().length > 0) && conversations.length > 0;

  const selected =
    visible.find((item) => item.id === selectedId) ??
    conversations.find((item) => item.id === selectedId) ??
    null;

  // Auto-select first thread likely to surface suggestions when none selected.
  // Do not switch the mobile pane here: that unmounts the only tappable list
  // and leaves the desktop `hidden lg:grid` copy (0×0 below lg) as the rows.
  useEffect(() => {
    if (selectedId || visible.length === 0) return;
    const withSignal =
      visible.find(
        (row) =>
          row.attention.possibleOpportunity ||
          row.attention.possibleIssue ||
          row.attention.needsResponse ||
          row.attention.followUp,
      ) ?? visible[0];
    if (!withSignal) return;
    replaceParams((params) => {
      params.set('c', withSignal.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- first-select only
  }, [selectedId, visible.length]);

  function replaceParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function onFilterChange(next: ConversationFilter) {
    replaceParams((params) => {
      if (next === 'all') params.delete('filtro');
      else params.set('filtro', next);
    });
  }

  function onSelect(id: string) {
    replaceParams((params) => {
      params.set('c', id);
      params.delete('registrar');
    });
    setMobilePane('thread');
  }

  function openRegister(open: boolean) {
    replaceParams((params) => {
      if (open) params.set('registrar', '1');
      else params.delete('registrar');
    });
  }

  function onRecorded(record: ManualCustomerConversation, outcome?: ManualConversationSaveOutcome) {
    if (isSuggestionDecisionRecord(record)) {
      router.refresh();
      return;
    }
    const projected = projectManualConversation(record);
    setRecorded((current) => [projected, ...current.filter((item) => item.id !== projected.id)]);
    replaceParams((params) => {
      params.set('c', projected.id);
      // A saved attention whose next step failed keeps the panel open so the retry stays in view.
      if (!outcome?.partial) params.delete('registrar');
    });
    setMobilePane('thread');
    router.refresh();
  }

  async function onTake(conversation: Conversation) {
    setTakingId(conversation.id);
    setTakeError(null);
    const result = await takeConversationAction({
      conversationId: conversation.id,
      customerId: conversation.partyId,
    });
    setTakingId(null);
    if (result.ok) {
      setTaken((current) => ({
        ...current,
        [conversation.id]: {
          assignedMemberId: result.assignedMemberId,
          assignedLabel: result.assignedLabel,
        },
      }));
      router.refresh();
      return;
    }
    setTakeError({ id: conversation.id, message: result.error });
    // Someone else won: refresh so the thread shows who holds it.
    if (result.alreadyAssigned) router.refresh();
  }

  // Take is offered only to a signed-in company member, never in a view-as preview, and
  // never for the owner-demo fixtures that are not stored rows.
  const canTake = Boolean(actor) && Boolean(selected) && !selected?.isDemo;
  const threadProps = {
    conversation: selected,
    canTake,
    taking: takingId === selected?.id,
    takeError: takeError && takeError.id === selected?.id ? takeError.message : null,
    onTake: selected ? () => void onTake(selected) : undefined,
    onRegister: () => openRegister(true),
  };

  return (
    <div className="isalwa-conversations-desk min-w-0 max-w-full space-y-4">
      <div className="flex min-w-0 max-w-full flex-col gap-3 rounded-[var(--isalwa-radius-panel)] border border-dashed border-[var(--isalwa-slate)] bg-[color-mix(in_srgb,var(--isalwa-porcelain)_50%,white)] px-3 py-2.5 sm:flex-row sm:items-center sm:gap-3">
        <StatusPill tone="demo" className="shrink-0">
          Canal no conectado
        </StatusPill>
        <p className="min-w-0 flex-1 text-sm leading-snug text-[var(--isalwa-slate)]">
          {CONVERSATIONS_COPY.channelClosedBanner}
        </p>
        <Button type="button" className="w-full shrink-0 sm:w-auto" onClick={() => openRegister(true)}>
          {CONVERSATIONS_COPY.register}
        </Button>
      </div>

      <div className="isalwa-conversations-desktop hidden min-h-[32rem] min-w-0 gap-4 lg:grid lg:grid-cols-[minmax(0,28%)_minmax(0,44%)_minmax(0,28%)]">
        <Panel className="min-h-0 min-w-0 overflow-hidden p-3">
          <ConversationList
            conversations={visible}
            filter={filter}
            selectedId={selected?.id ?? null}
            query={queryDraft}
            narrowed={narrowed}
            onFilterChange={onFilterChange}
            onQueryChange={setQueryDraft}
            onSelect={onSelect}
            scrollMemory={scrollMemory}
          />
        </Panel>
        <Panel className="min-h-0 min-w-0 overflow-hidden p-4">
          <ConversationThread {...threadProps} />
        </Panel>
        <Panel className="min-h-0 min-w-0 overflow-hidden p-4">
          <ConversationContextPanel
            conversation={selected}
            responsible={selected?.responsible ?? null}
            recordSentActor={actor}
            durableIgnoredSuggestionIds={
              selected?.id ? ignoredSuggestionIdsByConversation[selected.id] ?? [] : []
            }
            onConversationRecorded={() => router.refresh()}
          />
        </Panel>
      </div>

      <div className="isalwa-conversations-mobile min-w-0 max-w-full space-y-3 lg:hidden">
        {mobilePane === 'list' ? (
          <Panel className="min-w-0 max-w-full p-3">
            <ConversationList
              conversations={visible}
              filter={filter}
              selectedId={selected?.id ?? null}
              query={queryDraft}
              narrowed={narrowed}
              onFilterChange={onFilterChange}
              onQueryChange={setQueryDraft}
              onSelect={onSelect}
              scrollMemory={scrollMemory}
            />
          </Panel>
        ) : (
          <Panel className="min-w-0 max-w-full space-y-3 p-4">
            <div className="sticky top-[var(--isalwa-shell-header-offset,4rem)] z-10 -mx-4 flex flex-wrap gap-2 bg-[var(--isalwa-surface-ops,var(--isalwa-white))] px-4 py-2">
              <Button type="button" variant="secondary" onClick={() => setMobilePane('list')}>
                ← {CONVERSATIONS_COPY.backToList}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setContextOpen(true)}
                disabled={!selected}
              >
                {CONVERSATIONS_COPY.openContext}
              </Button>
            </div>
            <ConversationThread {...threadProps} />
          </Panel>
        )}
      </div>

      <ContextDrawer
        open={contextOpen && Boolean(selected)}
        title={CONVERSATIONS_COPY.contextLabel}
        onClose={() => setContextOpen(false)}
      >
        <ConversationContextPanel
          conversation={selected}
          responsible={selected?.responsible ?? null}
          recordSentActor={actor}
          durableIgnoredSuggestionIds={
            selected?.id ? ignoredSuggestionIdsByConversation[selected.id] ?? [] : []
          }
          onConversationRecorded={() => router.refresh()}
        />
      </ContextDrawer>

      <ContextDrawer
        open={registrarOpen}
        title={CONVERSATIONS_COPY.register}
        onClose={() => openRegister(false)}
      >
        <ManualConversationPanel actor={actor} onRecorded={onRecorded} />
      </ContextDrawer>
    </div>
  );
}
