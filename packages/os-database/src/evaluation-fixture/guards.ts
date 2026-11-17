/**
 * Evaluation fixture guards — isolated evaluation database + org ONLY, fail-closed.
 * Pure helpers (no I/O); safe to unit-test without a database.
 *
 * Replaces nothing: it is a separate tool from owner-demo. It never restores the old
 * demo data mode, OWNER_DEMO_SYNTH_ORG, or any hard-coded fake company id.
 */
import { OWNER_DEMO_REAL_ORG, OWNER_DEMO_SYNTH_ORG } from '../owner-demo/guards';

/** The only organization this fixture may write to (resolved by slug at run time, never by a fixed id). */
export const EVALUATION_ORG_SLUG = 'isalwa-eval-demo-v1' as const;
/** Project marker of the isolated evaluation database (host of OS_DATABASE_URL). */
export const EVALUATION_DB_HOST_MARKER = 'eimvhirmaezssnevefly' as const;
export const EVALUATION_FIXTURE_CONFIRM_VALUE = '1' as const;
export const EVALUATION_FIXTURE_CONFIRM_ENV = 'EVALUATION_FIXTURE_CONFIRM' as const;

/** Every fixture-created name carries this label. */
export const EVALUACION_LABEL = 'EVALUACIÓN' as const;
export const EVALUACION_PREFIX = `${EVALUACION_LABEL} ` as const;

/** Exact phrase every fixture conversation must carry in summary and pasted evidence. */
export const EVALUATION_CONVERSATION_PHRASE =
  'Evaluación — conversación de ejemplo, sin conexión a Meta/WhatsApp' as const;

export const SHARED_REVIEWER_EMAIL = 'isalwa.review@isalwa.test' as const;
export const SYNTHETIC_EMAIL_DOMAIN = '@isalwa.eval.invalid' as const;

export const JEFE_EVAL_EMAIL = `jefe.eval${SYNTHETIC_EMAIL_DOMAIN}` as const;
export const JEFE_EVAL_GIVEN_NAME = 'Jefatura Comercial' as const;
export const JEFE_EVAL_FAMILY_NAME = 'Evaluación' as const;

export const ADVISOR_EVAL_EMAIL = `asesor.cobertura.eval${SYNTHETIC_EMAIL_DOMAIN}` as const;
export const ADVISOR_EVAL_GIVEN_NAME = 'Asesor Cobertura' as const;
export const ADVISOR_EVAL_FAMILY_NAME = 'Evaluación' as const;

/** Exact scopes of the shared reviewer. No commercial.price.approve: it cannot approve its own quote. */
export const SHARED_REVIEWER_SCOPES = [
  'commercial.customer.create',
  'commercial.customer.edit',
  'commercial.quote.convert.own',
  'commercial.work.manage',
  'commercial.team.read',
  'management.org.read',
  'payments.report',
] as const;

/** Synthetic Jefatura: approves prices and administers coverage. Never the reviewer. */
export const JEFE_EVAL_SCOPES = [
  'commercial.price.approve',
  'commercial.org.read',
  'commercial.team.read',
  'commercial.account.reassign',
  'commercial.assignment.org',
] as const;

/** Synthetic covering advisor: the coverage target. */
export const ADVISOR_EVAL_SCOPES = ['commercial.customer.edit', 'commercial.quote.convert.own'] as const;

/** Never on the shared reviewer (exact keys). Audit scopes are matched by prefix below. */
export const REVIEWER_FORBIDDEN_SCOPES = [
  'people.admin',
  'system.admin',
  'master_data.admin',
  'payments.confirm',
  'commercial.price.approve',
] as const;

const REVIEWER_FORBIDDEN_PREFIXES = ['audit.', 'audit:'] as const;

export function isForbiddenReviewerScope(scope: string): boolean {
  const s = scope.trim().toLowerCase();
  if ((REVIEWER_FORBIDDEN_SCOPES as readonly string[]).includes(s)) return true;
  if (s === 'audit') return true;
  return REVIEWER_FORBIDDEN_PREFIXES.some((prefix) => s.startsWith(prefix));
}

/** Throws when a forbidden scope appears, or when the set differs from the intended reviewer scopes. */
export function assertReviewerScopesExact(scopes: readonly string[]): void {
  const forbidden = scopes.filter(isForbiddenReviewerScope);
  if (forbidden.length > 0) {
    throw new Error(`EVALUATION_REVIEWER_FORBIDDEN_SCOPE:${forbidden.join(',')}`);
  }
  const actual = [...new Set(scopes)].sort();
  const expected = [...SHARED_REVIEWER_SCOPES].sort();
  if (actual.length !== expected.length || actual.some((scope, i) => scope !== expected[i])) {
    throw new Error(`EVALUATION_REVIEWER_SCOPES_MISMATCH:${actual.join(',')}`);
  }
}

export function assertEvaluationConfirm(envValue: string | undefined): void {
  if (envValue?.trim() !== EVALUATION_FIXTURE_CONFIRM_VALUE) {
    throw new Error(`${EVALUATION_FIXTURE_CONFIRM_ENV}=1 required for the evaluation fixture`);
  }
}

/**
 * The database host must be the isolated evaluation project. Only the hostname is examined and
 * the URL is never echoed in an error (it carries a secret).
 */
export function assertEvaluationDatabaseUrl(databaseUrl: string | undefined): void {
  if (!databaseUrl?.trim()) throw new Error('EVALUATION_DATABASE_URL_MISSING');
  let hostname: string;
  try {
    hostname = new URL(databaseUrl.trim()).hostname;
  } catch {
    throw new Error('EVALUATION_DATABASE_URL_INVALID');
  }
  if (!hostname.includes(EVALUATION_DB_HOST_MARKER)) {
    throw new Error('EVALUATION_REFUSING_NON_EVALUATION_HOST');
  }
}

export function assertEvaluationOrgSlug(slug: string | null | undefined): void {
  if (slug !== EVALUATION_ORG_SLUG) {
    throw new Error(`EVALUATION_REFUSING_ORG_SLUG:${slug ?? 'null'}`);
  }
}

/** The old demo organizations are never a target, whatever their slug says. */
export function assertEvaluationOrgIdNotLegacyDemo(organizationId: string): void {
  const id = organizationId.trim();
  if (id === OWNER_DEMO_SYNTH_ORG || id === OWNER_DEMO_REAL_ORG) {
    throw new Error('EVALUATION_REFUSING_LEGACY_DEMO_ORG');
  }
}

/** Fail closed if the old demo mode is switched on in the environment. */
export function assertNoLegacyDemoEnv(env: Record<string, string | undefined>): void {
  if (env.OWNER_DEMO_SYNTH_ORG?.trim()) throw new Error('EVALUATION_REFUSING_OWNER_DEMO_SYNTH_ORG_ENV');
  if (env.OWNER_DEMO_ALLOW_NON_STAGING_HOST?.trim()) throw new Error('EVALUATION_REFUSING_OWNER_DEMO_ENV');
  if (env.NEXT_PUBLIC_DATOS_MODE?.trim() || env.OS_DATOS_MODE?.trim()) {
    throw new Error('EVALUATION_REFUSING_DATOS_MODE_ENV');
  }
}

export function isEvaluationLabel(name: string | null | undefined): boolean {
  return (name ?? '').trim().startsWith(EVALUACION_PREFIX);
}

export function assertEvaluationLabel(name: string): void {
  if (!isEvaluationLabel(name)) throw new Error(`EVALUATION_LABEL_REQUIRED:${name}`);
}

export function withEvaluationLabel(text: string): string {
  const trimmed = text.trim();
  return isEvaluationLabel(trimmed) || trimmed.startsWith(EVALUACION_LABEL) ? trimmed : `${EVALUACION_PREFIX}${trimmed}`;
}

export function hasConversationPhrase(text: string | null | undefined): boolean {
  return (text ?? '').includes(EVALUATION_CONVERSATION_PHRASE);
}

export function assertConversationPhrase(text: string | null | undefined): void {
  if (!hasConversationPhrase(text)) throw new Error('EVALUATION_CONVERSATION_PHRASE_REQUIRED');
}

/** Synthetic members live on the reserved .invalid domain: they can never receive mail or log in remotely. */
export function assertSyntheticEvaluationEmail(email: string): void {
  if (!email.trim().toLowerCase().endsWith(SYNTHETIC_EMAIL_DOMAIN)) {
    throw new Error(`EVALUATION_SYNTHETIC_EMAIL_DOMAIN:${email}`);
  }
}

export type EvaluationFixtureProof = {
  organizationSlug: typeof EVALUATION_ORG_SLUG;
  databaseHostMarker: typeof EVALUATION_DB_HOST_MARKER;
  legacyDemoOrgTouched: false;
  reviewerForbiddenScopesGranted: false;
};

export function evaluationFixtureProof(): EvaluationFixtureProof {
  return {
    organizationSlug: EVALUATION_ORG_SLUG,
    databaseHostMarker: EVALUATION_DB_HOST_MARKER,
    legacyDemoOrgTouched: false,
    reviewerForbiddenScopesGranted: false,
  };
}
