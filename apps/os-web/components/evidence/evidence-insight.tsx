import { StatusPill } from '@isalwa/ui';
import type { EvidenceFact } from '@isalwa/os-contracts';
import { paymentClaimMayBeConfirmed } from '@isalwa/os-contracts';
import {
  confidenceExplainsUnderstandingOnly,
  confidenceLabel,
  confirmationLabel,
  sourceLabel,
} from '@/lib/evidence/labels';

type EvidenceInsightProps = {
  fact: EvidenceFact;
  sourceHref?: string;
};

/**
 * Renders an already-stored interpretation. It does not extract, send, or confirm.
 */
export function EvidenceInsight({ fact, sourceHref }: EvidenceInsightProps) {
  const canConfirmPayment = fact.kind === 'payment_claim' && paymentClaimMayBeConfirmed(fact.sourceType);
  return (
    <article className="max-w-xl space-y-2 border-t border-[var(--isalwa-mist)] py-3">
      <p className="text-sm font-medium text-[var(--isalwa-kiln)]">{fact.interpretation}</p>
      <div className="flex flex-wrap gap-2">
        <StatusPill tone={fact.sourceType === 'ai_inferred' ? 'info' : 'manual'}>
          {sourceLabel(fact.sourceType)}
        </StatusPill>
        <StatusPill tone={fact.confirmationState === 'confirmed' ? 'success' : 'warning'}>
          {confirmationLabel(fact.confirmationState)}
        </StatusPill>
        {fact.confidence ? <StatusPill tone="neutral">Confianza {confidenceLabel(fact.confidence)}</StatusPill> : null}
      </div>
      {fact.confidence ? (
        <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">{confidenceExplainsUnderstandingOnly()}</p>
      ) : null}
      {fact.why ? (
        <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">
          <span className="font-medium text-[var(--isalwa-kiln)]">Por qué veo esto. </span>
          {fact.why}
        </p>
      ) : null}
      {fact.sourceExcerpt ? (
        <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">“{fact.sourceExcerpt}”</p>
      ) : null}
      {sourceHref ? (
        <a href={sourceHref} className="text-sm font-medium text-[var(--isalwa-glaze)] hover:underline">
          Ver mensaje fuente
        </a>
      ) : null}
      {canConfirmPayment ? null : fact.kind === 'payment_claim' ? (
        <p className="text-sm text-[var(--isalwa-slate)]">Esto no confirma el cobro.</p>
      ) : null}
    </article>
  );
}
