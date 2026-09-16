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

/** Intents that must never be accepted as AI features. */
export const AI_DENIED_MUTATION_FEATURES = [
  'approve',
  'reject',
  'convert',
  'reassign',
  'send',
  'create_order',
  'confirm_payment',
  'resolve_issue',
  'close_issue',
  'grant_role',
  'terminate',
] as const;
