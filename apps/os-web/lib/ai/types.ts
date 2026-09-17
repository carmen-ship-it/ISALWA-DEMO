export type AiAssistEvidenceRef = {
  type: 'issue' | 'journal_entry' | 'commitment';
  id: string;
};

export type AiDeepLinkSource = {
  type: 'issue' | 'journal_entry' | 'commitment' | 'party' | 'conversation' | 'order';
  id: string;
  label: string;
  href: string;
};

/** Certainty-shaped Ask ISALWA answer (CT3 §60). */
export type AiCertaintyAnswer = {
  loConfirmado: string[];
  pendienteDeConfirmar: string[];
  noRegistrado: string[];
  recomendacion: string;
  aQuienPreguntar: string;
  fuentes: AiDeepLinkSource[];
};

export type AiAssistResponse = {
  summary: string;
  suggestion: string;
  facts: string[];
  evidenceRefs: AiAssistEvidenceRef[];
  modelCalled: boolean;
  truncated?: boolean;
  certainty?: AiCertaintyAnswer;
};

export type AiAssistActionResult =
  | { ok: true; data: AiAssistResponse }
  | { ok: false; code: 'disabled' | 'unavailable' | 'denied' | 'unknown'; message: string };
