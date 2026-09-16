export type AiAssistEvidenceRef = {
  type: 'issue' | 'journal_entry';
  id: string;
};

export type AiAssistResponse = {
  summary: string;
  suggestion: string;
  facts: string[];
  evidenceRefs: AiAssistEvidenceRef[];
  modelCalled: boolean;
};

export type AiAssistActionResult =
  | { ok: true; data: AiAssistResponse }
  | { ok: false; code: 'disabled' | 'unavailable' | 'denied' | 'unknown'; message: string };
