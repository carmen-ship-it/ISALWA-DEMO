/**
 * Coordinación decisions — durable Postgres rows (OsCoordinationDecision).
 * Capability: coordination.decision.record. Not production or payment mutation.
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
  COORDINATION_DECISION_CAPABILITY,
  hasCoordinationDecisionCapability,
  recordCoordinationDecision,
  resolveCoordinationDecision,
  type CoordinationDecisionRecord,
  type CoordinationLedger,
} from '@isalwa/os-contracts';
import { getOsPrisma } from '@isalwa/os-database';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import { resolveSession } from './os-session';
import { OS_STORE } from './os-store.module';

type CoordinationRow = {
  id: string;
  organizationId: string;
  kind: string;
  decision: string;
  ownerLabel: string | null;
  ownerMemberId: string | null;
  dueAt: string | null;
  actorLabel: string;
  actorMemberId: string | null;
  occurredAt: Date;
  linkedCaseId: string | null;
  notes: string | null;
  resolvesDecisionId: string | null;
  recordedAt: Date;
};

function toRecord(row: CoordinationRow): CoordinationDecisionRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    kind: row.kind === 'resolved' ? 'resolved' : 'recorded',
    decision: row.decision,
    ownerLabel: row.ownerLabel,
    ownerMemberId: row.ownerMemberId,
    dueAt: row.dueAt,
    actorLabel: row.actorLabel,
    actorMemberId: row.actorMemberId,
    occurredAt: row.occurredAt.toISOString(),
    linkedCaseId: row.linkedCaseId,
    notes: row.notes,
    resolvesDecisionId: row.resolvesDecisionId,
    recordedAt: row.recordedAt.toISOString(),
    grantsProductionAuthority: false,
    grantsFinanceAuthority: false,
    grantsWarehouseAuthority: false,
  };
}

function denialStatus(reason: string): number {
  if (reason === 'unauthorized_role' || reason === 'session_org_required') return HttpStatus.FORBIDDEN;
  if (reason === 'not_found' || reason === 'cross_tenant') return HttpStatus.NOT_FOUND;
  if (reason === 'already_exists' || reason === 'already_resolved') return HttpStatus.CONFLICT;
  return HttpStatus.BAD_REQUEST;
}

@Controller('coordination')
export class CoordinationController {
  constructor(@Inject(OS_STORE) private readonly workforceStore: OsWorkforceStore) {}

  @Get('decisions')
  async list(@Req() req: Request) {
    const session = await resolveSession(req, this.workforceStore);
    if (!hasCoordinationDecisionCapability(session.grantedScopes)) {
      // Read of own-tenant history requires the same write capability in V1 (no separate read scope).
      throw new HttpException({ code: 'PERMISSION_DENIED' }, HttpStatus.FORBIDDEN);
    }
    const prisma = getOsPrisma();
    if (!prisma) throw new HttpException({ code: 'SERVICE_UNAVAILABLE' }, HttpStatus.SERVICE_UNAVAILABLE);

    const rows = await prisma.osCoordinationDecision.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { occurredAt: 'asc' },
      take: 500,
    });
    return {
      organizationId: session.organizationId,
      liveWrite: 'PROVEN' as const,
      decisions: rows.map((row) => toRecord(row as CoordinationRow)),
    };
  }

  @Post('decisions')
  async record(
    @Req() req: Request,
    @Body()
    body: {
      decision?: string;
      ownerLabel?: string | null;
      dueAt?: string | null;
      notes?: string | null;
      linkedCaseId?: string | null;
      actorLabel?: string | null;
    },
  ) {
    const session = await resolveSession(req, this.workforceStore);
    const prisma = getOsPrisma();
    if (!prisma) throw new HttpException({ code: 'SERVICE_UNAVAILABLE' }, HttpStatus.SERVICE_UNAVAILABLE);

    const actorLabel =
      (typeof body.actorLabel === 'string' && body.actorLabel.trim()) ||
      `Miembro ${session.actorMemberId.slice(0, 8)}`;

    const existing = await prisma.osCoordinationDecision.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { occurredAt: 'asc' },
      take: 500,
    });
    const ledger: CoordinationLedger = {
      decisions: existing.map((row) => toRecord(row as CoordinationRow)),
    };

    const result = recordCoordinationDecision({
      session: {
        organizationId: session.organizationId,
        actorMemberId: session.actorMemberId,
        actorLabel,
        grantedCapabilities: session.grantedScopes,
      },
      ledger,
      id: createId(),
      decision: body.decision ?? '',
      ownerLabel: body.ownerLabel ?? null,
      dueAt: body.dueAt ?? null,
      occurredAt: new Date().toISOString(),
      linkedCaseId: body.linkedCaseId ?? null,
      notes: body.notes ?? null,
    });
    if (!result.ok) {
      throw new HttpException({ code: result.reason }, denialStatus(result.reason));
    }

    const row = result.value.decision;
    await prisma.osCoordinationDecision.create({
      data: {
        id: row.id,
        organizationId: row.organizationId,
        kind: row.kind,
        decision: row.decision,
        ownerLabel: row.ownerLabel,
        ownerMemberId: row.ownerMemberId,
        dueAt: row.dueAt,
        actorLabel: row.actorLabel,
        actorMemberId: row.actorMemberId,
        occurredAt: new Date(row.occurredAt),
        linkedCaseId: row.linkedCaseId,
        notes: row.notes,
        resolvesDecisionId: row.resolvesDecisionId,
        recordedAt: new Date(row.recordedAt),
      },
    });

    return {
      organizationId: session.organizationId,
      liveWrite: 'PROVEN' as const,
      capability: COORDINATION_DECISION_CAPABILITY,
      decision: row,
      mutatedProduction: false as const,
      mutatedPayment: false as const,
    };
  }

  @Post('decisions/:decisionId/resolve')
  async resolve(
    @Req() req: Request,
    @Param('decisionId') decisionId: string,
    @Body()
    body: {
      decision?: string;
      ownerLabel?: string | null;
      dueAt?: string | null;
      notes?: string | null;
      linkedCaseId?: string | null;
      actorLabel?: string | null;
    },
  ) {
    const session = await resolveSession(req, this.workforceStore);
    const prisma = getOsPrisma();
    if (!prisma) throw new HttpException({ code: 'SERVICE_UNAVAILABLE' }, HttpStatus.SERVICE_UNAVAILABLE);

    const actorLabel =
      (typeof body.actorLabel === 'string' && body.actorLabel.trim()) ||
      `Miembro ${session.actorMemberId.slice(0, 8)}`;

    const resolvesDecisionId = decisionId.trim();
    if (!resolvesDecisionId) {
      throw new HttpException({ code: 'VALIDATION_FAILED' }, HttpStatus.BAD_REQUEST);
    }

    // Postgres-backed duplicate check — do not rely on an oldest-500 in-memory slice.
    const alreadyResolved = await prisma.osCoordinationDecision.findFirst({
      where: {
        organizationId: session.organizationId,
        kind: 'resolved',
        resolvesDecisionId,
      },
      select: { id: true },
    });
    if (alreadyResolved) {
      throw new HttpException({ code: 'already_resolved' }, HttpStatus.CONFLICT);
    }

    const target = await prisma.osCoordinationDecision.findFirst({
      where: {
        organizationId: session.organizationId,
        id: resolvesDecisionId,
        kind: 'recorded',
      },
    });
    if (!target) {
      throw new HttpException({ code: 'not_found' }, HttpStatus.NOT_FOUND);
    }

    const ledger: CoordinationLedger = {
      decisions: [toRecord(target as CoordinationRow)],
    };

    const result = resolveCoordinationDecision({
      session: {
        organizationId: session.organizationId,
        actorMemberId: session.actorMemberId,
        actorLabel,
        grantedCapabilities: session.grantedScopes,
      },
      ledger,
      id: createId(),
      resolvesDecisionId,
      decision: body.decision ?? '',
      ownerLabel: body.ownerLabel ?? null,
      dueAt: body.dueAt ?? null,
      occurredAt: new Date().toISOString(),
      linkedCaseId: body.linkedCaseId ?? null,
      notes: body.notes ?? null,
    });
    if (!result.ok) {
      throw new HttpException({ code: result.reason }, denialStatus(result.reason));
    }

    const row = result.value.decision;
    await prisma.osCoordinationDecision.create({
      data: {
        id: row.id,
        organizationId: row.organizationId,
        kind: row.kind,
        decision: row.decision,
        ownerLabel: row.ownerLabel,
        ownerMemberId: row.ownerMemberId,
        dueAt: row.dueAt,
        actorLabel: row.actorLabel,
        actorMemberId: row.actorMemberId,
        occurredAt: new Date(row.occurredAt),
        linkedCaseId: row.linkedCaseId,
        notes: row.notes,
        resolvesDecisionId: row.resolvesDecisionId,
        recordedAt: new Date(row.recordedAt),
      },
    });

    return {
      organizationId: session.organizationId,
      liveWrite: 'PROVEN' as const,
      capability: COORDINATION_DECISION_CAPABILITY,
      decision: row,
      mutatedProduction: false as const,
      mutatedPayment: false as const,
    };
  }
}
