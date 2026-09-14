'use client';

/**
 * Evidence review surface.
 * Host from /mensajes only if that page is free of the capability-lock lane.
 * This panel does not send WhatsApp, call a model, or write a canonical record.
 */
import { useState } from 'react';
import type { EvidenceConflict } from '@isalwa/os-contracts';
import { Button, EmptyState, InsightCard, PageSection, SectionHeader, StatusPill } from '@isalwa/ui';
import type { ExtractionCandidate, NormalizedConversationMessage } from '../../../../packages/os-contracts/src/conversation-evidence';
import {
  buildEvidenceReviewModel,
  dismissReading,
  linkExistingRecord,
  registerReported,
  type EvidenceReviewCardModel,
} from '@/lib/evidence/review-model';

const fieldClass =
  'mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-sm text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]';

export type EvidenceReviewPanelProps = {
  organizationId: string;
  conversationId: string;
  builtAt: string;
  actorMemberId: string;
  messages: readonly NormalizedConversationMessage[];
  candidates: readonly ExtractionCandidate[];
  conflicts?: readonly EvidenceConflict[];
  sourceHrefFor?: (messageId: string) => string | null;
};

export function EvidenceReviewPanel({
  organizationId,
  conversationId,
  builtAt,
  actorMemberId,
  messages,
  candidates,
  conflicts,
  sourceHrefFor,
}: EvidenceReviewPanelProps) {
  const initial = buildEvidenceReviewModel({
    organizationId,
    conversationId,
    builtAt,
    actorMemberId,
    messages,
    candidates,
    conflicts,
    sourceHrefFor,
  });
  const [cards, setCards] = useState(initial.cards);
  const [notice, setNotice] = useState<string | null>(null);
  const empty = cards.length === 0 && initial.contextItems.length === 0 && initial.conflicts.length === 0;

  function replaceCard(next: EvidenceReviewCardModel, text: string) {
    setCards((current) => current.map((card) => (card.id === next.id ? next : card)));
    setNotice(text);
  }

  return (
    <PageSection card aria-label="Revisión de evidencia">
      <div className="space-y-6 p-5 md:p-6">
        <SectionHeader kicker="Evidencia" title="Revisión de evidencia" />
        <InsightCard>
          {initial.boundary} {initial.paymentRule}
        </InsightCard>
        {notice ? (
          <p className="text-sm text-[var(--isalwa-kiln)]" role="status">
            {notice}
          </p>
        ) : null}
        {initial.actorMissing ? (
          <p className="text-sm text-[var(--isalwa-slate)]">{initial.actorMissing}</p>
        ) : null}

        {empty ? (
          <EmptyState
            title="Sin evidencia para revisar"
            description="Cuando haya un mensaje, la revisión muestra la fuente, la confianza y la confirmación por separado."
          />
        ) : null}

        {initial.conflicts.length > 0 ? (
          <ul className="m-0 list-none space-y-3 p-0">
            {initial.conflicts.map((conflict) => (
              <li
                key={conflict.id}
                className="rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] px-4 py-3"
              >
                <p className="text-sm font-medium text-[var(--isalwa-kiln)]">{conflict.title}</p>
                <p className="mt-2 text-sm text-[var(--isalwa-slate)]">El cliente menciona: {conflict.customerSaid}</p>
                <p className="text-sm text-[var(--isalwa-slate)]">Registro actual: {conflict.currentTruth}</p>
                <p className="mt-2 text-sm text-[var(--isalwa-slate)]">{conflict.notice}</p>
              </li>
            ))}
          </ul>
        ) : null}

        <ul className="m-0 list-none space-y-4 p-0">
          {cards.map((card) => (
            <li key={card.id}>
              <EvidenceReviewCard
                card={card}
                reviewedAt={builtAt}
                actorMemberId={actorMemberId}
                onReviewed={replaceCard}
              />
            </li>
          ))}
        </ul>

        {initial.openQuestions.length > 0 ? (
          <div>
            <h3 className="isalwa-section-label">Preguntas pendientes</h3>
            <ul className="mt-3 space-y-3">
              {initial.openQuestions.map((question) => (
                <li key={question.messageId} className="text-sm leading-relaxed text-[var(--isalwa-slate)]">
                  <p className="text-[var(--isalwa-kiln)]">“{question.text}”</p>
                  <StatusPill tone="warning" className="mt-2">
                    {question.confirmation}
                  </StatusPill>
                  <p className="mt-2">{question.note}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="space-y-3 border-t border-[var(--isalwa-mist)] pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="isalwa-section-label">Contexto listo para IA</h3>
            <StatusPill tone="demo">{initial.modelStatus}</StatusPill>
            <StatusPill tone="demo">{initial.providerStatus}</StatusPill>
          </div>
          <p className="text-sm text-[var(--isalwa-slate)]">{initial.commitmentStatus}</p>
          <p className="text-sm text-[var(--isalwa-slate)]">{initial.intelligenceStatus}</p>
          <ul className="m-0 list-none space-y-3 p-0">
            {initial.contextItems.map((item) => (
              <li key={item.id} className="text-sm leading-relaxed text-[var(--isalwa-slate)]">
                <p className="text-[var(--isalwa-kiln)]">{item.text}</p>
                <p className="mt-1">Fuente: {item.source}</p>
                <p>Confianza: {item.confidence}</p>
                <p>Confirmación: {item.confirmation}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </PageSection>
  );
}

function EvidenceReviewCard({
  card,
  reviewedAt,
  actorMemberId,
  onReviewed,
}: {
  card: EvidenceReviewCardModel;
  reviewedAt: string;
  actorMemberId: string;
  onReviewed: (card: EvidenceReviewCardModel, notice: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [recordType, setRecordType] = useState('');
  const [recordId, setRecordId] = useState('');

  return (
    <article className="space-y-3 border-t border-[var(--isalwa-mist)] py-3">
      <p className="text-sm font-medium text-[var(--isalwa-kiln)]">{card.interpretation}</p>
      <div className="flex flex-wrap gap-2">
        <StatusPill tone="manual">{card.source}</StatusPill>
        <StatusPill tone={card.confirmation === 'Confirmado' ? 'success' : 'warning'}>{card.confirmation}</StatusPill>
        {card.confidence ? <StatusPill tone="neutral">Confianza {card.confidence}</StatusPill> : null}
      </div>
      {card.confidenceNote ? (
        <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">{card.confidenceNote}</p>
      ) : null}
      {card.why ? (
        <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">
          <span className="font-medium text-[var(--isalwa-kiln)]">Por qué veo esto. </span>
          {card.why}
        </p>
      ) : null}
      {card.excerpt ? <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">“{card.excerpt}”</p> : null}
      {card.sourceHref ? (
        <a href={card.sourceHref} className="text-sm font-medium text-[var(--isalwa-glaze)] hover:underline">
          Ver mensaje fuente
        </a>
      ) : null}
      {card.paymentNotice ? <p className="text-sm text-[var(--isalwa-slate)]">{card.paymentNotice}</p> : null}
      {card.blockedReason ? <p className="text-sm text-[var(--isalwa-slate)]">{card.blockedReason}</p> : null}
      {card.historyNote ? <p className="text-sm text-[var(--isalwa-slate)]">{card.historyNote}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={!card.canRegister}
          onClick={() => {
            const result = registerReported(card, { at: reviewedAt, actorMemberId });
            onReviewed(result.card, result.text);
          }}
        >
          Registrar como dato reportado
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={!card.canDismiss}
          onClick={() => {
            const result = dismissReading(card, {
              at: reviewedAt,
              actorMemberId,
              reason: reason.trim() || null,
            });
            onReviewed(result.card, result.text);
          }}
        >
          Descartar
        </Button>
      </div>
      <label className="block text-sm text-[var(--isalwa-slate)]">
        Motivo para descartar
        <input
          className={fieldClass}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          disabled={!card.canDismiss}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm text-[var(--isalwa-slate)]">
          Tipo de registro
          <input
            className={fieldClass}
            value={recordType}
            onChange={(event) => setRecordType(event.target.value)}
            disabled={!card.canLink}
          />
        </label>
        <label className="block text-sm text-[var(--isalwa-slate)]">
          Identificador
          <input
            className={fieldClass}
            value={recordId}
            onChange={(event) => setRecordId(event.target.value)}
            disabled={!card.canLink}
          />
        </label>
      </div>
      <Button
        size="sm"
        variant="secondary"
        disabled={!card.canLink}
        onClick={() => {
          const result = linkExistingRecord(card, {
            at: reviewedAt,
            actorMemberId,
            relatedRecordType: recordType,
            relatedRecordId: recordId,
          });
          onReviewed(result.card, result.text);
        }}
      >
        Vincular a registro existente
      </Button>
    </article>
  );
}
