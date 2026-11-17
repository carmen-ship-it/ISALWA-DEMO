/**
 * Evaluation fixture guards + catalog unit tests (no database).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  EVALUATION_COMMITMENTS,
  EVALUATION_CUSTOMERS,
  EVALUATION_QUOTE_STATES,
  assertEvaluationCatalogValid,
  evaluationCatalogMeta,
} from './catalog';
import {
  ADVISOR_EVAL_SCOPES,
  EVALUATION_CONVERSATION_PHRASE,
  EVALUATION_DB_HOST_MARKER,
  EVALUATION_ORG_SLUG,
  JEFE_EVAL_SCOPES,
  REVIEWER_FORBIDDEN_SCOPES,
  SHARED_REVIEWER_SCOPES,
  assertConversationPhrase,
  assertEvaluationConfirm,
  assertEvaluationDatabaseUrl,
  assertEvaluationLabel,
  assertEvaluationOrgIdNotLegacyDemo,
  assertEvaluationOrgSlug,
  assertNoLegacyDemoEnv,
  assertReviewerScopesExact,
  assertSyntheticEvaluationEmail,
  evaluationFixtureProof,
  isEvaluationLabel,
  isForbiddenReviewerScope,
  withEvaluationLabel,
} from './guards';
import { OWNER_DEMO_REAL_ORG, OWNER_DEMO_SYNTH_ORG } from '../owner-demo/guards';

const EVAL_URL = `postgresql://postgres:secret@db.${EVALUATION_DB_HOST_MARKER}.supabase.co:5432/postgres`;

describe('evaluation guards', () => {
  it('requires EVALUATION_FIXTURE_CONFIRM=1', () => {
    assert.throws(() => assertEvaluationConfirm(undefined), /EVALUATION_FIXTURE_CONFIRM/);
    assert.throws(() => assertEvaluationConfirm('0'), /EVALUATION_FIXTURE_CONFIRM/);
    assert.throws(() => assertEvaluationConfirm('true'), /EVALUATION_FIXTURE_CONFIRM/);
    assert.doesNotThrow(() => assertEvaluationConfirm('1'));
    assert.doesNotThrow(() => assertEvaluationConfirm(' 1 '));
  });

  it('accepts only the evaluation database host and never echoes the URL', () => {
    assert.doesNotThrow(() => assertEvaluationDatabaseUrl(EVAL_URL));
    assert.throws(() => assertEvaluationDatabaseUrl(undefined), /DATABASE_URL_MISSING/);
    assert.throws(() => assertEvaluationDatabaseUrl('not a url'), /DATABASE_URL_INVALID/);
    assert.throws(
      () => assertEvaluationDatabaseUrl('postgresql://u:secret@dpg-dajd3kh5efls738falcg-a.oregon-postgres.render.com/db'),
      /NON_EVALUATION_HOST/,
    );
    // The marker in the path or password is not the host.
    assert.throws(
      () => assertEvaluationDatabaseUrl(`postgresql://u:${EVALUATION_DB_HOST_MARKER}@other.example.com/${EVALUATION_DB_HOST_MARKER}`),
      /NON_EVALUATION_HOST/,
    );
    try {
      assertEvaluationDatabaseUrl('postgresql://u:topsecret@other.example.com/db');
      assert.fail('expected throw');
    } catch (err) {
      assert.doesNotMatch(String((err as Error).message), /topsecret/);
    }
  });

  it('accepts only the evaluation org slug', () => {
    assert.doesNotThrow(() => assertEvaluationOrgSlug(EVALUATION_ORG_SLUG));
    assert.throws(() => assertEvaluationOrgSlug('isalwa'), /ORG_SLUG/);
    assert.throws(() => assertEvaluationOrgSlug(null), /ORG_SLUG/);
    assert.throws(() => assertEvaluationOrgSlug(undefined), /ORG_SLUG/);
  });

  it('refuses the legacy demo organizations and demo env switches', () => {
    assert.throws(() => assertEvaluationOrgIdNotLegacyDemo(OWNER_DEMO_SYNTH_ORG), /LEGACY_DEMO_ORG/);
    assert.throws(() => assertEvaluationOrgIdNotLegacyDemo(OWNER_DEMO_REAL_ORG), /LEGACY_DEMO_ORG/);
    assert.doesNotThrow(() => assertEvaluationOrgIdNotLegacyDemo('some-other-id'));
    assert.doesNotThrow(() => assertNoLegacyDemoEnv({}));
    assert.throws(() => assertNoLegacyDemoEnv({ OWNER_DEMO_SYNTH_ORG: 'x' }), /OWNER_DEMO_SYNTH_ORG/);
    assert.throws(() => assertNoLegacyDemoEnv({ OS_DATOS_MODE: 'demo' }), /DATOS_MODE/);
  });

  it('flags forbidden shared-reviewer scopes', () => {
    for (const scope of REVIEWER_FORBIDDEN_SCOPES) assert.equal(isForbiddenReviewerScope(scope), true, scope);
    assert.equal(isForbiddenReviewerScope('audit.read'), true);
    assert.equal(isForbiddenReviewerScope('AUDIT:export'), true);
    assert.equal(isForbiddenReviewerScope(' People.Admin '), true);
    for (const scope of SHARED_REVIEWER_SCOPES) assert.equal(isForbiddenReviewerScope(scope), false, scope);
  });

  it('keeps the shared reviewer unable to approve its own quote', () => {
    assert.ok(!(SHARED_REVIEWER_SCOPES as readonly string[]).includes('commercial.price.approve'));
    assert.ok((JEFE_EVAL_SCOPES as readonly string[]).includes('commercial.price.approve'));
    assert.ok(!(ADVISOR_EVAL_SCOPES as readonly string[]).includes('commercial.price.approve'));
    assert.deepEqual([...SHARED_REVIEWER_SCOPES].sort(), [
      'commercial.customer.create',
      'commercial.customer.edit',
      'commercial.quote.convert.own',
      'commercial.team.read',
      'commercial.work.manage',
      'management.org.read',
      'payments.report',
    ]);
  });

  it('asserts the reviewer scopes are exactly the intended set', () => {
    assert.doesNotThrow(() => assertReviewerScopesExact([...SHARED_REVIEWER_SCOPES]));
    assert.doesNotThrow(() => assertReviewerScopesExact([...SHARED_REVIEWER_SCOPES].reverse()));
    assert.throws(
      () => assertReviewerScopesExact([...SHARED_REVIEWER_SCOPES, 'people.admin']),
      /FORBIDDEN_SCOPE:people.admin/,
    );
    assert.throws(
      () => assertReviewerScopesExact([...SHARED_REVIEWER_SCOPES, 'commercial.price.approve']),
      /FORBIDDEN_SCOPE/,
    );
    assert.throws(() => assertReviewerScopesExact([...SHARED_REVIEWER_SCOPES, 'audit.read']), /FORBIDDEN_SCOPE/);
    assert.throws(() => assertReviewerScopesExact([...SHARED_REVIEWER_SCOPES.slice(1)]), /SCOPES_MISMATCH/);
    assert.throws(() => assertReviewerScopesExact([...SHARED_REVIEWER_SCOPES, 'commercial.org.read']), /SCOPES_MISMATCH/);
  });

  it('requires synthetic members on the .invalid domain', () => {
    assert.doesNotThrow(() => assertSyntheticEvaluationEmail('jefe.eval@isalwa.eval.invalid'));
    assert.throws(() => assertSyntheticEvaluationEmail('jefe@isalwa.com.bo'), /SYNTHETIC_EMAIL_DOMAIN/);
    assert.throws(() => assertSyntheticEvaluationEmail('isalwa.review@isalwa.test'), /SYNTHETIC_EMAIL_DOMAIN/);
  });

  it('labels everything EVALUACIÓN', () => {
    assert.equal(isEvaluationLabel('EVALUACIÓN Cliente'), true);
    assert.equal(isEvaluationLabel('DEMO Cliente'), false);
    assert.throws(() => assertEvaluationLabel('DEMO Cliente'), /LABEL_REQUIRED/);
    assert.equal(withEvaluationLabel('Cliente'), 'EVALUACIÓN Cliente');
    assert.equal(withEvaluationLabel('EVALUACIÓN Cliente'), 'EVALUACIÓN Cliente');
  });

  it('requires the exact conversation phrase', () => {
    assert.equal(EVALUATION_CONVERSATION_PHRASE, 'Evaluación — conversación de ejemplo, sin conexión a Meta/WhatsApp');
    assert.doesNotThrow(() => assertConversationPhrase(`Hola. ${EVALUATION_CONVERSATION_PHRASE}.`));
    assert.throws(() => assertConversationPhrase('Evaluación - conversación de ejemplo'), /PHRASE_REQUIRED/);
    assert.throws(() => assertConversationPhrase(null), /PHRASE_REQUIRED/);
  });

  it('publishes the proof shape', () => {
    const proof = evaluationFixtureProof();
    assert.equal(proof.organizationSlug, EVALUATION_ORG_SLUG);
    assert.equal(proof.legacyDemoOrgTouched, false);
    assert.equal(proof.reviewerForbiddenScopesGranted, false);
  });
});

describe('evaluation catalog', () => {
  it('defines four labelled customers covering the four contexts', () => {
    assert.doesNotThrow(() => assertEvaluationCatalogValid());
    assert.equal(EVALUATION_CUSTOMERS.length, 4);
    const story = EVALUATION_CUSTOMERS.map((c) => `${c.displayName} ${c.story} ${c.quote.notes}`).join('\n');
    assert.match(story, /Showroom/);
    assert.match(story, /Más de 10 unidades/);
    assert.match(story, /Calidad Segunda/);
    assert.match(story, /Viajes\/Trópico/);
    for (const customer of EVALUATION_CUSTOMERS) {
      assert.ok(customer.displayName.startsWith('EVALUACIÓN '), customer.displayName);
      assert.equal(typeof customer.location.latitude, 'number');
      assert.equal(typeof customer.location.longitude, 'number');
    }
    assert.equal(new Set(EVALUATION_CUSTOMERS.map((c) => c.displayName)).size, 4);
    assert.equal(new Set(EVALUATION_CUSTOMERS.map((c) => c.phone)).size, 4);
  });

  it('walks each T04 quote state exactly once and uses all four conversation channels', () => {
    assert.deepEqual(
      EVALUATION_CUSTOMERS.map((c) => c.quote.targetState).sort(),
      [...EVALUATION_QUOTE_STATES].sort(),
    );
    assert.deepEqual(EVALUATION_CUSTOMERS.map((c) => c.conversation.channel).sort(), [
      'call',
      'in_person',
      'visit',
      'whatsapp',
    ]);
    for (const customer of EVALUATION_CUSTOMERS) assert.ok(customer.conversation.reason.length > 0);
  });

  it('invents no catalog products or real prices', () => {
    for (const customer of EVALUATION_CUSTOMERS) {
      assert.match(customer.quote.line.description, /sin producto de catálogo/);
      assert.equal(customer.quote.line.unitPriceCentavos, 100);
      assert.match(customer.quote.notes, /no es precio de catálogo/);
    }
  });

  it('has at least two follow-up commitments and the published meta', () => {
    assert.ok(EVALUATION_COMMITMENTS.length >= 2);
    const meta = evaluationCatalogMeta();
    assert.equal(meta.customerCount, 4);
    assert.equal(meta.conversationCount, 4);
    assert.ok(meta.commitmentCount >= 2);
  });
});
