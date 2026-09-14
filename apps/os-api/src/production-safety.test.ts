import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { NotFoundException } from '@nestjs/common';
import {
  validateOsApiEnvironment,
  resetValidatedOsEnvCacheForTests,
} from './env-validation';
import { BootstrapController } from './bootstrap.controller';

function saveEnv(): NodeJS.ProcessEnv {
  return { ...process.env };
}

function applyEnv(patch: Record<string, string | undefined>): void {
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

describe('production safety runtime', () => {
  let savedEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    savedEnv = saveEnv();
    resetValidatedOsEnvCacheForTests();
  });

  afterEach(() => {
    restoreEnv(savedEnv);
    resetValidatedOsEnvCacheForTests();
  });

  it('bootstrap controller returns 404 when dev bootstrap disabled', async () => {
    applyEnv({
      OS_RUNTIME_PROFILE: 'staging',
      OS_AUTH_MODE: 'supabase',
      OS_DATABASE_URL: 'postgresql://isalwa:isalwa@localhost:5432/isalwa',
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_ANON_KEY: 'anon-key-example',
      OS_CORS_ORIGINS: 'https://isalwa-demo.vercel.app',
    });
    validateOsApiEnvironment();

    const controller = new BootstrapController({
      seedOrganization: async () => ({ id: 'org' }),
      seedAdminMember: async () => ({
        member: { id: 'm' },
        person: { id: 'p' },
        auth: { id: 'a' },
      }),
    } as never);

    await assert.rejects(() => controller.bootstrap(), NotFoundException);
    await assert.rejects(() => controller.status(), NotFoundException);
  });
});

describe('health controller', () => {
  let savedEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    savedEnv = saveEnv();
    resetValidatedOsEnvCacheForTests();
    applyEnv({
      OS_RUNTIME_PROFILE: 'development',
      OS_AUTH_MODE: 'dev',
      OS_DATABASE_URL: 'postgresql://isalwa:isalwa@localhost:5432/isalwa',
    });
    validateOsApiEnvironment();
  });

  afterEach(() => {
    restoreEnv(savedEnv);
    resetValidatedOsEnvCacheForTests();
  });

  it('liveness returns ok without dependency checks', async () => {
    const { HealthController } = await import('./health.controller');
    const controller = new HealthController(
      {
        getState: () => ({ running: false, lastRunAt: null }),
        getHealth: async () => ({ backlog: { pending: 0 } }),
      } as never,
      { getState: () => ({ running: false, lastRunAt: null, lastError: null, lastRun: null, lastSuccessAt: null }) } as never,
    );
    const body = controller.liveness();
    assert.equal(body.status, 'ok');
    assert.equal(body.check, 'liveness');
  });

  it('readiness returns not_ready when database is unreachable', async () => {
    applyEnv({
      OS_RUNTIME_PROFILE: 'staging',
      OS_AUTH_MODE: 'supabase',
      OS_DATABASE_URL: 'postgresql://isalwa:isalwa@127.0.0.1:59999/isalwa_unreachable',
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_ANON_KEY: 'anon-key-example',
      OS_OUTBOX_WORKER: '0',
      OS_ATTENTION_CLOCK: '0',
      OS_CORS_ORIGINS: 'https://isalwa-demo.vercel.app',
    });
    resetValidatedOsEnvCacheForTests();
    validateOsApiEnvironment();

    const { HealthController } = await import('./health.controller');
    const controller = new HealthController(
      {
        getState: () => ({ running: false, lastRunAt: null }),
        getHealth: async () => ({ backlog: { pending: 0 } }),
      } as never,
      { getState: () => ({ running: false, lastRunAt: null, lastError: null, lastRun: null, lastSuccessAt: null }) } as never,
    );

    const res = {
      statusCode: 200,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
    };

    const body = await controller.readiness(res as never);
    assert.equal(body.status, 'not_ready');
    assert.equal(body.check, 'readiness');
    assert.equal(res.statusCode, 503);
    assert.equal(body.checks.some((c: { name: string; ok: boolean }) => c.name === 'database' && !c.ok), true);
  });
});

describe('os-session auth mode safety', () => {
  it('ignores dev headers when auth mode is supabase', async () => {
    applyEnv({
      OS_RUNTIME_PROFILE: 'development',
      OS_AUTH_MODE: 'supabase',
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_ANON_KEY: 'anon-key-example',
    });
    validateOsApiEnvironment();

    const { resolveSession } = await import('./os-session');
    const store = {
      getMemberInOrg: async () => ({ personId: 'p1' }),
      findAuthIdentityById: async () => ({ personId: 'p1' }),
    };

    await assert.rejects(
      () =>
        resolveSession(
          {
            header: (name: string) => {
              const headers: Record<string, string> = {
                'x-os-organization-id': 'org',
                'x-os-member-id': 'member',
                'x-os-person-id': 'p1',
                'x-os-auth-identity-id': 'auth',
              };
              return headers[name.toLowerCase()];
            },
          } as never,
          store as never,
        ),
      /AUTH_REQUIRED/,
    );
  });
});
