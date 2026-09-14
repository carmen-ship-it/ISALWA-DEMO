import { Body, Controller, Post, Req } from '@nestjs/common';
import { emitCommercialEvent, getPrisma } from '@isalwa/database';
import { createId } from '@isalwa/ts-utils';
import { sessionFromAuthenticatedRequest } from '../search/search-query';

/** Account lookup uses TENANT_SURFACE_REQUIRED_SCOPE.customer. Not a caller-supplied tenant. */
export const VISIT_ACCOUNT_SCOPE = 'commercial.team.read';

export type VisitDenialCode = 'AUTH_REQUIRED' | 'ROLE_FORBIDDEN';

type VisitAccount = {
  id: string;
  organizationId: string;
  ownerUserId: string;
  locations: Array<{ lat: unknown; lng: unknown }>;
};

export type VisitWriteDb = {
  account: {
    findFirst: (args: {
      where: { id: string; organizationId: string };
      include: {
        locations: { where: { isPrimary: true; organizationId: string }; take: number };
      };
    }) => Promise<VisitAccount | null>;
  };
  visit: {
    create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
  };
  updateAccount: (args: {
    where: { id: string; organizationId: string };
    data: { lastVisitAt: Date };
  }) => Promise<unknown>;
  emit: (payload: Record<string, unknown>) => Promise<unknown>;
  resolveAttention: (args: {
    where: { accountId: string; organizationId: string; kind: string; status: string };
    data: { status: string };
  }) => Promise<unknown>;
};

export type VisitHttpRequest = {
  authenticatedSession?: unknown;
  query?: { organizationId?: string };
  headers?: Record<string, string | undefined>;
  readDb?: VisitWriteDb | null;
};

export type VisitCheckInBody = {
  accountId: string;
  result?: string;
  notes?: string;
  lat?: number;
  lng?: number;
};

function denied(code: VisitDenialCode | null) {
  return { code, count: 0 };
}

function visitDb(explicit: VisitWriteDb | null | undefined): VisitWriteDb | null {
  if (explicit !== undefined) return explicit;
  const prisma = getPrisma();
  if (!prisma) return null;
  return {
    account: {
      findFirst: (args) => prisma.account.findFirst(args as never) as Promise<VisitAccount | null>,
    },
    visit: {
      create: (args) => prisma.visit.create(args as never),
    },
    updateAccount: (args) => prisma.account.update(args as never),
    emit: (payload) => emitCommercialEvent(prisma, payload as never),
    resolveAttention: (args) => prisma.attentionItem.updateMany(args as never),
  };
}

@Controller('visits')
export class VisitsController {
  /**
   * HTTP stays AUTH_BLOCKED until Nest attaches authenticatedSession.
   * Body and query organizationId are not inputs. A missing account in the
   * session tenant writes nothing and returns no existence metadata.
   */
  @Post('check-in')
  async checkIn(@Body() body: VisitCheckInBody, @Req() req?: VisitHttpRequest) {
    const session = sessionFromAuthenticatedRequest({ authenticatedSession: req?.authenticatedSession });
    const organizationId = session?.organizationId?.trim() ?? '';
    if (!organizationId || !session) return denied('AUTH_REQUIRED');
    if (!session.grantedScopes.some((scope) => scope.trim() === VISIT_ACCOUNT_SCOPE)) {
      return denied('ROLE_FORBIDDEN');
    }
    const prisma = visitDb(req && 'readDb' in req ? req.readDb : undefined);
    if (!prisma) return denied(null);

    const account = await prisma.account.findFirst({
      where: { id: body.accountId, organizationId },
      include: {
        locations: { where: { isPrimary: true, organizationId }, take: 1 },
      },
    });
    if (!account || account.organizationId !== organizationId) return denied(null);

    const now = new Date();
    const lat = body.lat ?? (account.locations[0] ? Number(account.locations[0].lat) : null);
    const lng = body.lng ?? (account.locations[0] ? Number(account.locations[0].lng) : null);
    const visitId = createId();
    const result = body.result ?? 'follow_up';

    await prisma.visit.create({
      data: {
        id: visitId,
        organizationId,
        accountId: account.id,
        salesRepUserId: account.ownerUserId,
        status: 'completed',
        plannedAt: now,
        startedAt: now,
        completedAt: now,
        result,
        notes: body.notes ?? 'Check-in desde dossier ISALWA OS',
        checkinLat: lat,
        checkinLng: lng,
        withinGeofence: lat != null && lng != null,
      },
    });

    await prisma.updateAccount({
      where: { id: account.id, organizationId },
      data: { lastVisitAt: now },
    });

    await prisma.emit({
      id: createId(),
      type: 'visit.completed',
      organizationId,
      accountId: account.id,
      actor: { kind: 'user', userId: account.ownerUserId },
      occurredAt: now,
      title: 'Visita registrada',
      body: body.notes ?? `Resultado: ${result}`,
      related: { type: 'visit', id: visitId },
      metadata: { visitId, result },
    });

    await prisma.resolveAttention({
      where: { accountId: account.id, organizationId, kind: 'visit_gap', status: 'open' },
      data: { status: 'resolved' },
    });

    return {
      id: visitId,
      accountId: account.id,
      status: 'completed',
      result,
      completedAt: now.toISOString(),
      href: `/personas/${account.id}`,
      nextHref: `/cierre?account=${account.id}`,
      code: null,
      count: 1,
    };
  }
}
