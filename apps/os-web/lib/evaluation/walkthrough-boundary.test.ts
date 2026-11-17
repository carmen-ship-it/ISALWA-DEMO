import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { decideWalkthroughBoundary } from './walkthrough-boundary';
import {
  evaluationPostLoginPath,
  isEvaluationRuntimeProfile,
  isFrameworkOrStaticAssetPath,
  isOperationalProductPath,
  isWalkthroughOnlyEvaluation,
} from './walkthrough-config';
import {
  isEmailOnEvaluatorAllowlist,
  parseEvaluatorAllowlist,
} from './evaluator-allowlist-logic';

describe('evaluation security follow-ups', () => {
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

  it('1) login ignoreClientNext: evaluation sign-in forces /evaluacion and login form honors the flag', () => {
    const actions = readFileSync(join(process.cwd(), 'lib/auth/actions.ts'), 'utf8');
    assert.match(actions, /ignoreClientNext:\s*true/);
    assert.match(actions, /redirectTo:\s*EVALUATION_POST_LOGIN/);
    const login = readFileSync(join(process.cwd(), 'components/auth/login-form.tsx'), 'utf8');
    assert.match(login, /result\.ignoreClientNext \? null : safeInternalPath\(searchParams\.get\('next'\)\)/);

    process.env.OS_RUNTIME_PROFILE = 'evaluation';
    assert.equal(evaluationPostLoginPath(), '/evaluacion');

    // Boundary: authenticated evaluator on /login always goes to /evaluacion (no next).
    assert.deepEqual(
      decideWalkthroughBoundary({
        pathname: '/login',
        method: 'GET',
        authenticated: true,
        evaluatorAllowed: true,
      }),
      { kind: 'redirect', location: '/evaluacion' },
    );
  });

  it('2) evaluation security uses only OS_RUNTIME_PROFILE (not NEXT_PUBLIC_)', () => {
    process.env.NEXT_PUBLIC_OS_RUNTIME_PROFILE = 'evaluation';
    assert.equal(isEvaluationRuntimeProfile(), false);
    assert.equal(isWalkthroughOnlyEvaluation(), false);

    delete process.env.NEXT_PUBLIC_OS_RUNTIME_PROFILE;
    process.env.OS_RUNTIME_PROFILE = 'evaluation';
    assert.equal(isEvaluationRuntimeProfile(), true);
    assert.equal(isWalkthroughOnlyEvaluation(), true);

    const config = readFileSync(join(process.cwd(), 'lib/evaluation/walkthrough-config.ts'), 'utf8');
    assert.doesNotMatch(
      config,
      /isEvaluationRuntimeProfile[\s\S]*NEXT_PUBLIC_OS_RUNTIME_PROFILE/,
    );
    assert.match(config, /OS_RUNTIME_PROFILE\?\.trim\(\) === 'evaluation'/);
  });

  it('3) evaluator allowlist stays server-only and never uses NEXT_PUBLIC_', () => {
    const list = parseEvaluatorAllowlist('a@example.com');
    assert.equal(isEmailOnEvaluatorAllowlist('a@example.com', list), true);

    const gate = readFileSync(join(process.cwd(), 'lib/evaluation/evaluator-allowlist.ts'), 'utf8');
    assert.match(gate, /server-only|typeof window/);
    assert.match(gate, /process\.env\.ISALWA_EVALUATOR_EMAILS/);
    assert.doesNotMatch(gate, /process\.env\.NEXT_PUBLIC_/);

    for (const file of [
      'components/journey/owner-story-mode.tsx',
      'components/auth/login-form.tsx',
      'app/evaluacion/page.tsx',
      'components/evaluation/evaluation-sign-out-link.tsx',
    ]) {
      const source = readFileSync(join(process.cwd(), file), 'utf8');
      assert.doesNotMatch(source, /ISALWA_EVALUATOR_EMAILS|evaluator-allowlist/);
    }
  });

  it('4) /evaluacion is GET/HEAD only; mutating ops fail closed without redirect', () => {
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      assert.deepEqual(
        decideWalkthroughBoundary({
          pathname: '/evaluacion',
          method,
          authenticated: true,
          evaluatorAllowed: true,
        }),
        { kind: 'method_not_allowed' },
      );
      assert.deepEqual(
        decideWalkthroughBoundary({
          pathname: '/clientes',
          method,
          authenticated: true,
          evaluatorAllowed: true,
        }),
        { kind: 'method_not_allowed' },
      );
      assert.deepEqual(
        decideWalkthroughBoundary({
          pathname: '/inicio',
          method,
          authenticated: true,
          evaluatorAllowed: true,
        }),
        { kind: 'method_not_allowed' },
      );
    }

    assert.deepEqual(
      decideWalkthroughBoundary({
        pathname: '/evaluacion',
        method: 'GET',
        authenticated: true,
        evaluatorAllowed: true,
      }),
      { kind: 'next' },
    );
    assert.deepEqual(
      decideWalkthroughBoundary({
        pathname: '/evaluacion',
        method: 'HEAD',
        authenticated: true,
        evaluatorAllowed: true,
      }),
      { kind: 'next' },
    );

    // Auth mutation paths remain usable.
    assert.deepEqual(
      decideWalkthroughBoundary({
        pathname: '/login',
        method: 'POST',
        authenticated: false,
        evaluatorAllowed: false,
      }),
      { kind: 'next' },
    );
    assert.deepEqual(
      decideWalkthroughBoundary({
        pathname: '/auth/sign-out',
        method: 'POST',
        authenticated: true,
        evaluatorAllowed: true,
      }),
      { kind: 'next' },
    );
    assert.deepEqual(
      decideWalkthroughBoundary({
        pathname: '/auth/forgot-password',
        method: 'POST',
        authenticated: false,
        evaluatorAllowed: false,
      }),
      { kind: 'next' },
    );

    // Safe GET to ops redirects (not a write replay).
    assert.deepEqual(
      decideWalkthroughBoundary({
        pathname: '/clientes',
        method: 'GET',
        authenticated: true,
        evaluatorAllowed: true,
      }),
      { kind: 'redirect', location: '/evaluacion?motivo=recorrido' },
    );

    // Unauthenticated login redirect never includes next.
    assert.deepEqual(
      decideWalkthroughBoundary({
        pathname: '/clientes',
        method: 'GET',
        authenticated: false,
        evaluatorAllowed: false,
      }),
      { kind: 'login_redirect', includeNext: false },
    );
  });

  it('5) dotted operational-looking paths are not static passthrough', () => {
    assert.equal(isFrameworkOrStaticAssetPath('/_next/static/chunk.js'), true);
    assert.equal(isFrameworkOrStaticAssetPath('/favicon.ico'), true);
    assert.equal(isFrameworkOrStaticAssetPath('/robots.txt'), true);
    assert.equal(isFrameworkOrStaticAssetPath('/clientes.json'), false);
    assert.equal(isFrameworkOrStaticAssetPath('/inicio.backup'), false);
    assert.equal(isFrameworkOrStaticAssetPath('/api/quotes/x.pdf'), false);
    assert.equal(isOperationalProductPath('/clientes.json'), true);
    assert.equal(isOperationalProductPath('/inicio.backup'), true);

    assert.deepEqual(
      decideWalkthroughBoundary({
        pathname: '/clientes.json',
        method: 'GET',
        authenticated: true,
        evaluatorAllowed: true,
      }),
      { kind: 'redirect', location: '/evaluacion?motivo=recorrido' },
    );
    assert.deepEqual(
      decideWalkthroughBoundary({
        pathname: '/clientes.json',
        method: 'POST',
        authenticated: true,
        evaluatorAllowed: true,
      }),
      { kind: 'method_not_allowed' },
    );

    const middleware = readFileSync(join(process.cwd(), 'middleware.ts'), 'utf8');
    assert.doesNotMatch(middleware, /pathname\.includes\('\.'\)/);
    assert.match(middleware, /isFrameworkOrStaticAssetPath/);
    assert.match(middleware, /decideWalkthroughBoundary/);
  });
});
