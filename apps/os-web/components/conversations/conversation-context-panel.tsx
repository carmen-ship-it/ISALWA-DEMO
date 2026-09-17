'use client';

import Link from 'next/link';
import { EmptyState } from '@isalwa/ui';
import { CertaintyBadge } from '@/components/certainty/certainty-badge';
import { WhoToAskCard } from '@/components/certainty/who-to-ask-card';
import { RecommendedReplyPanel } from '@/components/conversations/recommended-reply-panel';
import { SuggestionCard } from '@/components/conversations/suggestion-card';
import { CONVERSATIONS_COPY } from '@/lib/conversations/copy';
import { buildConversationContextView } from '@/lib/conversations/build-context-panel';
import type { Conversation } from '@/lib/conversations/model';
import type { CanonicalResponsible } from '@/lib/certainty';

type ConversationContextPanelProps = {
  conversation: Conversation | null;
  responsible?: CanonicalResponsible | null;
  canAssignResponsible?: boolean;
};

/**
 * Right-rail Contexto ISALWA — wired to certainty + deterministic suggestions.
 */
export function ConversationContextPanel({
  conversation,
  responsible = null,
  canAssignResponsible = false,
}: ConversationContextPanelProps) {
  if (!conversation) {
    return (
      <EmptyState
        title={CONVERSATIONS_COPY.emptyThread}
        description={CONVERSATIONS_COPY.emptyThreadHint}
      />
    );
  }

  const view = buildConversationContextView({
    conversation,
    responsible,
    canAssignResponsible,
  });

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
            responsible={responsible}
            canAssignResponsible={canAssignResponsible}
            canRequestUpdate={Boolean(responsible)}
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
            responsible={responsible}
            canAssignResponsible={canAssignResponsible}
            canRequestUpdate={Boolean(responsible)}
          />
        </div>
      </section>

      {view.suggestions.length > 0 ? (
        <section className="border-t border-[var(--isalwa-mist)] pt-3 space-y-3">
          <h3 className="isalwa-section-label">Sugerencias</h3>
          {view.suggestions.map((suggestion) => (
            <SuggestionCard key={suggestion.id} suggestion={suggestion} />
          ))}
        </section>
      ) : null}

      {view.recommendedReply ? (
        <section className="border-t border-[var(--isalwa-mist)] pt-3">
          <RecommendedReplyPanel
            body={view.recommendedReply.body}
            badges={view.recommendedReply.badges}
            allowRecordSent
          />
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
