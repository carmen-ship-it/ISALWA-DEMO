import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, beforeEach, afterEach } from 'node:test';
import {
  EVALUATION_OPERATIONAL_BUILT_NOTICE,
  EVALUATION_WALKTHROUGH_INTRO,
  EVALUATION_WALKTHROUGH_NOTICE,
  EVALUATION_WALKTHROUGH_TITLE,
  evaluationPostLoginPath,
  isEvaluationRuntimeProfile,
  isOperationalProductPath,
  isWalkthroughAllowedPath,
  isWalkthroughOnlyEvaluation,
} from './walkthrough-config';
import {
  isEmailOnEvaluatorAllowlist,
  parseEvaluatorAllowlist,
} from './evaluator-allowlist';
import { STORY_MODE_STEPS, STORY_PROPOSAL_NOTICE } from '@/lib/journey/story-steps';

describe('evaluation walkthrough config', () => {
  const prevProfile = process.env.OS_RUNTIME_PROFILE;
  const prevPublic = process.env.NEXT_PUBLIC_OS_RUNTIME_PROFILE;
  const prevFlag = process.env.OS_EVALUATION_WALKTHROUGH_ONLY;

  beforeEach(() => {
    delete process.env.OS_RUNTIME_PROFILE;
    delete process.env.NEXT_PUBLIC_OS_RUNTIME_PROFILE;
    delete process.env.OS_EVALUATION_WALKTHROUGH_ONLY;
  });

  afterEach(() => {
    if (prevProfile === undefined) delete process.env.OS_RUNTIME_PROFILE;
    else process.env.OS_RUNTIME_PROFILE = prevProfile;
    if (prevPublic === undefined) delete process.env.NEXT_PUBLIC_OS_RUNTIME_PROFILE;
    else process.env.NEXT_PUBLIC_OS_RUNTIME_PROFILE = prevPublic;
    if (prevFlag === undefined) delete process.env.OS_EVALUATION_WALKTHROUGH_ONLY;
    else process.env.OS_EVALUATION_WALKTHROUGH_ONLY = prevFlag;
  });

  it('enables walkthrough-only only for evaluation runtime', () => {
    assert.equal(isEvaluationRuntimeProfile(), false);
    assert.equal(isWalkthroughOnlyEvaluation(), false);
    assert.equal(evaluationPostLoginPath(), '/inicio');

    process.env.OS_RUNTIME_PROFILE = 'evaluation';
    assert.equal(isWalkthroughOnlyEvaluation(), true);
    assert.equal(evaluationPostLoginPath(), '/evaluacion');

    process.env.OS_EVALUATION_WALKTHROUGH_ONLY = '0';
    assert.equal(isWalkthroughOnlyEvaluation(), false);
  });

  it('classifies operational paths for redirect', () => {
    assert.equal(isWalkthroughAllowedPath('/evaluacion'), true);
    assert.equal(isWalkthroughAllowedPath('/login'), true);
    assert.equal(isOperationalProductPath('/clientes'), true);
    assert.equal(isOperationalProductPath('/inicio'), true);
    assert.equal(isOperationalProductPath('/conversaciones'), true);
    assert.equal(isOperationalProductPath('/cotizaciones'), true);
    assert.equal(isOperationalProductPath('/api/quotes/x/pdf'), true);
    assert.equal(isOperationalProductPath('/evaluacion'), false);
  });

  it('keeps exact evaluation chrome copy', () => {
    assert.equal(EVALUATION_WALKTHROUGH_TITLE, 'Evaluación guiada de ISALWA');
    assert.match(EVALUATION_WALKTHROUGH_INTRO, /sistema comercial completo/);
    assert.match(EVALUATION_WALKTHROUGH_NOTICE, /No crea ni modifica clientes/);
    assert.match(EVALUATION_OPERATIONAL_BUILT_NOTICE, /versión operativa local/);
  });
});

describe('evaluator allowlist (server-only)', () => {
  it('parses and matches emails without exposing them in client journey files', () => {
    const list = parseEvaluatorAllowlist(' One@Example.com , two@example.com\n');
    assert.deepEqual(list, ['one@example.com', 'two@example.com']);
    assert.equal(isEmailOnEvaluatorAllowlist('ONE@example.com', list), true);
    assert.equal(isEmailOnEvaluatorAllowlist('other@example.com', list), false);
    assert.equal(isEmailOnEvaluatorAllowlist(null, list), false);

    const overlay = readFileSync(join(process.cwd(), 'components/journey/owner-story-mode.tsx'), 'utf8');
    assert.doesNotMatch(overlay, /ISALWA_EVALUATOR_EMAILS/);
    const page = readFileSync(join(process.cwd(), 'app/evaluacion/page.tsx'), 'utf8');
    assert.doesNotMatch(page, /ISALWA_EVALUATOR_EMAILS/);
  });
});

describe('evaluation Journey reuses canonical 20 steps', () => {
  it('does not duplicate step content and keeps proposal notice', () => {
    assert.equal(STORY_MODE_STEPS.length, 20);
    assert.equal(
      STORY_PROPOSAL_NOTICE,
      'Vista de propuesta · Esta etapa todavía no guarda cambios ni envía información.',
    );
    const page = readFileSync(join(process.cwd(), 'app/evaluacion/page.tsx'), 'utf8');
    assert.match(page, /OwnerStoryMode/);
    assert.match(page, /presentation="evaluation-page"/);
    assert.doesNotMatch(page, /createOsApiClient|fetch\(|listSessionOrganizations/);
    const overlay = readFileSync(join(process.cwd(), 'components/journey/owner-story-mode.tsx'), 'utf8');
    assert.match(overlay, /evaluation-page/);
    assert.match(overlay, /EVALUATION_OPERATIONAL_BUILT_NOTICE/);
    assert.doesNotMatch(overlay, /createOsApiClient|\bfetch\(|'use server'/);
    // Walkthrough-only must not navigate working CTAs to operational desks.
    assert.match(overlay, /!walkthroughOnly && step\.href && step\.workingActionLabel/);
  });

  it('middleware redirects operational desks in walkthrough-only mode', () => {
    const middleware = readFileSync(join(process.cwd(), 'middleware.ts'), 'utf8');
    assert.match(middleware, /isWalkthroughOnlyEvaluation/);
    assert.match(middleware, /isEmailOnEvaluatorAllowlist/);
    assert.match(middleware, /motivo.*recorrido|motivo', 'recorrido'/);
    assert.match(middleware, /EVALUATION_POST_LOGIN|\/evaluacion/);
    assert.doesNotMatch(middleware, /ISALWA_EVALUATOR_EMAILS/);
  });

  it('sign-in skips os-api membership when walkthrough-only', () => {
    const actions = readFileSync(join(process.cwd(), 'lib/auth/actions.ts'), 'utf8');
    assert.match(actions, /isWalkthroughOnlyEvaluation/);
    assert.match(actions, /EVALUATION_POST_LOGIN/);
    assert.match(actions, /isEmailOnEvaluatorAllowlist/);
  });
});
