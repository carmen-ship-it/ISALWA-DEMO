import { Inject, Injectable, type NestMiddleware } from '@nestjs/common';
import {
  attachCanonicalTrustedSession,
  resolveCanonicalRequestContext,
  type CanonicalRequest,
  type CanonicalSessionStore,
} from '@isalwa/os-request-session';

export const CANONICAL_SESSION_STORE = Symbol('CANONICAL_SESSION_STORE');

/**
 * Production apps/api attachment. Nest bootstrap registers this class.
 * It does not read client organization or scope claims as authority.
 * A denial clears any pre-set authenticatedSession so a test or client
 * cannot leave a stronger context than this resolver produced.
 */
export async function attachResolvedCanonicalSession(
  req: CanonicalRequest,
  store: CanonicalSessionStore,
): Promise<void> {
  try {
    const result = await resolveCanonicalRequestContext(req, store);
    attachCanonicalTrustedSession(req, result);
  } catch {
    attachCanonicalTrustedSession(req, { ok: false, denial: 'AUTH_REQUIRED' });
  }
}

export function applyCanonicalSessionMiddleware(consumer: {
  apply: (...handlers: unknown[]) => { forRoutes: (path: string) => unknown };
}): void {
  consumer.apply(CanonicalSessionMiddleware).forRoutes('*');
}

@Injectable()
export class CanonicalSessionMiddleware implements NestMiddleware {
  constructor(
    @Inject(CANONICAL_SESSION_STORE) private readonly store: CanonicalSessionStore,
  ) {}

  async use(req: CanonicalRequest, _res: unknown, next: (err?: unknown) => void): Promise<void> {
    await attachResolvedCanonicalSession(req, this.store);
    next();
  }
}
