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
  const [mobilePane, setMobilePane] = useState<'list' | 'thread'>('list');
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

  useEffect(() => {
    if (selectedId) setMobilePane('thread');
  }, [selectedId]);

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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill tone="demo">Canal no conectado</StatusPill>
        <p className="text-sm text-[var(--isalwa-slate)]">{CONVERSATIONS_COPY.channelClosedBanner}</p>
        <div className="ml-auto">
          <Button type="button" onClick={() => openRegister(true)}>
            {CONVERSATIONS_COPY.register}
          </Button>
        </div>
      </div>

      <div className="hidden min-h-[32rem] gap-4 lg:grid lg:grid-cols-[minmax(0,28%)_minmax(0,44%)_minmax(0,28%)]">
        <Panel className="min-h-0 overflow-hidden p-3">
          <ConversationList
            conversations={visible}
            filter={filter}
            selectedId={selected?.id ?? null}
            onFilterChange={onFilterChange}
            onSelect={onSelect}
          />
        </Panel>
        <Panel className="min-h-0 overflow-hidden p-4">
          <ConversationThread conversation={selected} />
        </Panel>
        <Panel className="min-h-0 overflow-hidden p-4">
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

      <div className="space-y-3 lg:hidden">
        {mobilePane === 'list' ? (
          <Panel className="p-3">
            <ConversationList
              conversations={visible}
              filter={filter}
              selectedId={selected?.id ?? null}
              onFilterChange={onFilterChange}
              onSelect={onSelect}
            />
          </Panel>
        ) : (
          <Panel className="space-y-3 p-4">
            <div className="flex flex-wrap gap-2">
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
