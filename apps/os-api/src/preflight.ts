import { validateOsApiEnvironment, OsEnvValidationError } from './env-validation';
import { pingDatabase } from './readiness';

async function main(): Promise<number> {
  try {
    const env = validateOsApiEnvironment();
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        ok: true,
        profile: env.profile,
        authMode: env.authMode,
        database: env.databaseConfigured ? 'configured' : 'not_configured',
        outboxWorker: env.outboxWorkerEnabled ? 'enabled' : 'disabled',
        devBootstrap: env.devBootstrapEnabled ? 'enabled' : 'disabled',
      }),
    );

    if (env.devBootstrapEnabled) {
      // eslint-disable-next-line no-console
      console.warn('WARN: dev bootstrap is enabled — not suitable for staging/production');
    }

    if (env.databaseConfigured) {
      const reachable = await pingDatabase();
      if (!reachable) {
        // eslint-disable-next-line no-console
        console.error(JSON.stringify({ ok: false, reason: 'database_unreachable' }));
        return 1;
      }
      // eslint-disable-next-line no-console
      console.log(JSON.stringify({ ok: true, check: 'database_reachable' }));
    } else if (env.profile !== 'development') {
      // eslint-disable-next-line no-console
      console.error(JSON.stringify({ ok: false, reason: 'database_required' }));
      return 1;
    }

    return 0;
  } catch (err) {
    const message =
      err instanceof OsEnvValidationError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'preflight_failed';
    // eslint-disable-next-line no-console
    console.error(JSON.stringify({ ok: false, reason: message }));
    return 1;
  }
}

void main().then((code) => process.exit(code));
