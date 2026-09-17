import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { getOsPrisma } from '@isalwa/os-database';
import { memberHasGrantedScope, memberHasScope } from '@isalwa/os-domain';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import {
  assertQueryTenantResource,
  buildQueryContext,
} from '@isalwa/os-query';
import { decodeAuditCursor, encodeAuditCursor } from './audit-cursor';
import { resolveSession } from './os-session';
import { OS_STORE } from './os-store.module';

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 25;

const EVENT_TYPE_LABELS: Record<string, string> = {
  'party.created': 'Cliente creado',
  'party.updated': 'Cliente actualizado',
  'party.deactivated': 'Cliente desactivado',
  'party.reactivated': 'Cliente reactivado',
  'party.merged': 'Clientes fusionados',
  'contact.updated': 'Contacto actualizado',
  'approval.requested': 'Aprobación solicitada',
  'approval.approved': 'Aprobación concedida',
  'approval.rejected': 'Aprobación rechazada',
  'member.role.changed': 'Rol asignado',
  'member.suspended': 'Acceso suspendido',
  'member.activated': 'Acceso activado',
  'member.terminated': 'Acceso finalizado',
};

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  party: 'Cliente',
  contact: 'Contacto',
  work_item: 'Trabajo',
  approval_request: 'Aprobación',
  member: 'Persona',
  opportunity: 'Oportunidad',
  quote: 'Cotización',
  order: 'Pedido',
  issue: 'Incidencia',
  commitment: 'Compromiso',
};

function titleCaseFromKey(key: string): string {
  return key.replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function humanizeAuditAction(action: string): string {
  const trimmed = action.trim();
  return EVENT_TYPE_LABELS[trimmed] ?? titleCaseFromKey(trimmed);
}

function humanizeResourceType(resourceType: string): string {
  const trimmed = resourceType.trim();
  return RESOURCE_TYPE_LABELS[trimmed] ?? titleCaseFromKey(trimmed);
}

/**
 * Business audit read for owner-eval (commercial.org.read / management.org.read)
 * plus technical admins. Carmen SYNTH forbids people.admin by design — org/management
 * read is the intentional owner-evaluation path. View As still narrows in os-web.
 */
function assertAuditViewerScope(ctx: Awaited<ReturnType<typeof buildQueryContext>>): void {
  if (
    memberHasScope(ctx.auth, 'people.admin') ||
    memberHasGrantedScope(ctx.auth, 'system.admin') ||
    memberHasGrantedScope(ctx.auth, 'management.org.read') ||
    memberHasGrantedScope(ctx.auth, 'commercial.org.read')
  ) {
    return;
  }
  throw new Error('PERMISSION_DENIED');
}

function parseIsoDate(value: string | undefined, field: string): Date | undefined {
  if (!value?.trim()) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new HttpException({ code: 'VALIDATION_FAILED', field }, HttpStatus.BAD_REQUEST);
  }
  return d;
}

function parseLimit(raw: string | undefined): number {
  if (!raw?.trim()) return DEFAULT_LIMIT;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) {
    throw new HttpException({ code: 'VALIDATION_FAILED', field: 'limit' }, HttpStatus.BAD_REQUEST);
  }
  return Math.min(Math.floor(n), MAX_LIMIT);
}

@Controller('audit')
export class AuditController {
  constructor(@Inject(OS_STORE) private readonly workforceStore: OsWorkforceStore) {}

  /**
   * GET /v1/audit?from&to&actorMemberId&resourceType&resourceId&action&q&cursor&limit&id
   * Tenant-scoped audit read. people.admin or system.admin only. No export.
   */
  @Get()
  async listAudit(
    @Req() req: Request,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('actorMemberId') actorMemberId?: string,
    @Query('resourceType') resourceType?: string,
    @Query('resourceId') resourceId?: string,
    @Query('action') action?: string,
    @Query('q') q?: string,
    @Query('cursor') cursorRaw?: string,
    @Query('limit') limitRaw?: string,
    @Query('id') id?: string,
  ) {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const ctx = await buildQueryContext(session, this.workforceStore);
      assertAuditViewerScope(ctx);
      assertQueryTenantResource(ctx, ctx.organizationId);

      const prisma = getOsPrisma();
      if (!prisma) {
        throw new HttpException({ code: 'SERVICE_UNAVAILABLE' }, HttpStatus.SERVICE_UNAVAILABLE);
      }

      const fromDate = parseIsoDate(from, 'from');
      const toDate = parseIsoDate(to, 'to');
      const limit = parseLimit(limitRaw);
      const includeSnapshots = Boolean(id?.trim());

      if (id?.trim()) {
        const row = await prisma.osAuditLog.findFirst({
          where: { organizationId: ctx.organizationId, id: id.trim() },
        });
        if (!row) {
          throw new HttpException({ code: 'NOT_FOUND' }, HttpStatus.NOT_FOUND);
        }
        return {
          boundary:
            'Lectura acotada en pantalla. No hay exportación masiva ni edición desde aquí.',
          items: [this.mapRow(row, includeSnapshots)],
          meta: { hasMore: false },
        };
      }

      const cursor = decodeAuditCursor(cursorRaw);
      const qTrim = q?.trim();
      const searchFilter = qTrim
        ? {
            OR: [
              { action: { contains: qTrim, mode: 'insensitive' as const } },
              { resourceType: { contains: qTrim, mode: 'insensitive' as const } },
              { resourceId: { contains: qTrim, mode: 'insensitive' as const } },
              { correlationId: { contains: qTrim, mode: 'insensitive' as const } },
            ],
          }
        : {};

      const cursorFilter = cursor
        ? {
            OR: [
              { createdAt: { lt: new Date(cursor.t) } },
              { createdAt: new Date(cursor.t), id: { lt: cursor.id } },
            ],
          }
        : {};

      const rows = await prisma.osAuditLog.findMany({
        where: {
          organizationId: ctx.organizationId,
          ...(fromDate || toDate
            ? {
                createdAt: {
                  ...(fromDate ? { gte: fromDate } : {}),
                  ...(toDate ? { lte: toDate } : {}),
                },
              }
            : {}),
          ...(actorMemberId?.trim() ? { actorMemberId: actorMemberId.trim() } : {}),
          ...(resourceType?.trim() ? { resourceType: resourceType.trim() } : {}),
          ...(resourceId?.trim() ? { resourceId: resourceId.trim() } : {}),
          ...(action?.trim() ? { action: action.trim() } : {}),
          ...searchFilter,
          ...cursorFilter,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
      });

      const hasMore = rows.length > limit;
      const page = hasMore ? rows.slice(0, limit) : rows;
      const last = page[page.length - 1];

      return {
        boundary:
          'Lectura acotada en pantalla. No hay exportación masiva ni edición desde aquí.',
        items: page.map((row) => this.mapRow(row, false)),
        meta: {
          hasMore,
          ...(hasMore && last ? { nextCursor: encodeAuditCursor(last.createdAt, last.id) } : {}),
        },
      };
    } catch (err) {
      throw this.toHttp(err);
    }
  }

  private mapRow(
    row: {
      id: string;
      createdAt: Date;
      actorMemberId: string | null;
      action: string;
      resourceType: string;
      resourceId: string;
      beforeJson: unknown;
      afterJson: unknown;
      correlationId: string;
    },
    includeSnapshots: boolean,
  ) {
    return {
      id: row.id,
      occurredAt: row.createdAt.toISOString(),
      actorMemberId: row.actorMemberId,
      actionLabel: humanizeAuditAction(row.action),
      resourceLabel: humanizeResourceType(row.resourceType),
      resourceType: row.resourceType,
      resourceId: row.resourceId,
      action: row.action,
      hasBefore: row.beforeJson != null,
      hasAfter: row.afterJson != null,
      correlationId: row.correlationId,
      ...(includeSnapshots
        ? {
            beforeJson: row.beforeJson ?? undefined,
            afterJson: row.afterJson ?? undefined,
          }
        : {}),
    };
  }

  private toHttp(err: unknown): HttpException {
    if (err instanceof HttpException) return err;
    const code = err instanceof Error ? err.message : 'INTERNAL_ERROR';
    const status =
      code === 'AUTH_REQUIRED'
        ? HttpStatus.UNAUTHORIZED
        : code === 'TENANT_FORBIDDEN' || code === 'PERMISSION_DENIED' || code === 'ACCESS_REVOKED'
          ? HttpStatus.FORBIDDEN
          : code === 'NOT_FOUND'
            ? HttpStatus.NOT_FOUND
            : code === 'VALIDATION_FAILED'
              ? HttpStatus.BAD_REQUEST
              : HttpStatus.INTERNAL_SERVER_ERROR;
    return new HttpException({ code }, status);
  }
}
