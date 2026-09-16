export type AiChatRole = 'system' | 'user' | 'assistant';

export type AiChatMessage = {
  role: AiChatRole;
  content: string;
};

export type AiAssistEvidenceRef = {
  type: 'issue' | 'journal_entry';
  id: string;
};

export type AiAssistInput = {
  feature: string;
  subjectType: string;
  subjectId: string;
  facts: readonly string[];
  evidenceRefs: readonly AiAssistEvidenceRef[];
  maxOutputTokens?: number;
};

export type AiAssistResult = {
  summary: string;
  suggestion: string;
  facts: string[];
  evidenceRefs: AiAssistEvidenceRef[];
  modelCalled: boolean;
};
