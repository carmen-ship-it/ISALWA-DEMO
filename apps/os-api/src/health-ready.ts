import type { ValidatedOsEnv } from './env-validation';

const SERVICE_UNAVAILABLE = 503;

type ReadinessRuntime = Pick<
  ValidatedOsEnv,
  | 'profile'
  | 'authMode'
  | 'databaseConfigured'
  | 'outboxWorkerEnabled'
  | 'attentionClockEnabled'
  | 'devBootstrapEnabled'
>;

type ReadinessClockState = {
  running: boolean;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  lastRun?: { refreshedOrganizations?: number; organizationIds?: string[] } | null;
};

/**
 * Unauthenticated readiness. A missing session must not run a global outbox
 * count. This function does not accept an organizationId query parameter.
 */
export async function buildUnauthenticatedReadiness(input: {
  runtime: ReadinessRuntime;
  databaseReachable: boolean | null;
  session: null;
  outboxHost: {
    getState(): { running: boolean };
    getHealth?: (organizationId?: string) => Promise<unknown>;
  };
  attentionClock: { getState(): ReadinessClockState };
  setStatus(code: number): void;
}) {
  const { runtime } = input;
  const checks: Array<{ name: string; ok: boolean; detail?: string }> = [];

  if (runtime.databaseConfigured) {
    checks.push({ name: 'database', ok: input.databaseReachable === true });
  } else if (runtime.profile !== 'development') {
    checks.push({ name: 'database', ok: false, detail: 'not_configured' });
  }

  const worker = input.outboxHost.getState();
  if (runtime.databaseConfigured && runtime.outboxWorkerEnabled) {
    checks.push({
      name: 'outboxWorker',
      ok: worker.running,
      detail: worker.running ? 'running' : 'not_running',
    });
  }

  const clock = input.attentionClock.getState();
  if (runtime.databaseConfigured && runtime.attentionClockEnabled) {
    checks.push({
      name: 'attentionClock',
      ok: clock.running,
      detail: clock.running ? 'running' : 'not_running',
    });
  }

  const failedRequired = checks.some((check) => !check.ok);
  if (failedRequired) {
    input.setStatus(SERVICE_UNAVAILABLE);
  }

  // No authenticated session on this route. Do not call getHealth() — that
  // query is global when organizationId is omitted and leaks other tenants.
  const pending: number | null = null;
  if (input.session !== null) {
    throw new Error('UNAUTHENTICATED_READY_HAS_NO_SESSION');
  }

  return {
    status: failedRequired ? 'not_ready' : 'ready',
    service: 'os-api',
    check: 'readiness',
    runtime: {
      profile: runtime.profile,
      authMode: runtime.authMode,
      devBootstrapEnabled: runtime.devBootstrapEnabled,
    },
    checks,
    outboxWorker: runtime.databaseConfigured
      ? {
          enabled: runtime.outboxWorkerEnabled,
          pending,
        }
      : undefined,
    attentionClock: runtime.databaseConfigured
      ? {
          enabled: runtime.attentionClockEnabled,
          running: clock.running,
          lastRunAt: clock.lastRunAt,
          lastSuccessAt: clock.lastSuccessAt,
          lastError: clock.lastError,
          lastRefreshedOrganizations: null,
        }
      : undefined,
  };
}
