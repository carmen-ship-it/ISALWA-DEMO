/**
 * In-memory AI rate / concurrency limiter for pilot staging.
 * Process-local: sufficient for single-instance staging; not a distributed store.
 */

export type AiRateLimitConfig = {
  memberRatePerMinute: number;
  memberRatePerHour: number;
  orgRatePerDay: number;
  memberMaxConcurrency: number;
  orgMaxConcurrency: number;
};

export type AiRateLimitDenial =
  | 'AI_RATE_MEMBER_MINUTE'
  | 'AI_RATE_MEMBER_HOUR'
  | 'AI_RATE_ORG_DAY'
  | 'AI_CONCURRENCY_MEMBER'
  | 'AI_CONCURRENCY_ORG';

type WindowBucket = { timestamps: number[] };

function prune(bucket: WindowBucket, now: number, windowMs: number): void {
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);
}

export class AiRateLimiter {
  private readonly memberMinute = new Map<string, WindowBucket>();
  private readonly memberHour = new Map<string, WindowBucket>();
  private readonly orgDay = new Map<string, WindowBucket>();
  private readonly memberInFlight = new Map<string, number>();
  private readonly orgInFlight = new Map<string, number>();

  constructor(private readonly config: AiRateLimitConfig) {}

  tryAcquire(organizationId: string, memberId: string, now = Date.now()): AiRateLimitDenial | null {
    const memberKey = `${organizationId}:${memberId}`;
    const memberConc = this.memberInFlight.get(memberKey) ?? 0;
    if (memberConc >= this.config.memberMaxConcurrency) return 'AI_CONCURRENCY_MEMBER';
    const orgConc = this.orgInFlight.get(organizationId) ?? 0;
    if (orgConc >= this.config.orgMaxConcurrency) return 'AI_CONCURRENCY_ORG';

    const minute = this.memberMinute.get(memberKey) ?? { timestamps: [] };
    prune(minute, now, 60_000);
    if (minute.timestamps.length >= this.config.memberRatePerMinute) return 'AI_RATE_MEMBER_MINUTE';

    const hour = this.memberHour.get(memberKey) ?? { timestamps: [] };
    prune(hour, now, 3_600_000);
    if (hour.timestamps.length >= this.config.memberRatePerHour) return 'AI_RATE_MEMBER_HOUR';

    const day = this.orgDay.get(organizationId) ?? { timestamps: [] };
    prune(day, now, 86_400_000);
    if (day.timestamps.length >= this.config.orgRatePerDay) return 'AI_RATE_ORG_DAY';

    minute.timestamps.push(now);
    hour.timestamps.push(now);
    day.timestamps.push(now);
    this.memberMinute.set(memberKey, minute);
    this.memberHour.set(memberKey, hour);
    this.orgDay.set(organizationId, day);
    this.memberInFlight.set(memberKey, memberConc + 1);
    this.orgInFlight.set(organizationId, orgConc + 1);
    return null;
  }

  release(organizationId: string, memberId: string): void {
    const memberKey = `${organizationId}:${memberId}`;
    const memberConc = this.memberInFlight.get(memberKey) ?? 0;
    if (memberConc <= 1) this.memberInFlight.delete(memberKey);
    else this.memberInFlight.set(memberKey, memberConc - 1);
    const orgConc = this.orgInFlight.get(organizationId) ?? 0;
    if (orgConc <= 1) this.orgInFlight.delete(organizationId);
    else this.orgInFlight.set(organizationId, orgConc - 1);
  }

  /** Test helper — clears all windows. */
  reset(): void {
    this.memberMinute.clear();
    this.memberHour.clear();
    this.orgDay.clear();
    this.memberInFlight.clear();
    this.orgInFlight.clear();
  }
}
