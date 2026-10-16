import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Shared request limits (V2 §18.1). Counted per authenticated member (and per
 * organization for invitations) in Postgres, so all API instances agree.
 * Limits are engineering defaults sized well above normal staff use.
 */
export const REQUEST_RATE_LIMITS = {
  search: { windowMs: 60_000, perMember: 120 },
  command: { windowMs: 60_000, perMember: 120 },
  invitation: { windowMs: 3_600_000, perMember: 20, perOrganizationPerDay: 100 },
} as const;

export type RequestRateLimitRule = keyof typeof REQUEST_RATE_LIMITS;

export interface RateLimitCounter {
  hit(input: {
    organizationId: string;
    bucketKey: string;
    windowMs: number;
    now?: Date;
  }): Promise<{ count: number; resetAt: Date }>;
}

/** Same body for every actor: never says who or which limit. */
function limited(resetAt: Date, now: number): HttpException {
  return new HttpException(
    {
      code: 'RATE_LIMITED',
      retryAfterSeconds: Math.max(1, Math.ceil((resetAt.getTime() - now) / 1000)),
    },
    HttpStatus.TOO_MANY_REQUESTS,
  );
}

export async function enforceRequestRateLimit(
  counter: RateLimitCounter,
  rule: RequestRateLimitRule,
  session: { organizationId: string; actorMemberId: string },
  now = new Date(),
): Promise<void> {
  const config = REQUEST_RATE_LIMITS[rule];
  const member = await counter.hit({
    organizationId: session.organizationId,
    bucketKey: `${rule}:member:${session.actorMemberId}`,
    windowMs: config.windowMs,
    now,
  });
  if (member.count > config.perMember) throw limited(member.resetAt, now.getTime());

  if (rule === 'invitation') {
    const org = await counter.hit({
      organizationId: session.organizationId,
      bucketKey: 'invitation:organization',
      windowMs: 86_400_000,
      now,
    });
    if (org.count > REQUEST_RATE_LIMITS.invitation.perOrganizationPerDay) {
      throw limited(org.resetAt, now.getTime());
    }
  }
}
