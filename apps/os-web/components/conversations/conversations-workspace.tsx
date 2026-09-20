'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button, ContextDrawer, Panel, StatusPill } from '@isalwa/ui';
import {
  ManualConversationPanel,
  type ManualConversationActor,
} from '@/components/conversations/manual-conversation-panel';
import { ConversationContextPanel } from '@/components/conversations/conversation-context-panel';
import { ConversationList } from '@/components/conversations/conversation-list';
import { ConversationThread } from '@/components/conversations/conversation-thread';
import { mergeConversationSources } from '@/lib/conversations/adapters';
import { CONVERSATIONS_COPY } from '@/lib/conversations/copy';
import {
  filterConversations,
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
  if (
    raw === 'needs_response' ||
    raw === 'follow_up' ||
    raw === 'possible_opportunity' ||
    raw === 'possible_issue'
  ) {
    return raw;
  }
  return 'all';
}

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

  const [recorded, setRecorded] = useState<Conversation[]>([]);
  const [mobilePane, setMobilePane] = useState<'list' | 'thread'>(() =>
    searchParams.get('c') ? 'thread' : 'list',
  );
  const [contextOpen, setContextOpen] = useState(false);

  const organizationId = actor?.organizationId ?? '';

  const conversations = useMemo(
    () =>
      mergeConversationSources({
        organizationId,
        recorded,
        fixtures: initialConversations,
      }),
    [organizationId, recorded, initialConversations],
  );

  const visible = useMemo(
    () => filterConversations(conversations, filter),
    [conversations, filter],
  );

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

  function onRecorded(record: ManualCustomerConversation) {
    if (isSuggestionDecisionRecord(record)) {
      router.refresh();
      return;
    }
    const projected = projectManualConversation(record);
    setRecorded((current) => [projected, ...current.filter((item) => item.id !== projected.id)]);
    replaceParams((params) => {
      params.set('c', projected.id);
      params.delete('registrar');
    });
    setMobilePane('thread');
    router.refresh();
  }

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
            onFilterChange={onFilterChange}
            onSelect={onSelect}
          />
        </Panel>
        <Panel className="min-h-0 min-w-0 overflow-hidden p-4">
          <ConversationThread conversation={selected} />
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
              onFilterChange={onFilterChange}
              onSelect={onSelect}
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
            <ConversationThread conversation={selected} />
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
