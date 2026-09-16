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
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import type { OsIssueStore, IssueJournalEntryRecord } from '@isalwa/os-database';
import { ISSUE_MANAGE_SCOPE, type IssueStatus, type IssueJournalType } from '@isalwa/os-contracts';
import {
  computeEffectiveScopes,
  assertMemberActive,
  type MemberAccessSnapshot,
} from '@isalwa/os-domain';
import {
  MemoryEvidenceService,
  type IssueRecord as CommandIssueRecord,
  type IssueJournalEntryRecord as CommandJournalRecord,
} from '@isalwa/os-issue';
import { getOsPrisma } from '@isalwa/os-database';
import { memberHasGrantedScope, memberHasScope } from '@isalwa/os-domain';
import { assertQueryTenantResource, buildQueryContext } from '@isalwa/os-query';
import { resolveSession } from './os-session';
import { OS_STORE, OS_ISSUE_STORE } from './os-store.module';

const MEMORY_CHANGES_MAX = 100;

const BUSINESS_EVENT_LABELS: Record<string, string> = {
  'party.created': 'Cliente creado',
  'party.updated': 'Cliente actualizado',
  'party.deactivated': 'Cliente desactivado',
  'party.reactivated': 'Cliente reactivado',
  'party.merged': 'Clientes fusionados',
  'contact.updated': 'Contacto actualizado',
  'lead.created': 'Prospecto registrado',
  'lead.resolved': 'Prospecto resuelto',
  'work_item.created': 'Trabajo creado',
  'work_item.updated': 'Trabajo actualizado',
  'work_item.completed': 'Trabajo completado',
  'approval.requested': 'Aprobación solicitada',
  'approval.approved': 'Aprobación concedida',
  'approval.rejected': 'Aprobación rechazada',
  'member.role.changed': 'Rol principal asignado',
  'member.suspended': 'Acceso suspendido',
  'member.activated': 'Acceso activado',
  'member.terminated': 'Acceso finalizado',
  'opportunity.created': 'Oportunidad creada',
  'quote.created': 'Cotización creada',
  'order.created': 'Pedido creado',
  'issue.reported': 'Incidencia reportada',
  'commitment.created': 'Compromiso registrado',
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
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

function titleCaseKey(key: string): string {
  return key.replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function humanizeEventType(eventType: string): string {
  const t = eventType.trim();
  return BUSINESS_EVENT_LABELS[t] ?? titleCaseKey(t);
}

function humanizeEntityType(entityType: string): string {
  const t = entityType.trim();
  return ENTITY_TYPE_LABELS[t] ?? titleCaseKey(t);
}

function entitySummaryLabel(entityType: string, entityId: string): string {
  const label = humanizeEntityType(entityType);
  const shortId = entityId.length > 8 ? `${entityId.slice(0, 8)}…` : entityId;
  return `${label} · ${shortId}`;
}

function assertOrgMemoryScope(ctx: Awaited<ReturnType<typeof buildQueryContext>>): void {
  if (
    !memberHasScope(ctx.auth, 'people.admin') &&
    !memberHasGrantedScope(ctx.auth, 'system.admin')
  ) {
    throw new Error('PERMISSION_DENIED');
  }
}

type MemoryWindow = 'hoy' | '24h' | '7d';

function parseMemoryWindow(raw: string | undefined): MemoryWindow {
  const w = (raw ?? '24h').trim().toLowerCase();
  if (w === 'hoy' || w === '24h' || w === '7d') return w;
  throw new Error('VALIDATION_FAILED');
}

function windowStart(window: MemoryWindow, asOf: Date): Date {
  if (window === '24h') {
    return new Date(asOf.getTime() - 24 * 60 * 60 * 1000);
  }
  if (window === '7d') {
    return new Date(asOf.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  const start = new Date(asOf);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

type EvidenceIssue = {
  id: string;
  organizationId: string;
  title: string | null;
  description: string;
  status: IssueStatus;
  reportedByMemberId: string;
  ownerMemberId: string | null;
  reportedAt: string;
  version: number;
};

type EvidenceJournalEntry = {
  id: string;
  issueId: string;
  entryType: IssueJournalType;
  content: string;
  createdByMemberId: string;
  createdAt: string;
};

type IssueEvidenceResponse = {
  issue: EvidenceIssue;
  journalEntries: EvidenceJournalEntry[];
};

/**
 * Memory evidence controller.
 * GET /v1/memory/evidence — filtered evidence for authorized viewing.
 */
@Controller('memory')
export class MemoryController {
  private readonly evidenceService = new MemoryEvidenceService();

  constructor(
    @Inject(OS_STORE) private readonly workforceStore: OsWorkforceStore,
    @Inject(OS_ISSUE_STORE) private readonly issueStore: OsIssueStore,
  ) {}

  private async getAccessSnapshot(
    organizationId: string,
    memberId: string,
    asOf: Date,
  ): Promise<MemberAccessSnapshot | null> {
    const member = await this.workforceStore.getMemberInOrg(organizationId, memberId);
    if (!member) return null;
    const roles = await this.workforceStore.listRoleAssignmentsForMember(memberId, organizationId);
    const delegations = await this.workforceStore.listDelegationsForDelegate(memberId, organizationId);
    return {
      memberId: member.id,
      organizationId: member.organizationId,
      accessStatus: member.accessStatus,
      roleKeys: computeEffectiveScopes(
        roles.map((r) => ({ roleKey: r.roleKey, effectiveAt: r.effectiveAt, endedAt: r.endedAt })),
        delegations.map((d) => ({
          scopes: d.scopes,
          startsAt: d.startsAt,
          expiresAt: d.expiresAt,
          revokedAt: d.revokedAt,
          delegatorMemberId: d.delegatorMemberId,
        })),
        asOf,
      ),
      delegatedScopes: [],
    };
  }

  /**
   * GET /v1/memory/evidence
   * Query params: partyId OR issueId (one required)
   * Returns filtered issue evidence for the requested scope.
   */
  @Get('evidence')
  async getEvidence(
    @Req() req: Request,
    @Query('partyId') partyId?: string,
    @Query('issueId') issueId?: string,
  ): Promise<{ items: IssueEvidenceResponse[] }> {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const snap = await this.getAccessSnapshot(
        session.organizationId,
        session.actorMemberId,
        session.effectiveAt,
      );
      if (!snap) throw new Error('AUTH_REQUIRED');
      assertMemberActive(snap);

      if (!partyId && !issueId) {
        throw new Error('VALIDATION_FAILED'); // Must specify partyId or issueId
      }

      // Collect issues based on query
      let issues: Array<{
        id: string;
        organizationId: string;
        title: string | null;
        description: string;
        status: string;
        reportedByMemberId: string;
        currentOwnerMemberId: string | null;
        reportedAt: Date;
        version: number;
      }> = [];

      if (issueId) {
        const issue = await this.issueStore.getIssueInOrg(session.organizationId, issueId);
        if (issue) {
          issues = [issue];
        }
      } else if (partyId) {
        // Find issues referencing this party
        const refs = await this.issueStore.findIssuesByReference(
          session.organizationId,
          'party',
          partyId,
        );
        issues = refs;
      }

      // Convert to command format for evidence service
      const commandIssues: CommandIssueRecord[] = issues.map((i) => ({
        id: i.id,
        organizationId: i.organizationId,
        title: i.title,
        description: i.description,
        status: i.status as IssueStatus,
        reportedByMemberId: i.reportedByMemberId,
        ownerMemberId: i.currentOwnerMemberId,
        confirmedCause: null,
        resolution: null,
        outcome: null,
        reportedAt: i.reportedAt,
        triagedAt: null,
        progressStartedAt: null,
        resolvedAt: null,
        closedAt: null,
        reopenedAt: null,
        version: i.version,
      }));

      // Load journal entries for each issue
      const journalsByIssue = new Map<string, readonly CommandJournalRecord[]>();
      for (const issue of commandIssues) {
        const entries = await this.issueStore.listJournalEntriesForIssue(issue.id);
        const commandEntries: CommandJournalRecord[] = entries
          .filter((e) => e.organizationId === session.organizationId)
          .map((e) => ({
            id: e.id,
            organizationId: e.organizationId,
            issueId: e.issueId,
            entryType: e.entryType as IssueJournalType,
            content: e.content,
            createdByMemberId: e.authorMemberId,
            createdAt: e.recordedAt,
          }));
        journalsByIssue.set(issue.id, commandEntries);
      }

      // Use evidence service to filter by auth
      const filtered = this.evidenceService.retrieveIssueEvidence(
        {
          memberId: snap.memberId,
          organizationId: snap.organizationId,
          grantedScopes: snap.roleKeys,
        },
        commandIssues,
        journalsByIssue,
      );

      // Convert to response format
      const items: IssueEvidenceResponse[] = filtered.map((ev) => ({
        issue: {
          id: ev.issue.id,
          organizationId: ev.issue.organizationId,
          title: ev.issue.title,
          description: ev.issue.description,
          status: ev.issue.status,
          reportedByMemberId: ev.issue.reportedByMemberId,
          ownerMemberId: ev.issue.ownerMemberId,
          reportedAt: ev.issue.reportedAt.toISOString(),
          version: ev.issue.version,
        },
        journalEntries: ev.journalEntries.map((e) => ({
          id: e.id,
          issueId: e.issueId,
          entryType: e.entryType,
          content: e.content,
          createdByMemberId: e.createdByMemberId,
          createdAt: e.createdAt.toISOString(),
        })),
      }));

      return { items };
    } catch (err) {
      throw this.toHttp(err);
    }
  }

  /**
   * GET /v1/memory/changes?window=hoy|24h|7d
   * Org-wide recent changes from os_business_events. Admin read only.
   */
  @Get('changes')
  async listChanges(@Req() req: Request, @Query('window') windowRaw?: string) {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const ctx = await buildQueryContext(session, this.workforceStore);
      assertOrgMemoryScope(ctx);
      assertQueryTenantResource(ctx, ctx.organizationId);

      const window = parseMemoryWindow(windowRaw);
      const prisma = getOsPrisma();
      if (!prisma) {
        throw new HttpException({ code: 'SERVICE_UNAVAILABLE' }, HttpStatus.SERVICE_UNAVAILABLE);
      }

      const since = windowStart(window, ctx.effectiveAt);
      const rows = await prisma.osBusinessEvent.findMany({
        where: {
          organizationId: ctx.organizationId,
          occurredAt: { gte: since, lte: ctx.effectiveAt },
        },
        orderBy: { occurredAt: 'desc' },
        take: MEMORY_CHANGES_MAX,
      });

      return {
        window,
        boundary:
          'Ventana de cambios recientes en la organización. No sustituye el registro de auditoría completo.',
        items: rows.map((row) => ({
          id: row.id,
          occurredAt: row.occurredAt.toISOString(),
          actorMemberId: row.actorMemberId,
          eventLabel: humanizeEventType(row.eventType),
          eventType: row.eventType,
          entityLabel: entitySummaryLabel(row.primaryEntityType, row.primaryEntityId),
          primaryEntityType: row.primaryEntityType,
          primaryEntityId: row.primaryEntityId,
          correlationId: row.correlationId,
        })),
      };
    } catch (err) {
      throw this.toHttp(err);
    }
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
