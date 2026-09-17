/**
 * Recommended customer reply helpers — Spanish-first, no overpromise, never auto-send.
 */

import type { CertaintyState } from '@/lib/certainty/model';

export const RECOMMENDED_REPLY_COPY = {
  title: 'RESPUESTA SUGERIDA',
  copy: 'Copiar respuesta',
  recordSent: 'Registrar como enviada',
  recordSentHint: 'Solo si ya enviaron el mensaje por fuera. No se envía por WhatsApp desde aquí.',
  neverAutoSend: 'ISALWA no envía WhatsApp automáticamente.',
} as const;

/** Forbidden overpromise tokens unless the fact is already confirmed. */
export const OVERPROMISE_PATTERNS = [
  /\bseguro\b/i,
  /\bgarantizado\b/i,
  /\bmañana llega\b/i,
  /\bya está listo\b/i,
  /\bya esta listo\b/i,
] as const;

export const PREFERRED_UNCERTAINTY = [
  'Voy a confirmar',
  'En el sistema aparece',
  'Déjeme validar la fecha exacta',
  'todavía falta confirmar',
] as const;

export type RecommendedReplyDraftInput = {
  /** Editable draft body. */
  body: string;
  /** Badges to show above the box — only confirmed / pending. */
  badges?: readonly ('confirmed' | 'pending')[];
  /** Whether manual external-send registration is available in this surface. */
  allowRecordSent?: boolean;
};

export type RecommendedReplyView = {
  title: typeof RECOMMENDED_REPLY_COPY.title;
  body: string;
  badges: readonly ('confirmed' | 'pending')[];
  copyLabel: typeof RECOMMENDED_REPLY_COPY.copy;
  recordSentLabel: typeof RECOMMENDED_REPLY_COPY.recordSent | null;
  neverAutoSend: typeof RECOMMENDED_REPLY_COPY.neverAutoSend;
};

export function buildRecommendedReplyView(input: RecommendedReplyDraftInput): RecommendedReplyView {
  const badges = (input.badges ?? []).filter((b) => b === 'confirmed' || b === 'pending');
  return {
    title: RECOMMENDED_REPLY_COPY.title,
    body: input.body.trim(),
    badges,
    copyLabel: RECOMMENDED_REPLY_COPY.copy,
    recordSentLabel: input.allowRecordSent ? RECOMMENDED_REPLY_COPY.recordSent : null,
    neverAutoSend: RECOMMENDED_REPLY_COPY.neverAutoSend,
  };
}

export function draftContainsOverpromise(body: string): boolean {
  return OVERPROMISE_PATTERNS.some((re) => re.test(body));
}

/** Courteous Spanish drafts for demo product / delivery questions — never auto-send. */
export function demoRecommendedReplyFor(
  kind: 'product_6mm_catalog_no_stock' | 'product_6mm_absent' | 'delivery_unknown',
): { certainty: CertaintyState; body: string; badges: ('confirmed' | 'pending')[] } {
  if (kind === 'product_6mm_catalog_no_stock') {
    return {
      certainty: 'pending',
      badges: ['pending'],
      body: 'Sí manejamos esa presentación. Déjeme confirmar disponibilidad actual antes de ofrecérsela.',
    };
  }
  if (kind === 'product_6mm_absent') {
    return {
      certainty: 'not_recorded',
      badges: [],
      body: 'Voy a confirmar esa especificación con el equipo y le respondo con lo que tengamos registrado.',
    };
  }
  return {
    certainty: 'pending',
    badges: ['pending'],
    body: 'En el sistema aparece el pedido, pero todavía falta confirmar la fecha exacta de llegada. Déjeme validarla y le escribo.',
  };
}
