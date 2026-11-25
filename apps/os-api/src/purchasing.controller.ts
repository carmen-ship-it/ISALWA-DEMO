/**
 * Compras purchase-request queue — durable Postgres (OsPurchaseRequest*).
 * Capability: purchasing.operational.record. Not stock, OC, or supplier ledger.
 */
import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { createId } from '@isalwa/ts-utils';
import {
  canRecordPurchasing,
  createPurchaseRequest,
  isPurchaseRequestStatus,
  mapLegacyPurchaseRequestStatus,
  PURCHASE_REQUEST_REORDER_POLICY,
  PURCHASE_REQUEST_SOURCE,
  PURCHASE_REQUEST_STOCK_AUTHORITY,
  type PurchaseRequest,
  type PurchaseRequestNote,
  type PurchaseRequestStatus,
  type PurchaseRequestStatusEntry,
} from '@isalwa/os-contracts';
import { transitionPurchaseRequest } from '../../../packages/os-purchasing/src/transition';
import { getOsPrisma } from '@isalwa/os-database';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import { authenticatedSessionHttpError, resolveSession } from './os-session';
import { OS_STORE } from './os-store.module';

type RequestRow = {
  id: string;
  organizationId: string;
  requestingArea: string;
  requestedByLabel: string;
  requestedByMemberId: string | null;
  description: string;
  quantity: string | null;
  unit: string | null;
  productionContextId: string | null;
  orderId: string | null;
  reason: string;
  requestedAt: Date;
  status: string;
  buyerLabel: string | null;
  buyerMemberId: string | null;
  actorLabel: string;
  actorMemberId: string | null;
  source: string;
  stockAuthority: string;
  reorderPolicy: string;
  idempotencyKey: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type HistoryRow = {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  changedAt: Date;
  actorLabel: string;
  actorMemberId: string | null;
  source: string;
  note: string | null;
};

type NoteRow = {
  id: string;
  body: string;
  recordedAt: Date;
  actorLabel: string;
  actorMemberId: string | null;
  source: string;
  evidenceReference: string | null;
};

async function requirePurchasingSession(req: Request, store: OsWorkforceStore) {
  try {
    return await resolveSession(req, store);
  } catch (err) {
    if (err instanceof HttpException) throw err;
    const mapped = authenticatedSessionHttpError(err);
    throw new HttpException(mapped.body, mapped.status);
  }
}

function denialStatus(reason: string): number {
  if (reason === 'unauthorized_role' || reason === 'session_org_required') return HttpStatus.FORBIDDEN;
  if (reason === 'not_found' || reason === 'cross_tenant') return HttpStatus.NOT_FOUND;
  if (reason === 'already_exists') return HttpStatus.CONFLICT;
  return HttpStatus.BAD_REQUEST;
}

function toDomain(
  row: RequestRow,
  history: HistoryRow[],
  notes: NoteRow[],
): PurchaseRequest {
  const status =
    mapLegacyPurchaseRequestStatus(row.status) ??
    (isPurchaseRequestStatus(row.status) ? row.status : 'solicitado');
  return {
    id: row.id,
    organizationId: row.organizationId,
    requestingArea: row.requestingArea,
    requestedByLabel: row.requestedByLabel,
    requestedByMemberId: row.requestedByMemberId,
    description: row.description,
    quantity: row.quantity,
    unit: row.unit,
    productionContextId: row.productionContextId,
    orderId: row.orderId,
    reason: row.reason,
    requestedAt: row.requestedAt.toISOString(),
    status,
    buyerLabel: row.buyerLabel,
    buyerMemberId: row.buyerMemberId,
    notes: notes.map(
      (note): PurchaseRequestNote => ({
        id: note.id,
        body: note.body,
        at: note.recordedAt.toISOString(),
        actorLabel: note.actorLabel,
        actorMemberId: note.actorMemberId,
        source: PURCHASE_REQUEST_SOURCE,
        evidenceReference: note.evidenceReference,
      }),
    ),
    statusHistory: history.map((entry): PurchaseRequestStatusEntry => {
      const from =
        entry.fromStatus == null
          ? null
          : mapLegacyPurchaseRequestStatus(entry.fromStatus) ??
            (isPurchaseRequestStatus(entry.fromStatus) ? entry.fromStatus : null);
      const to =
        mapLegacyPurchaseRequestStatus(entry.toStatus) ??
        (isPurchaseRequestStatus(entry.toStatus) ? entry.toStatus : status);
      return {
        id: entry.id,
        fromStatus: from,
        toStatus: to as PurchaseRequestStatus,
        at: entry.changedAt.toISOString(),
        actorLabel: entry.actorLabel,
        actorMemberId: entry.actorMemberId,
        source: PURCHASE_REQUEST_SOURCE,
        note: entry.note,
      };
    }),
    actorLabel: row.actorLabel,
    actorMemberId: row.actorMemberId,
    source: PURCHASE_REQUEST_SOURCE,
    stockAuthority: PURCHASE_REQUEST_STOCK_AUTHORITY,
    reorderPolicy: PURCHASE_REQUEST_REORDER_POLICY,
    claimsOfficialStock: false,
    triggersReorder: false,
    idempotencyKey: row.idempotencyKey,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Controller('purchasing')
export class PurchasingController {
  constructor(@Inject(OS_STORE) private readonly workforceStore: OsWorkforceStore) {}

  @Get('requests')
  async list(@Req() req: Request) {
    const session = await requirePurchasingSession(req, this.workforceStore);
    if (!canRecordPurchasing(session.grantedScopes)) {
      throw new HttpException({ code: 'PERMISSION_DENIED' }, HttpStatus.FORBIDDEN);
    }
    const prisma = getOsPrisma();
    if (!prisma) throw new HttpException({ code: 'SERVICE_UNAVAILABLE' }, HttpStatus.SERVICE_UNAVAILABLE);

    const rows = await prisma.osPurchaseRequest.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { requestedAt: 'asc' },
      take: 500,
      include: {
        statusHistory: { orderBy: { changedAt: 'asc' } },
        notes: { orderBy: { recordedAt: 'asc' } },
      },
    });

    return {
      organizationId: session.organizationId,
      liveWrite: 'PROVEN' as const,
      requests: rows.map((row) =>
        toDomain(
          row as unknown as RequestRow,
          row.statusHistory as unknown as HistoryRow[],
          row.notes as unknown as NoteRow[],
        ),
      ),
    };
  }

  @Post('requests')
  async create(
    @Req() req: Request,
    @Body()
    body: {
      requestingArea?: string;
      requestedByLabel?: string;
      description?: string;
      reason?: string;
      quantity?: string | null;
      unit?: string | null;
      orderId?: string | null;
      productionContextId?: string | null;
      actorLabel?: string | null;
      idempotencyKey?: string | null;
    },
  ) {
    const session = await requirePurchasingSession(req, this.workforceStore);
    if (!canRecordPurchasing(session.grantedScopes)) {
      throw new HttpException({ code: 'PERMISSION_DENIED' }, HttpStatus.FORBIDDEN);
    }
    const prisma = getOsPrisma();
    if (!prisma) throw new HttpException({ code: 'SERVICE_UNAVAILABLE' }, HttpStatus.SERVICE_UNAVAILABLE);

    const actorLabel = (body.actorLabel?.trim() || 'Compras').slice(0, 200);
    const now = new Date().toISOString();
    const created = createPurchaseRequest({
      id: createId(),
      organizationId: session.organizationId,
      requestingArea: body.requestingArea?.trim() || 'Operaciones',
      requestedByLabel: body.requestedByLabel?.trim() || actorLabel,
      requestedByMemberId: session.actorMemberId,
      description: body.description?.trim() || '',
      reason: body.reason?.trim() || 'Solicitud operativa',
      quantity: body.quantity?.trim() || null,
      unit: body.unit?.trim() || null,
      orderId: body.orderId?.trim() || null,
      productionContextId: body.productionContextId?.trim() || null,
      actorLabel,
      actorMemberId: session.actorMemberId,
      requestedAt: now,
      createdAt: now,
      statusEntryId: createId(),
      idempotencyKey: body.idempotencyKey?.trim() || null,
    });
    if (!created.ok) {
      throw new HttpException({ code: created.reason.toUpperCase() }, denialStatus(created.reason));
    }

    const request = created.request;
    try {
      await prisma.osPurchaseRequest.create({
        data: {
          id: request.id,
          organizationId: request.organizationId,
          requestingArea: request.requestingArea,
          requestedByLabel: request.requestedByLabel,
          requestedByMemberId: request.requestedByMemberId,
          description: request.description,
          quantity: request.quantity,
          unit: request.unit,
          productionContextId: request.productionContextId,
          orderId: request.orderId,
          reason: request.reason,
          requestedAt: new Date(request.requestedAt),
          status: request.status,
          buyerLabel: request.buyerLabel,
          buyerMemberId: request.buyerMemberId,
          actorLabel: request.actorLabel,
          actorMemberId: request.actorMemberId,
          source: PURCHASE_REQUEST_SOURCE,
          stockAuthority: PURCHASE_REQUEST_STOCK_AUTHORITY,
          reorderPolicy: PURCHASE_REQUEST_REORDER_POLICY,
          idempotencyKey: request.idempotencyKey,
          updatedAt: new Date(request.updatedAt),
          statusHistory: {
            create: request.statusHistory.map((entry) => ({
              id: entry.id,
              organizationId: request.organizationId,
              fromStatus: entry.fromStatus,
              toStatus: entry.toStatus,
              changedAt: new Date(entry.at),
              actorLabel: entry.actorLabel,
              actorMemberId: entry.actorMemberId,
              source: PURCHASE_REQUEST_SOURCE,
              note: entry.note,
            })),
          },
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (/unique|idempotency/i.test(message) && request.idempotencyKey) {
        const existing = await prisma.osPurchaseRequest.findFirst({
          where: {
            organizationId: session.organizationId,
            idempotencyKey: request.idempotencyKey,
          },
          include: {
            statusHistory: { orderBy: { changedAt: 'asc' } },
            notes: { orderBy: { recordedAt: 'asc' } },
          },
        });
        if (existing) {
          return {
            liveWrite: 'PROVEN' as const,
            request: toDomain(
              existing as unknown as RequestRow,
              existing.statusHistory as unknown as HistoryRow[],
              existing.notes as unknown as NoteRow[],
            ),
          };
        }
      }
      throw err;
    }

    return { liveWrite: 'PROVEN' as const, request };
  }

  @Post('requests/:requestId/transition')
  async transition(
    @Req() req: Request,
    @Param('requestId') requestId: string,
    @Body()
    body: {
      status?: string;
      note?: string | null;
      actorLabel?: string | null;
      buyerLabel?: string | null;
      statusEntryId?: string | null;
    },
  ) {
    const session = await requirePurchasingSession(req, this.workforceStore);
    const prisma = getOsPrisma();
    if (!prisma) throw new HttpException({ code: 'SERVICE_UNAVAILABLE' }, HttpStatus.SERVICE_UNAVAILABLE);

    const id = requestId.trim();
    if (!id || !body.status?.trim()) {
      throw new HttpException({ code: 'VALIDATION_FAILED' }, HttpStatus.BAD_REQUEST);
    }

    const row = await prisma.osPurchaseRequest.findFirst({
      where: { id, organizationId: session.organizationId },
      include: {
        statusHistory: { orderBy: { changedAt: 'asc' } },
        notes: { orderBy: { recordedAt: 'asc' } },
      },
    });
    const domain = row
      ? toDomain(
          row as unknown as RequestRow,
          row.statusHistory as unknown as HistoryRow[],
          row.notes as unknown as NoteRow[],
        )
      : null;

    const actorLabel = (body.actorLabel?.trim() || 'Compras').slice(0, 200);
    const outcome = transitionPurchaseRequest({
      session: {
        organizationId: session.organizationId,
        role: 'buyer',
        grantedScopes: session.grantedScopes,
        actorLabel,
      },
      request: domain,
      change: {
        status: body.status.trim(),
        at: new Date().toISOString(),
        actorLabel,
        actorMemberId: session.actorMemberId,
        statusEntryId: body.statusEntryId?.trim() || createId(),
        note: body.note?.trim() || null,
        buyerLabel: body.buyerLabel?.trim() || actorLabel,
      },
    });

    if (!outcome.ok) {
      throw new HttpException({ code: outcome.reason.toUpperCase() }, denialStatus(outcome.reason));
    }

    const next = outcome.request;
    const latestEntry = next.statusHistory[next.statusHistory.length - 1]!;

    await prisma.$transaction([
      prisma.osPurchaseRequest.update({
        where: { id: next.id },
        data: {
          status: next.status,
          buyerLabel: next.buyerLabel,
          buyerMemberId: next.buyerMemberId,
          actorLabel: next.actorLabel,
          actorMemberId: next.actorMemberId,
          updatedAt: new Date(next.updatedAt),
        },
      }),
      prisma.osPurchaseRequestStatusHistory.create({
        data: {
          id: latestEntry.id,
          organizationId: next.organizationId,
          purchaseRequestId: next.id,
          fromStatus: latestEntry.fromStatus,
          toStatus: latestEntry.toStatus,
          changedAt: new Date(latestEntry.at),
          actorLabel: latestEntry.actorLabel,
          actorMemberId: latestEntry.actorMemberId,
          source: PURCHASE_REQUEST_SOURCE,
          note: latestEntry.note,
        },
      }),
    ]);

    return {
      liveWrite: 'PROVEN' as const,
      request: next,
      event: outcome.event,
    };
  }
}
