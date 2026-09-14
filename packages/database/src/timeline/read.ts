import { eventFamily, normalizeEventType, type CommercialEventPayload } from '@isalwa/domain';
import type { PrismaClient } from '@prisma/client';

export type TimelineReadItem = {
  id: string;
  type: string;
  canonicalType: string | null;
  family: string;
  title: string;
  body: string | null;
  occurredAt: string;
  accountId: string | null;
  actorUserId: string | null;
  payload: CommercialEventPayload | null;
};

/** Matches TENANT_SURFACE_REQUIRED_SCOPE.customer. Not a caller-supplied tenant. */
export const TIMELINE_READ_SCOPE = 'commercial.team.read';

export type TrustedTimelineSession = {
  readonly organizationId: string;
  readonly grantedScopes: readonly string[];
};

export type TimelineDenialCode = 'AUTH_REQUIRED' | 'ROLE_FORBIDDEN';

export type TimelineReadResult = {
  items: TimelineReadItem[];
  code: TimelineDenialCode | null;
  count: number;
};

type TimelineAccountLookup = {
  findFirst: (args: {
    where: { id: string; organizationId: string };
    select: { id: true };
  }) => Promise<{ id: string } | null>;
};

type TimelineEventRow = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  occurredAt: Date;
  accountId: string | null;
  actorUserId: string | null;
  payloadJson: unknown;
};

type TimelineEventLookup = {
  findMany: (args: {
    where: { accountId: string; organizationId: string };
    orderBy: { occurredAt: 'desc' };
    take: number;
  }) => Promise<TimelineEventRow[]>;
};

function trustedTimelineOrganization(
  session: TrustedTimelineSession | null | undefined,
): string | null {
  if (!session || typeof session.organizationId !== 'string') return null;
  const trimmed = session.organizationId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function holdsTimelineScope(session: TrustedTimelineSession | null | undefined): boolean {
  return (session?.grantedScopes ?? []).some((scope) => scope.trim() === TIMELINE_READ_SCOPE);
}

function emptyTimeline(code: TimelineDenialCode | null): TimelineReadResult {
  return { items: [], code, count: 0 };
}

/**
 * Single read adapter for account timelines.
 * The account lookup and the event query are both scoped to the authenticated
 * session organization. A cross-tenant account id returns the same empty
 * payload as an unknown id: no events and no existence metadata.
 */
export async function listAccountTimeline(
  db: PrismaClient,
  accountId: string,
  opts: { take?: number; session?: TrustedTimelineSession | null } = {},
): Promise<TimelineReadResult> {
  const organizationId = trustedTimelineOrganization(opts.session);
  if (!organizationId) return emptyTimeline('AUTH_REQUIRED');
  if (!holdsTimelineScope(opts.session)) return emptyTimeline('ROLE_FORBIDDEN');

  const take = opts.take ?? 40;
  const accounts = db.account as unknown as TimelineAccountLookup;
  const events = db.activityEvent as unknown as TimelineEventLookup;
  const account = await accounts.findFirst({
    where: { id: accountId, organizationId },
    select: { id: true },
  });
  if (!account) return emptyTimeline(null);

  const rows = await events.findMany({
    where: { accountId: account.id, organizationId },
    orderBy: { occurredAt: 'desc' },
    take,
  });

  const items = rows.map((r) => {
    const canonical = normalizeEventType(r.type);
    const payload =
      r.payloadJson && typeof r.payloadJson === 'object' && !Array.isArray(r.payloadJson)
        ? (r.payloadJson as CommercialEventPayload)
        : null;
    return {
      id: r.id,
      type: r.type,
      canonicalType: canonical,
      family: eventFamily(r.type),
      title: r.title,
      body: r.body,
      occurredAt: r.occurredAt.toISOString(),
      accountId: r.accountId,
      actorUserId: r.actorUserId,
      payload,
    };
  });

  return { items, code: null, count: items.length };
}
