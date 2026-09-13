import type { OsErrorCode } from '@isalwa/os-contracts';

export class QueryError extends Error {
  constructor(
    readonly code: OsErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'QueryError';
  }
}

export function toQueryError(err: unknown): QueryError {
  if (err instanceof QueryError) return err;
  const code = err instanceof Error ? err.message : 'INTERNAL_ERROR';
  const known = [
    'TENANT_FORBIDDEN',
    'AUTH_REQUIRED',
    'ACCESS_REVOKED',
    'PERMISSION_DENIED',
    'NOT_FOUND',
    'VALIDATION_FAILED',
  ] as const;
  if ((known as readonly string[]).includes(code)) {
    return new QueryError(code as OsErrorCode);
  }
  return new QueryError('VALIDATION_FAILED', code);
}
