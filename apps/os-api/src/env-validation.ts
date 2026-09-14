/**
 * Canonical os-api environment validation — provider-neutral, fail-closed.
 * Never include secret values in error messages.
 */

export type OsRuntimeProfile = 'development' | 'staging' | 'production';
export type OsAuthMode = 'dev' | 'supabase';

export class OsEnvValidationError extends Error {
  readonly code = 'OS_ENV_VALIDATION_FAILED';

  constructor(message: string) {
    super(message);
    this.name = 'OsEnvValidationError';
  }
}

export function getRuntimeProfile(): OsRuntimeProfile {
  const explicit = process.env.OS_RUNTIME_PROFILE?.trim().toLowerCase();
  if (explicit === 'development' || explicit === 'staging' || explicit === 'production') {
    return explicit;
  }
  if (process.env.NODE_ENV === 'production') {
    return 'production';
  }
  return 'development';
}

function parseAuthModeRaw(): string | undefined {
  return process.env.OS_AUTH_MODE?.trim().toLowerCase();
}

/** Whether /v1/dev/* routes may be registered. Does not throw. */
export function isDevBootstrapEnabled(): boolean {
  if (getRuntimeProfile() !== 'development') {
    return false;
  }
  const raw = parseAuthModeRaw();
  if (raw && raw !== 'dev') {
    return false;
  }
  return true;
}

export function isOutboxWorkerEnabled(): boolean {
  return !(
    process.env.OS_OUTBOX_WORKER === '0' ||
    process.env.OS_PROJECTION_WORKER === '0'
  );
}

/** Wall-clock overdue refresh. Independent of the outbox worker. Default on. */
export function isAttentionClockEnabled(): boolean {
  return process.env.OS_ATTENTION_CLOCK !== '0';
}

function assertPostgresUrl(name: string, value: string): void {
  try {
    const url = new URL(value);
    if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
      throw new OsEnvValidationError(`${name} must use the postgresql:// scheme`);
    }
    if (!url.hostname) {
      throw new OsEnvValidationError(`${name} must include a database host`);
    }
  } catch (err) {
    if (err instanceof OsEnvValidationError) {
      throw err;
    }
    throw new OsEnvValidationError(`${name} is not a valid PostgreSQL connection URL`);
  }
}

function resolveAuthMode(profile: OsRuntimeProfile): OsAuthMode {
  const raw = parseAuthModeRaw();
  if (!raw) {
    if (profile === 'development') {
      return 'dev';
    }
    throw new OsEnvValidationError(
      'OS_AUTH_MODE is required for staging and production (must be "supabase")',
    );
  }
  if (raw !== 'dev' && raw !== 'supabase') {
    throw new OsEnvValidationError('OS_AUTH_MODE must be "dev" or "supabase"');
  }
  return raw;
}

export type ValidatedOsEnv = {
  profile: OsRuntimeProfile;
  authMode: OsAuthMode;
  databaseConfigured: boolean;
  outboxWorkerEnabled: boolean;
  attentionClockEnabled: boolean;
  devBootstrapEnabled: boolean;
  /** Exact CORS allowlist origins (empty only allowed in development). */
  corsOrigins: string[];
};

/**
 * Parse OS_CORS_ORIGINS as a comma-separated exact-origin allowlist.
 * Staging/production require a non-empty list. Development may omit (defaults to localhost:3200).
 */
export function parseCorsOrigins(
  profile: OsRuntimeProfile,
  raw: string | undefined = process.env.OS_CORS_ORIGINS,
): string[] {
  const trimmed = raw?.trim();
  if (!trimmed) {
    if (profile === 'development') {
      return ['http://localhost:3200'];
    }
    throw new OsEnvValidationError(
      'OS_CORS_ORIGINS is required for staging and production (comma-separated exact origins; no wildcard)',
    );
  }
  const origins = trimmed
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  if (origins.length === 0) {
    throw new OsEnvValidationError('OS_CORS_ORIGINS must list at least one origin');
  }
  for (const origin of origins) {
    if (origin === '*' || origin.includes('*')) {
      throw new OsEnvValidationError('OS_CORS_ORIGINS must not include wildcards');
    }
    try {
      const u = new URL(origin);
      if (u.origin !== origin) {
        throw new OsEnvValidationError(
          'OS_CORS_ORIGINS entries must be exact origins (scheme + host + optional port)',
        );
      }
    } catch (err) {
      if (err instanceof OsEnvValidationError) throw err;
      throw new OsEnvValidationError('OS_CORS_ORIGINS contains an invalid origin URL');
    }
  }
  return origins;
}

/** Listen port: host PORT (Render/etc.) wins, else OS_API_PORT, else 4001. */
export function resolveListenPort(): number {
  const fromHost = process.env.PORT?.trim();
  const fromOs = process.env.OS_API_PORT?.trim();
  const raw = fromHost || fromOs || '4001';
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new OsEnvValidationError('PORT / OS_API_PORT must be a valid TCP port');
  }
  return port;
}

let cachedEnv: ValidatedOsEnv | null = null;

/** Test-only cache reset. */
export function resetValidatedOsEnvCacheForTests(): void {
  cachedEnv = null;
}

export function getValidatedOsEnv(): ValidatedOsEnv {
  if (!cachedEnv) {
    cachedEnv = validateOsApiEnvironment();
  }
  return cachedEnv;
}

export function validateOsApiEnvironment(): ValidatedOsEnv {
  const profile = getRuntimeProfile();
  const authMode = resolveAuthMode(profile);
  const dbUrl = process.env.OS_DATABASE_URL?.trim();
  const legacyDbUrl = process.env.DATABASE_URL?.trim();

  if (profile !== 'development' && authMode === 'dev') {
    throw new OsEnvValidationError(
      'OS_AUTH_MODE=dev is forbidden when OS_RUNTIME_PROFILE is staging or production',
    );
  }

  if (profile !== 'development' && authMode !== 'supabase') {
    throw new OsEnvValidationError('OS_AUTH_MODE must be supabase for staging and production');
  }

  if (!dbUrl && legacyDbUrl && profile !== 'development') {
    throw new OsEnvValidationError(
      'OS_DATABASE_URL must be set explicitly; legacy DATABASE_URL is not used by os-api',
    );
  }

  if (profile !== 'development' && !dbUrl) {
    throw new OsEnvValidationError('OS_DATABASE_URL is required for staging and production');
  }

  if (dbUrl) {
    assertPostgresUrl('OS_DATABASE_URL', dbUrl);
  }

  if (authMode === 'supabase') {
    const supabaseUrl = process.env.SUPABASE_URL?.trim();
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY?.trim();
    if (!supabaseUrl) {
      throw new OsEnvValidationError('SUPABASE_URL is required when OS_AUTH_MODE=supabase');
    }
    if (!supabaseAnonKey) {
      throw new OsEnvValidationError('SUPABASE_ANON_KEY is required when OS_AUTH_MODE=supabase');
    }
    try {
      new URL(supabaseUrl);
    } catch {
      throw new OsEnvValidationError('SUPABASE_URL is not a valid URL');
    }
  }

  const corsOrigins = parseCorsOrigins(profile);

  const validated: ValidatedOsEnv = {
    profile,
    authMode,
    databaseConfigured: Boolean(dbUrl),
    outboxWorkerEnabled: isOutboxWorkerEnabled(),
    attentionClockEnabled: isAttentionClockEnabled(),
    devBootstrapEnabled: isDevBootstrapEnabled(),
    corsOrigins,
  };

  cachedEnv = validated;
  return validated;
}

/** Safe public snapshot for health/readiness — no secrets. */
export function getPublicRuntimeSnapshot(): Pick<
  ValidatedOsEnv,
  | 'profile'
  | 'authMode'
  | 'databaseConfigured'
  | 'outboxWorkerEnabled'
  | 'attentionClockEnabled'
  | 'devBootstrapEnabled'
> {
  const env = getValidatedOsEnv();
  return {
    profile: env.profile,
    authMode: env.authMode,
    databaseConfigured: env.databaseConfigured,
    outboxWorkerEnabled: env.outboxWorkerEnabled,
    attentionClockEnabled: env.attentionClockEnabled,
    devBootstrapEnabled: env.devBootstrapEnabled,
  };
}
