export type OsRuntimeProfile = 'development' | 'staging' | 'production';

export function getRuntimeProfile(): OsRuntimeProfile {
  const explicit = process.env.OS_RUNTIME_PROFILE?.trim().toLowerCase();
  if (explicit === 'development' || explicit === 'staging' || explicit === 'production') {
    return explicit;
  }
  if (process.env.NODE_ENV === 'production') return 'production';
  return 'development';
}

/**
 * Staging-only QA control center. Production is always disabled even if env is mis-set.
 */
export function isQaControlEnabled(): boolean {
  if (getRuntimeProfile() !== 'staging') return false;
  return process.env.OS_QA_CONTROL_ENABLED?.trim() === 'true';
}
