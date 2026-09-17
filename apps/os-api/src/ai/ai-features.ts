/**
 * Bounded AI feature catalog.
 * Browser/user may only request these operations — never arbitrary chat.
 */

export const AI_BOUNDED_FEATURES = [
  'summarizeIssue',
  'summarizeIssuePrecedents',
  'summarizeCustomerAuthorizedContext',
  'summarizeCommitments',
  'suggestIssueNextSteps',
  'explainCurrentSurface',
] as const;

export type AiBoundedFeature = (typeof AI_BOUNDED_FEATURES)[number];

/** Legacy aliases accepted once and normalized server-side. */
const FEATURE_ALIASES: Record<string, AiBoundedFeature> = {
  summarize_customer: 'summarizeCustomerAuthorizedContext',
  ask: 'explainCurrentSurface',
  draft_follow_up: 'suggestIssueNextSteps',
  summarize_commitments: 'summarizeCommitments',
};

export type AiFeatureSubjectType = 'issue' | 'party' | 'commitment';

const FEATURE_SUBJECTS: Record<AiBoundedFeature, readonly AiFeatureSubjectType[]> = {
  summarizeIssue: ['issue'],
  summarizeIssuePrecedents: ['issue'],
  summarizeCustomerAuthorizedContext: ['party'],
  summarizeCommitments: ['party', 'commitment'],
  suggestIssueNextSteps: ['issue'],
  explainCurrentSurface: ['issue', 'party'],
};

export function normalizeAiFeature(raw: string): AiBoundedFeature | null {
  const trimmed = raw.trim();
  if ((AI_BOUNDED_FEATURES as readonly string[]).includes(trimmed)) {
    return trimmed as AiBoundedFeature;
  }
  return FEATURE_ALIASES[trimmed] ?? null;
}

export function assertFeatureSubject(
  feature: AiBoundedFeature,
  subjectType: string,
): AiFeatureSubjectType {
  const allowed = FEATURE_SUBJECTS[feature];
  if (!(allowed as readonly string[]).includes(subjectType)) {
    throw new Error('VALIDATION_FAILED');
  }
  return subjectType as AiFeatureSubjectType;
}

/**
 * Intents that must never be accepted as AI features.
 * AI may summarize / draft / suggest only — never mutate business truth.
 */
export const AI_DENIED_MUTATION_FEATURES = [
  'approve',
  'reject',
  'convert',
  'reassign',
  'send',
  'send_whatsapp',
  'create_order',
  'confirm_payment',
  'register_delivery',
  'move_stock',
  'change_access',
  'grant_role',
  'resolve_issue',
  'close_issue',
  'terminate',
] as const;
