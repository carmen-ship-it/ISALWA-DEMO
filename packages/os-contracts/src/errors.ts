import { z } from 'zod';

export const OS_ERROR_CODES = [
  'TENANT_FORBIDDEN',
  'AUTH_REQUIRED',
  'ACCESS_REVOKED',
  'PERMISSION_DENIED',
  'GOVERNANCE_REQUIRED',
  'CAPABILITY_LOCKED',
  'VALIDATION_FAILED',
  'CONFLICT',
  'IDEMPOTENCY_REPLAY',
  'NOT_FOUND',
] as const;

export type OsErrorCode = (typeof OS_ERROR_CODES)[number];

export const OsApiErrorSchema = z.object({
  error: z.object({
    code: z.enum(OS_ERROR_CODES as unknown as [OsErrorCode, ...OsErrorCode[]]),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
    requestId: z.string(),
  }),
});

export type OsApiError = z.infer<typeof OsApiErrorSchema>;
