'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { EmptyState } from '@isalwa/ui';
import { CertaintyBadge } from '@/components/certainty/certainty-badge';
import { WhoToAskCard } from '@/components/certainty/who-to-ask-card';
import { RecommendedReplyPanel } from '@/components/conversations/recommended-reply-panel';
import { SuggestionCard } from '@/components/conversations/suggestion-card';
import {
  ignoreConversationSuggestionAction,
  recordRecommendedReplySentAction,
} from '@/lib/conversations/actions';
import { CONVERSATIONS_COPY } from '@/lib/conversations/copy';
import { buildConversationContextView } from '@/lib/conversations/build-context-panel';
import type { Conversation } from '@/lib/conversations/model';
import type { ConversationSuggestion } from '@/lib/conversations/suggestion-types';
import {
  persistIgnoredSuggestionId,
  readIgnoredSuggestionIds,
  suggestionPrimaryActionHref,
} from '@/lib/conversations/suggestion-routing';
import type { CanonicalResponsible } from '@/lib/certainty';

export type ConversationRecordSentActor = {
  organizationId: string;
  memberId: string;
  enteredByLabel: string;
};

type ConversationContextPanelProps = {
  conversation: Conversation | null;
  responsible?: CanonicalResponsible | null;
  canAssignResponsible?: boolean;
  recordSentActor?: ConversationRecordSentActor | null;
  /** Server-loaded durable Ignore decisions for this conversation. */
  durableIgnoredSuggestionIds?: readonly string[];
  onConversationRecorded?: () => void;
};

/**
 * Right-rail Contexto ISALWA — wired to certainty + deterministic suggestions.
 */
export function ConversationContextPanel({
  conversation,
  responsible = null,
  canAssignResponsible = false,
  recordSentActor = null,
  durableIgnoredSuggestionIds = [],
  onConversationRecorded,
}: ConversationContextPanelProps) {
  const router = useRouter();
  const [ignoredIds, setIgnoredIds] = useState<Set<string>>(() => new Set());
  const [recordSentFeedback, setRecordSentFeedback] = useState<string | null>(null);
  const [ignoreFeedback, setIgnoreFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!conversation?.id) {
      setIgnoredIds(new Set());
      return;
    }
    const next = new Set(durableIgnoredSuggestionIds);
    for (const id of readIgnoredSuggestionIds(conversation.id)) {
      next.add(id);
    }
    setIgnoredIds(next);
  }, [conversation?.id, durableIgnoredSuggestionIds]);

  const navigateToSuggestionAction = useCallback(
    (suggestion: ConversationSuggestion) => {
      if (!conversation) return;
      // Review navigates only — never creates the suggested business record.
      router.push(suggestionPrimaryActionHref(suggestion, conversation));
    },
    [conversation, router],
  );

  const onIgnoreSuggestion = useCallback(
    async (suggestion: ConversationSuggestion) => {
      if (!conversation?.id) return;
      setIgnoreFeedback(null);
      // Optimistic hide; durable write when actor is available.
      setIgnoredIds(persistIgnoredSuggestionId(conversation.id, suggestion.id));
      if (!recordSentActor) {
        setIgnoreFeedback('Inicie sesión para registrar la decisión de forma durable.');
        return;
      }
      const result = await ignoreConversationSuggestionAction({
        organizationId: recordSentActor.organizationId,
        customerId: conversation.partyId,
        customerLabel: conversation.partyLabel,
        contactLabel: conversation.contactLabel,
        sourceConversationId: conversation.id,
        suggestion: {
          id: suggestion.id,
          type: suggestion.type,
          explanation: suggestion.explanation,
        },
        enteredByMemberId: recordSentActor.memberId,
        enteredByLabel: recordSentActor.enteredByLabel,
      });
      if (!result.ok) {
        setIgnoreFeedback(result.error);
        return;
      }
      onConversationRecorded?.();
      router.refresh();
    },
    [conversation, onConversationRecorded, recordSentActor, router],
  );

  const onRecordSent = useCallback(
    async (body: string) => {
      if (!conversation || !recordSentActor) {
        setRecordSentFeedback('Hace falta sesión activa para registrar el envío.');
        return;
      }
      setRecordSentFeedback(null);
      const result = await recordRecommendedReplySentAction({
        conversationId: conversation.id,
        customerId: conversation.partyId,
        customerLabel: conversation.partyLabel,
        contactLabel: conversation.contactLabel,
        body,
        organizationId: recordSentActor.organizationId,
        enteredByMemberId: recordSentActor.memberId,
        enteredByLabel: recordSentActor.enteredByLabel,
      });
      if (!result.ok) {
        setRecordSentFeedback(result.error);
        return;
      }
      setRecordSentFeedback('Quedó registrado que enviaron la respuesta fuera de ISALWA.');
      onConversationRecorded?.();
      router.refresh();
    },
    [conversation, onConversationRecorded, recordSentActor, router],
  );

  const resolvedResponsible = useMemo(() => {
    if (responsible) return responsible;
    if (!conversation?.responsible) return null;
    return {
      memberId: conversation.responsible.memberId,
      displayName: conversation.responsible.displayName,
      teamLabel: conversation.responsible.teamLabel,
    };
  }, [conversation?.responsible, responsible]);

  const view = useMemo(
    () =>
      conversation
        ? buildConversationContextView({
            conversation,
            responsible: resolvedResponsible,
            canAssignResponsible,
          })
        : null,
    [canAssignResponsible, conversation, resolvedResponsible],
  );

  const visibleSuggestions = useMemo(
    () => (view?.suggestions ?? []).filter((suggestion) => !ignoredIds.has(suggestion.id)),
    [ignoredIds, view?.suggestions],
  );

  if (!conversation || !view) {
    return (
      <EmptyState
        title={CONVERSATIONS_COPY.emptyThread}
        description={CONVERSATIONS_COPY.emptyThreadHint}
      />
    );
  }

  return (
    <div className="space-y-4" aria-label={CONVERSATIONS_COPY.contextLabel} data-contexto-isalwa="wired">
      <section>
        <p className="isalwa-section-label">{CONVERSATIONS_COPY.sections.cliente}</p>
        <p className="mt-1 text-sm font-medium text-[var(--isalwa-kiln)]">{view.cliente.name}</p>
        {view.cliente.contact ? (
          <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{view.cliente.contact}</p>
        ) : (
          <p className="mt-1 text-sm text-[var(--isalwa-slate)]">Contacto no registrado en este hilo</p>
        )}
        <p className="mt-2 text-sm text-[var(--isalwa-slate)]">{view.cliente.locationState}</p>
        {view.freshnessLabel ? (
          <p className="mt-2 text-xs text-[var(--isalwa-slate)]">{view.freshnessLabel}</p>
        ) : null}
        <div className="mt-3">
          <WhoToAskCard
            responsible={resolvedResponsible}
            canAssignResponsible={canAssignResponsible}
            canRequestUpdate={Boolean(resolvedResponsible)}
          />
        </div>
      </section>

      <section className="border-t border-[var(--isalwa-mist)] pt-3">
        <h3 className="isalwa-section-label">{CONVERSATIONS_COPY.sections.comercial}</h3>
        <ul className="mt-1.5 space-y-1 text-sm text-[var(--isalwa-kiln)]">
          <li>{view.comercial.opportunities}</li>
          <li>{view.comercial.quotes}</li>
          <li>{view.comercial.pedidos}</li>
        </ul>
        {view.comercial.links.map((link) => (
          <Link key={link.href} href={link.href} className="mt-2 block text-sm font-medium text-[var(--isalwa-glaze)] hover:underline">
            {link.label}
          </Link>
        ))}
      </section>

      <section className="border-t border-[var(--isalwa-mist)] pt-3">
        <h3 className="isalwa-section-label">{CONVERSATIONS_COPY.sections.operacion}</h3>
        <ul className="mt-1.5 space-y-1 text-sm text-[var(--isalwa-kiln)]">
          <li>{view.operacion.pedidoState}</li>
          <li>{view.operacion.production}</li>
          <li>{view.operacion.warehouse}</li>
          <li>{view.operacion.delivery}</li>
        </ul>
      </section>

      <section className="border-t border-[var(--isalwa-mist)] pt-3">
        <h3 className="isalwa-section-label">{CONVERSATIONS_COPY.sections.trabajo}</h3>
        <ul className="mt-1.5 space-y-1 text-sm text-[var(--isalwa-kiln)]">
          <li>Seguimiento: {view.trabajo.nextFollowUp}</li>
          <li>Incidencias: {view.trabajo.openIssues}</li>
          <li>Compromisos: {view.trabajo.commitments}</li>
        </ul>
      </section>

      <section className="border-t border-[var(--isalwa-mist)] pt-3">
        <h3 className="isalwa-section-label">{CONVERSATIONS_COPY.sections.informacion}</h3>
        <ul className="mt-2 space-y-2">
          {view.informacionAConfirmar.map((row) => (
            <li key={`${row.certainty}-${row.detail}`} className="flex flex-wrap items-start gap-2">
              <CertaintyBadge state={row.certainty} />
              <span className="text-sm text-[var(--isalwa-kiln)]">{row.detail}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-[var(--isalwa-mist)] pt-3">
        <h3 className="isalwa-section-label">{CONVERSATIONS_COPY.sections.recomendacion}</h3>
        <p className="mt-1.5 text-sm text-[var(--isalwa-kiln)]">{view.recomendacion}</p>
      </section>

      <section className="border-t border-[var(--isalwa-mist)] pt-3">
        <h3 className="isalwa-section-label">A quién preguntar</h3>
        <div className="mt-2">
          <WhoToAskCard
            responsible={resolvedResponsible}
            canAssignResponsible={canAssignResponsible}
            canRequestUpdate={Boolean(resolvedResponsible)}
          />
        </div>
      </section>

      {visibleSuggestions.length > 0 ? (
        <section className="border-t border-[var(--isalwa-mist)] pt-3 space-y-3">
          <h3 className="isalwa-section-label">Sugerencias</h3>
          {visibleSuggestions.map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              onPrimaryAction={navigateToSuggestionAction}
              onReview={navigateToSuggestionAction}
              onIgnore={onIgnoreSuggestion}
            />
          ))}
        </section>
      ) : null}

      {ignoreFeedback ? (
        <p className="text-sm text-[var(--isalwa-slate)]" role="status">
          {ignoreFeedback}
        </p>
      ) : null}

      {view.recommendedReply ? (
        <section className="border-t border-[var(--isalwa-mist)] pt-3">
          <RecommendedReplyPanel
            body={view.recommendedReply.body}
            badges={view.recommendedReply.badges}
            allowRecordSent={Boolean(recordSentActor)}
            onRecordSent={(body) => void onRecordSent(body)}
          />
          {recordSentFeedback ? (
            <p className="mt-2 text-sm text-[var(--isalwa-slate)]" role="status">
              {recordSentFeedback}
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="border-t border-[var(--isalwa-mist)] pt-3">
        <h3 className="isalwa-section-label">{CONVERSATIONS_COPY.sections.acciones}</h3>
        <ul className="mt-2 space-y-2">
          {view.acciones.map((action) => (
            <li key={action.href}>
              <Link href={action.href} className="text-sm font-medium text-[var(--isalwa-glaze)] hover:underline">
                {action.label}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-[var(--isalwa-slate)]">
          Las acciones requieren confirmación humana. ISALWA no crea Pedidos ni envía WhatsApp solo.
        </p>
      </section>
    </div>
  );
}
