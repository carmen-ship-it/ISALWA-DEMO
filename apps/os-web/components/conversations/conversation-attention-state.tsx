'use client';

import { Button, StatusPill } from '@isalwa/ui';
import { allowedAttentionTargets, type AttentionState } from '@isalwa/os-contracts';
import {
  ATTENTION_STATE_COPY,
  ATTENTION_STATE_TONE,
  attentionStateLabel,
} from '@/lib/conversations/composer';
import type { Conversation } from '@/lib/conversations/model';

type ConversationAttentionStateProps = {
  conversation: Conversation;
  /** A signed-in company member on a stored conversation. The server decides the rest. */
  canChange: boolean;
  pendingTo: AttentionState | null;
  error: string | null;
  onChange: (to: AttentionState) => void;
};

/**
 * Attention state (Nueva · En atención · Esperando al cliente · Esperando al equipo · Resuelta),
 * kept apart from the AI line. The buttons are the transitions the command accepts for this
 * state and holder; the server still has the last word.
 */
export function ConversationAttentionState({
  conversation,
  canChange,
  pendingTo,
  error,
  onChange,
}: ConversationAttentionStateProps) {
  const held = Boolean(conversation.assignedMemberId);
  const targets = canChange
    ? allowedAttentionTargets({ from: conversation.attentionState, held })
    : [];
  const needsHolderHint =
    canChange && !held && conversation.attentionState !== 'in_attention';

  return (
    <section className="space-y-2" aria-label={ATTENTION_STATE_COPY.label}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="isalwa-section-label">{ATTENTION_STATE_COPY.label}</span>
        <StatusPill tone={ATTENTION_STATE_TONE[conversation.attentionState]}>
          {attentionStateLabel(conversation.attentionState)}
        </StatusPill>
        <StatusPill tone="demo">{ATTENTION_STATE_COPY.aiNotConfigured}</StatusPill>
      </div>
      <p className="text-xs text-[var(--isalwa-slate)]">
        {conversation.automationPaused
          ? ATTENTION_STATE_COPY.automationPaused
          : ATTENTION_STATE_COPY.automationNotPaused}
      </p>
      {targets.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={ATTENTION_STATE_COPY.change}>
          <span className="text-xs text-[var(--isalwa-slate)]">{ATTENTION_STATE_COPY.change}</span>
          {targets.map((to) => (
            <Button
              key={to}
              type="button"
              variant="secondary"
              size="sm"
              disabled={pendingTo !== null}
              onClick={() => onChange(to)}
            >
              {pendingTo === to ? ATTENTION_STATE_COPY.changing : attentionStateLabel(to)}
            </Button>
          ))}
        </div>
      ) : null}
      {needsHolderHint ? (
        <p className="text-xs text-[var(--isalwa-slate)]">{ATTENTION_STATE_COPY.needsHolder}</p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-[var(--isalwa-kiln)]">
          {error}
        </p>
      ) : null}
    </section>
  );
}
