import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import {
  validateOsApiEnvironment,
  OsEnvValidationError,
  isDevBootstrapEnabled,
  resetValidatedOsEnvCacheForTests,
  resolveListenPort,
} from './env-validation';

const ROOT = path.resolve(__dirname, '..');
const MAIN = path.join(ROOT, 'src/main.ts');

type EnvPatch = Record<string, string | undefined>;

function saveEnv(): NodeJS.ProcessEnv {
  return { ...process.env };
}

function applyEnv(patch: EnvPatch): void {
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

function restoreEnv(saved: NodeJS.ProcessEnv): void {
  for (const key of Object.keys(process.env)) {
    if (!(key in saved)) {
      delete process.env[key];
    }
  }
  Object.assign(process.env, saved);
}

describe('env-validation', () => {
  let saved: NodeJS.ProcessEnv;

  beforeEach(() => {
    saved = saveEnv();
    resetValidatedOsEnvCacheForTests();
  });

  afterEach(() => {
    restoreEnv(saved);
    resetValidatedOsEnvCacheForTests();
  });

  it('accepts valid development dev config', () => {
    applyEnv({
      NODE_ENV: 'development',
      OS_RUNTIME_PROFILE: 'development',
      OS_AUTH_MODE: 'dev',
      OS_DATABASE_URL: undefined,
      DATABASE_URL: undefined,
    });
    const env = validateOsApiEnvironment();
    assert.equal(env.profile, 'development');
    assert.equal(env.authMode, 'dev');
    assert.equal(env.devBootstrapEnabled, true);
    assert.equal(env.attentionClockEnabled, true);
  });

  it('accepts valid production-like supabase config', () => {
    applyEnv({
      NODE_ENV: 'production',
      OS_RUNTIME_PROFILE: 'staging',
      OS_AUTH_MODE: 'supabase',
      OS_DATABASE_URL: 'postgresql://isalwa:isalwa@localhost:5432/isalwa',
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_ANON_KEY: 'anon-key-example',
      OS_CORS_ORIGINS: 'https://app.staging.example',
    });
    const env = validateOsApiEnvironment();
    assert.equal(env.profile, 'staging');
    assert.equal(env.authMode, 'supabase');
    assert.equal(env.devBootstrapEnabled, false);
    assert.deepEqual(env.corsOrigins, ['https://app.staging.example']);
  });

  it('defaults CORS to localhost in development when unset', () => {
    applyEnv({
      NODE_ENV: 'development',
      OS_RUNTIME_PROFILE: 'development',
      OS_AUTH_MODE: 'dev',
      OS_CORS_ORIGINS: undefined,
    });
    const env = validateOsApiEnvironment();
    assert.deepEqual(env.corsOrigins, ['http://localhost:3200']);
  });

  it('rejects missing OS_CORS_ORIGINS on staging', () => {
    applyEnv({
      NODE_ENV: 'production',
      OS_RUNTIME_PROFILE: 'staging',
      OS_AUTH_MODE: 'supabase',
      OS_DATABASE_URL: 'postgresql://isalwa:isalwa@localhost:5432/isalwa',
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_ANON_KEY: 'anon-key',
      OS_CORS_ORIGINS: undefined,
    });
    assert.throws(() => validateOsApiEnvironment(), /OS_CORS_ORIGINS is required/);
  });

  it('rejects wildcard OS_CORS_ORIGINS', () => {
    applyEnv({
      NODE_ENV: 'production',
      OS_RUNTIME_PROFILE: 'staging',
      OS_AUTH_MODE: 'supabase',
      OS_DATABASE_URL: 'postgresql://isalwa:isalwa@localhost:5432/isalwa',
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_ANON_KEY: 'anon-key',
      OS_CORS_ORIGINS: '*',
    });
    assert.throws(() => validateOsApiEnvironment(), /wildcard/);
  });

  it('resolveListenPort prefers PORT over OS_API_PORT', () => {
    applyEnv({ PORT: '8080', OS_API_PORT: '4001' });
    assert.equal(resolveListenPort(), 8080);
  });

  it('resolveListenPort falls back to OS_API_PORT then 4001', () => {
    applyEnv({ PORT: undefined, OS_API_PORT: '4100' });
    assert.equal(resolveListenPort(), 4100);
    applyEnv({ PORT: undefined, OS_API_PORT: undefined });
    assert.equal(resolveListenPort(), 4001);
  });

  it('rejects invalid OS_AUTH_MODE', () => {
    applyEnv({
      OS_RUNTIME_PROFILE: 'development',
      OS_AUTH_MODE: 'oauth-typo',
    });
    assert.throws(() => validateOsApiEnvironment(), OsEnvValidationError);
  });

  it('rejects dev auth on staging profile', () => {
    applyEnv({
      OS_RUNTIME_PROFILE: 'staging',
      OS_AUTH_MODE: 'dev',
      OS_DATABASE_URL: 'postgresql://isalwa:isalwa@localhost:5432/isalwa',
    });
    assert.throws(
      () => validateOsApiEnvironment(),
      (err: unknown) =>
        err instanceof OsEnvValidationError &&
        err.message.includes('OS_AUTH_MODE=dev is forbidden'),
    );
  });

  it('rejects missing OS_DATABASE_URL on staging', () => {
    applyEnv({
      OS_RUNTIME_PROFILE: 'staging',
      OS_AUTH_MODE: 'supabase',
      OS_DATABASE_URL: undefined,
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_ANON_KEY: 'anon-key-example',
    });
    assert.throws(
      () => validateOsApiEnvironment(),
      (err: unknown) =>
        err instanceof OsEnvValidationError &&
        err.message.includes('OS_DATABASE_URL is required'),
    );
  });

  it('rejects missing Supabase config in supabase mode', () => {
    applyEnv({
      OS_RUNTIME_PROFILE: 'development',
      OS_AUTH_MODE: 'supabase',
      OS_DATABASE_URL: 'postgresql://isalwa:isalwa@localhost:5432/isalwa',
      SUPABASE_URL: undefined,
      SUPABASE_ANON_KEY: undefined,
    });
    assert.throws(
      () => validateOsApiEnvironment(),
      (err: unknown) =>
        err instanceof OsEnvValidationError &&
        err.message.includes('SUPABASE_URL is required'),
    );
  });

  it('does not fall back to legacy DATABASE_URL for staging', () => {
    applyEnv({
      OS_RUNTIME_PROFILE: 'staging',
      OS_AUTH_MODE: 'supabase',
      OS_DATABASE_URL: undefined,
      DATABASE_URL: 'postgresql://legacy:secret@localhost:5432/legacy',
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_ANON_KEY: 'anon-key-example',
    });
    assert.throws(
      () => validateOsApiEnvironment(),
      (err: unknown) =>
        err instanceof OsEnvValidationError &&
        err.message.includes('OS_DATABASE_URL must be set explicitly'),
    );
  });

  it('never includes secrets in validation errors', () => {
    applyEnv({
      OS_RUNTIME_PROFILE: 'staging',
      OS_AUTH_MODE: 'supabase',
      OS_DATABASE_URL: 'postgresql://isalwa:TOPSECRET@localhost:5432/isalwa',
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_ANON_KEY: undefined,
    });
    try {
      validateOsApiEnvironment();
      assert.fail('expected validation error');
    } catch (err) {
      assert.ok(err instanceof OsEnvValidationError);
      assert.doesNotMatch(err.message, /TOPSECRET/);
      assert.doesNotMatch(err.message, /postgresql:\/\//);
    }
  });

  it('blocks dev bootstrap outside development profile', () => {
    applyEnv({
      OS_RUNTIME_PROFILE: 'production',
      OS_AUTH_MODE: 'supabase',
    });
    assert.equal(isDevBootstrapEnabled(), false);
  });

  it('fresh process disables dev routes for staging profile', () => {
    const result = spawnSync('node', ['--import', 'tsx', path.join(ROOT, 'src/dev-routes-smoke.ts')], {
      cwd: ROOT,
      env: {
        ...process.env,
        OS_RUNTIME_PROFILE: 'staging',
        OS_AUTH_MODE: 'supabase',
        OS_DATABASE_URL: 'postgresql://isalwa:isalwa@localhost:5432/isalwa',
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_ANON_KEY: 'anon-key-example',
        OS_CORS_ORIGINS: 'https://isalwa-demo.vercel.app',
      },
      encoding: 'utf8',
      timeout: 10_000,
    });
    assert.equal(result.status, 0, result.stderr);
  });
});

describe('startup fail-closed', () => {
  it('main.ts exits on invalid auth mode without leaking secrets', () => {
    const result = spawnSync(
      'node',
      ['--import', 'tsx', MAIN],
      {
        cwd: ROOT,
        env: {
          ...process.env,
          OS_RUNTIME_PROFILE: 'production',
          OS_AUTH_MODE: 'dev',
          OS_DATABASE_URL: 'postgresql://isalwa:SECRET@localhost:5432/isalwa',
          NODE_ENV: 'production',
        },
        encoding: 'utf8',
        timeout: 10_000,
      },
    );

    assert.notEqual(result.status, 0);
    const output = `${result.stdout}${result.stderr}`;
    assert.match(output, /OS_ENV_VALIDATION_FAILED|OS_AUTH_MODE=dev is forbidden/);
    assert.doesNotMatch(output, /SECRET/);
  });
});
