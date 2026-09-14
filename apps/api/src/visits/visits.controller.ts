import { BadRequestException, Body, Controller, Post, Req } from '@nestjs/common';
import { emitCommercialEvent, getPrisma } from '@isalwa/database';
import { createId } from '@isalwa/ts-utils';
import {
  prepareVisitCheckIn,
  sessionFromAuthenticatedRequest,
  VISIT_CHECK_IN_AUTHORITY,
  type VisitAccountLookupDb,
  type VisitCheckInGate,
  type VisitDenialCode,
  type VisitTargetAccount,
} from './visits-query';

export type VisitCheckInBody = {
  accountId?: string;
  result?: string;
  notes?: string;
  lat?: number;
  lng?: number;
  organizationId?: string;
  account?: { organizationId?: string; name?: string; ownerUserId?: string; lat?: number; lng?: number };
};

export type VisitMutationDb = VisitAccountLookupDb & {
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
  body?: { organizationId?: string };
  readDb?: VisitMutationDb | null;
};

export type VisitCheckInResponse = {
  allowed: false;
  code: VisitDenialCode | 'NOT_FOUND';
  count: 0;
  authority?: typeof VISIT_CHECK_IN_AUTHORITY;
};

type VisitRecordedResponse = {
  allowed: true;
  code: null;
  count: 1;
  id: string;
  accountId: string;
  status: 'completed';
  result: string;
  completedAt: string;
  href: string;
  nextHref: string;
};

function denied(gate: Extract<VisitCheckInGate, { allowed: false }>): VisitCheckInResponse {
  if (gate.code === 'ROLE_FORBIDDEN') {
    return { allowed: false, code: gate.code, count: 0, authority: VISIT_CHECK_IN_AUTHORITY };
  }
  return { allowed: false, code: gate.code, count: 0 };
}

function visitDb(req: VisitHttpRequest | undefined): VisitMutationDb | null {
  if (req && 'readDb' in req) return req.readDb ?? null;
  const prisma = getPrisma();
  if (!prisma) return null;
  return {
    account: {
      findFirst: (args) => prisma.account.findFirst(args as never) as Promise<VisitTargetAccount | null>,
    },
    visit: {
      create: (args) => prisma.visit.create(args as never),
    },
    updateAccount: (args) =>
      prisma.account.updateMany({
        where: { id: args.where.id, organizationId: args.where.organizationId },
        data: args.data,
      }),
    emit: (payload) => emitCommercialEvent(prisma, payload as never),
    resolveAttention: (args) => prisma.attentionItem.updateMany(args as never),
  };
}

@Controller('visits')
export class VisitsController {
  /**
   * Check-in is a write. commercial.team.read does not authorize it.
   * body.organizationId and body.account organization claims are not inputs.
   * Record paths run only when prepareVisitCheckIn returns allowed: true.
   * That stays false until a write capability exists: a deployment blocker.
   * This method does not accept a caller allow flag.
   */
  @Post('check-in')
  async checkIn(
    @Body() body: VisitCheckInBody,
    @Req() req?: VisitHttpRequest,
  ): Promise<VisitCheckInResponse | VisitRecordedResponse> {
    const session = sessionFromAuthenticatedRequest(req);
    const prepared = await prepareVisitCheckIn({
      session,
      accountId: typeof body?.accountId === 'string' ? body.accountId : '',
      db: visitDb(req),
    });
    if (!prepared.allowed) return denied(prepared);
    return this.recordCheckIn(body, prepared.account, visitDb(req));
  }

  private async recordCheckIn(
    body: VisitCheckInBody,
    account: VisitTargetAccount,
    db: VisitMutationDb | null,
  ): Promise<VisitRecordedResponse> {
    if (!db) throw new BadRequestException('Base de datos no disponible');
    const { result: requestedResult, notes, lat: bodyLat, lng: bodyLng, ...ignoredClaims } = body;
    void ignoredClaims;

    const now = new Date();
    const lat = bodyLat ?? (account.locations[0] ? Number(account.locations[0].lat) : null);
    const lng = bodyLng ?? (account.locations[0] ? Number(account.locations[0].lng) : null);
    const visitId = createId();
    const result = requestedResult ?? 'follow_up';

    await db.visit.create({
      data: {
        id: visitId,
        organizationId: account.organizationId,
        accountId: account.id,
        salesRepUserId: account.ownerUserId,
        status: 'completed',
        plannedAt: now,
        startedAt: now,
        completedAt: now,
        result,
        notes: notes ?? 'Check-in desde dossier ISALWA OS',
        checkinLat: lat,
        checkinLng: lng,
        withinGeofence: lat != null && lng != null,
      },
    });

    await db.updateAccount({
      where: { id: account.id, organizationId: account.organizationId },
      data: { lastVisitAt: now },
    });

    await db.emit({
      id: createId(),
      type: 'visit.completed',
      organizationId: account.organizationId,
      accountId: account.id,
      actor: { kind: 'user', userId: account.ownerUserId },
      occurredAt: now,
      title: 'Visita registrada',
      body: notes ?? `Resultado: ${result}`,
      related: { type: 'visit', id: visitId },
      metadata: { visitId, result },
    });

    await db.resolveAttention({
      where: { accountId: account.id, organizationId: account.organizationId, kind: 'visit_gap', status: 'open' },
      data: { status: 'resolved' },
    });

    return {
      allowed: true,
      code: null,
      count: 1,
      id: visitId,
      accountId: account.id,
      status: 'completed',
      result,
      completedAt: now.toISOString(),
      href: `/personas/${account.id}`,
      nextHref: `/cierre?account=${account.id}`,
    };
  }
}
