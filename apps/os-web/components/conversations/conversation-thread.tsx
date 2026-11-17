'use client';

import { Button, EmptyState, StatusPill } from '@isalwa/ui';
import type { AttentionState } from '@isalwa/os-contracts';
import {
  ConversationAttentionState,
} from '@/components/conversations/conversation-attention-state';
import {
  ConversationComposer,
  type ConversationComposerProps,
} from '@/components/conversations/conversation-composer';
import {
  ConversationNotes,
  type ConversationNotesState,
} from '@/components/conversations/conversation-notes';
import { CONVERSATIONS_COPY } from '@/lib/conversations/copy';
import { channelLabel, type Conversation } from '@/lib/conversations/model';

type ConversationThreadProps = {
  conversation: Conversation | null;
  /** Present when the signed-in member may take conversations. */
  canTake?: boolean;
  taking?: boolean;
  takeError?: string | null;
  onTake?: () => void;
  /** Opens "Registrar atención". The only way to add to a thread while WhatsApp is not connected. */
  onRegister?: () => void;
  /** Attention state controls. Absent for owner-demo fixtures, which are not stored rows. */
  attention?: {
    canChange: boolean;
    pendingTo: AttentionState | null;
    error: string | null;
    onChange: (to: AttentionState) => void;
  };
  /** Team-only notes of a stored conversation (separate from the messages). */
  notes?: { state: ConversationNotesState; onRetry: () => void } | null;
  composer: ConversationComposerProps;
};

function formatWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function ConversationThread({
  conversation,
  canTake = false,
  taking = false,
  takeError = null,
  onTake,
  onRegister,
  attention,
  notes = null,
  composer,
}: ConversationThreadProps) {
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
        </div>
        <p className="text-sm text-[var(--isalwa-slate)]">
          {channelLabel(conversation.channel)}
          {conversation.contactLabel ? ` · ${conversation.contactLabel}` : ''}
        </p>
        {conversation.reason ? (
          <p className="text-sm text-[var(--isalwa-slate)]">
            {CONVERSATIONS_COPY.reasonLabel}: {conversation.reason}
          </p>
        ) : null}
        {conversation.nextAction ? (
          <p className="text-sm text-[var(--isalwa-slate)]">
            {CONVERSATIONS_COPY.nextStepLabel}: {conversation.nextAction}
            {conversation.nextStepCommitmentId ? '' : ` · ${CONVERSATIONS_COPY.nextStepWithoutCommitment}`}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          {conversation.assignedMemberId ? (
            <StatusPill tone="soft-teal">
              {CONVERSATIONS_COPY.assignedTo} {conversation.assignedLabel ?? '—'}
            </StatusPill>
          ) : (
            <>
              <StatusPill tone="amber">{CONVERSATIONS_COPY.unassigned}</StatusPill>
              {canTake && onTake ? (
                <Button type="button" variant="secondary" size="sm" onClick={onTake} disabled={taking}>
                  {taking ? CONVERSATIONS_COPY.taking : CONVERSATIONS_COPY.take}
                </Button>
              ) : null}
            </>
          )}
        </div>
        {takeError ? (
          <p role="alert" className="text-sm text-[var(--isalwa-kiln)]">
            {takeError}
          </p>
        ) : null}
        {attention && !conversation.isDemo ? (
          <ConversationAttentionState
            conversation={conversation}
            canChange={attention.canChange}
            pendingTo={attention.pendingTo}
            error={attention.error}
            onChange={attention.onChange}
          />
        ) : null}
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
      {notes ? <ConversationNotes notes={notes.state} onRetry={notes.onRetry} /> : null}
      {/*
        Composer: "Mensaje" is blocked while WhatsApp is not connected (no handler, no success
        path); "Nota interna" saves a team-only note through its own action. They never share a
        path. Manual attention stays available through "Registrar atención".
      */}
      <footer className="mt-3 shrink-0 border-t border-[var(--isalwa-mist)] pt-3">
        <ConversationComposer {...composer} onRegister={onRegister} />
      </footer>
    </div>
  );
}
