'use client';

import { EmptyState } from '@isalwa/ui';
import { CONVERSATIONS_COPY } from '@/lib/conversations/copy';
import { emptyConversationContextHooks } from '@/lib/conversations/model';
import type { Conversation } from '@/lib/conversations/model';

const SECTION_ORDER = [
  ['cliente', CONVERSATIONS_COPY.sections.cliente],
  ['comercial', CONVERSATIONS_COPY.sections.comercial],
  ['operacion', CONVERSATIONS_COPY.sections.operacion],
  ['trabajo', CONVERSATIONS_COPY.sections.trabajo],
  ['informacion', CONVERSATIONS_COPY.sections.informacion],
  ['recomendacion', CONVERSATIONS_COPY.sections.recomendacion],
  ['acciones', CONVERSATIONS_COPY.sections.acciones],
] as const;

type ConversationContextPanelProps = {
  conversation: Conversation | null;
};

/**
 * Right-rail shell for Contexto ISALWA.
 * Smart content hooks stay stubbed for CT3-D.
 */
export function ConversationContextPanel({ conversation }: ConversationContextPanelProps) {
  const hooks = emptyConversationContextHooks();
  void hooks;

  if (!conversation) {
    return (
      <EmptyState
        title={CONVERSATIONS_COPY.emptyThread}
        description={CONVERSATIONS_COPY.emptyThreadHint}
      />
    );
  }

  return (
    <div className="space-y-4" aria-label={CONVERSATIONS_COPY.contextLabel}>
      <div>
        <p className="isalwa-section-label">Cliente</p>
        <p className="mt-1 text-sm font-medium text-[var(--isalwa-kiln)]">{conversation.partyLabel}</p>
        {conversation.contactLabel ? (
          <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{conversation.contactLabel}</p>
        ) : null}
      </div>
      {SECTION_ORDER.map(([key, label]) => (
        <section key={key} className="border-t border-[var(--isalwa-mist)] pt-3">
          <h3 className="isalwa-section-label">{label}</h3>
          <p className="mt-1.5 text-sm text-[var(--isalwa-slate)]">{CONVERSATIONS_COPY.stubWaiting}</p>
        </section>
      ))}
      {conversation.customerQuestion ? (
        <section className="border-t border-[var(--isalwa-mist)] pt-3">
          <h3 className="isalwa-section-label">Pregunta registrada</h3>
          <p className="mt-1.5 text-sm text-[var(--isalwa-kiln)]">{conversation.customerQuestion}</p>
        </section>
      ) : null}
      {conversation.nextAction ? (
        <section className="border-t border-[var(--isalwa-mist)] pt-3">
          <h3 className="isalwa-section-label">Siguiente paso anotado</h3>
          <p className="mt-1.5 text-sm text-[var(--isalwa-kiln)]">{conversation.nextAction}</p>
        </section>
      ) : null}
    </div>
  );
}
