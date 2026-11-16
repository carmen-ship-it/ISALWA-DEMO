import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  deriveCommitmentState,
  type CommitmentChange,
  type CommitmentChangeKind,
  type CommitmentRecord,
  type CommitmentState,
} from '@isalwa/os-contracts';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import type { CommitmentChangeRow, PrismaOsCommitmentStore } from '@isalwa/os-database';
import {
  buildQueryContext,
  CommitmentHandoverAuthorizer,
  CommitmentReadAuthorizer,
  type CustomerVisibilityLookup,
  type QueryContext,
  type MemberQueryStorePort,
} from '@isalwa/os-query';
import { resolveSession } from './os-session';
import {
  OS_STORE,
  OS_COMMITMENT_STORE,
  OS_CUSTOMER_VISIBILITY,
  OS_MEMBER_QUERY_STORE,
} from './os-store.module';

type CommitmentSummary = {
  id: string;
  organizationId: string;
  partyId: string | null;
  ownerMemberId: string;
  text: string;
  dueAt: string | null;
  origin: string;
  relatedSubjectType: string | null;
  relatedSubjectId: string | null;
  lifecycle: string;
  state: CommitmentState;
  createdByMemberId: string;
  createdAt: string;
  fulfilledAt: string | null;
  fulfilledByMemberId: string | null;
  cancelledAt: string | null;
  /** Whether the current owner still has access. A commitment of a member who lost access needs a new owner. */
  ownerAccessActive: boolean;
  /** What the signed-in member can do with this commitment right now. Same rules the commands enforce. */
  actor: {
    canFulfill: boolean;
    canReschedule: boolean;
    canCancel: boolean;
    canReassign: boolean;
    /** Why the member may hand it over: they own it, manage the account, or it is workforce continuity. */
    handoverAuthority: 'owner' | 'customer_manager' | 'workforce_continuity' | null;
  };
};

type CommitmentDetail = CommitmentSummary & { changes: CommitmentChange[] };

function toChange(row: CommitmentChangeRow): CommitmentChange {
  return {
    id: row.id,
    commitmentId: row.commitmentId,
    kind: row.kind as CommitmentChangeKind,
    actorMemberId: row.actorMemberId,
    reason: row.reason,
    previousDueAt: row.previousDueAt ? row.previousDueAt.toISOString() : null,
    newDueAt: row.newDueAt ? row.newDueAt.toISOString() : null,
    previousOwnerMemberId: row.previousOwnerMemberId,
    newOwnerMemberId: row.newOwnerMemberId,
    changedAt: row.changedAt.toISOString(),
  };
}

type Viewer = {
  ctx: QueryContext;
  read: CommitmentReadAuthorizer;
  handover: CommitmentHandoverAuthorizer;
  ownerActive: (memberId: string) => Promise<boolean>;
};

function toSummary(
  record: CommitmentRecord & { fulfilledByMemberId?: string | null },
  asOf: Date,
): CommitmentSummary {
  return {
    id: record.id,
    organizationId: record.organizationId,
    partyId: record.partyId,
    ownerMemberId: record.ownerMemberId,
    text: record.text,
    dueAt: record.dueAt,
    origin: record.origin,
    relatedSubjectType: record.relatedSubjectType,
    relatedSubjectId: record.relatedSubjectId,
    lifecycle: record.lifecycle,
    state: deriveCommitmentState(record, asOf),
    createdByMemberId: record.createdByMemberId,
    createdAt: record.createdAt,
    fulfilledAt: record.fulfilledAt,
    fulfilledByMemberId: record.fulfilledByMemberId ?? null,
    cancelledAt: record.cancelledAt,
    ownerAccessActive: true,
    actor: { canFulfill: false, canReschedule: false, canCancel: false, canReassign: false, handoverAuthority: null },
  };
}

function dbToContract(db: {
  id: string;
  organizationId: string;
  partyId: string | null;
  ownerMemberId: string;
  text: string;
  dueAt: Date | null;
  origin: string;
  relatedSubjectType: string | null;
  relatedSubjectId: string | null;
  lifecycle: string;
  createdByMemberId: string;
  createdAt: Date;
  fulfilledAt: Date | null;
  fulfilledByMemberId?: string | null;
  cancelledAt: Date | null;
  provenanceSuggestionId: string | null;
}): CommitmentRecord & { fulfilledByMemberId: string | null } {
  return {
    id: db.id,
    organizationId: db.organizationId,
    partyId: db.partyId,
    ownerMemberId: db.ownerMemberId,
    text: db.text,
    dueAt: db.dueAt ? db.dueAt.toISOString() : null,
    origin: db.origin as CommitmentRecord['origin'],
    relatedSubjectType: db.relatedSubjectType as CommitmentRecord['relatedSubjectType'],
    relatedSubjectId: db.relatedSubjectId,
    lifecycle: db.lifecycle as CommitmentRecord['lifecycle'],
    createdByMemberId: db.createdByMemberId,
    createdAt: db.createdAt.toISOString(),
    fulfilledAt: db.fulfilledAt ? db.fulfilledAt.toISOString() : null,
    fulfilledByMemberId: db.fulfilledByMemberId ?? null,
    cancelledAt: db.cancelledAt ? db.cancelledAt.toISOString() : null,
    provenanceSuggestionId: db.provenanceSuggestionId,
    canonical: true,
  };
}

@Controller('commitments')
export class CommitmentsController {
  constructor(
    @Inject(OS_STORE) private readonly workforceStore: OsWorkforceStore,
    @Inject(OS_COMMITMENT_STORE) private readonly commitmentStore: PrismaOsCommitmentStore,
    @Inject(OS_MEMBER_QUERY_STORE) private readonly directReports: MemberQueryStorePort,
    @Inject(OS_CUSTOMER_VISIBILITY) private readonly customerVisibility: CustomerVisibilityLookup,
  ) {}

  private async viewer(req: Request): Promise<Viewer> {
    const session = await resolveSession(req, this.workforceStore);
    const ctx = await buildQueryContext(session, this.workforceStore);
    const deps = { directReports: this.directReports, customerVisibility: this.customerVisibility };
    const owners = new Map<string, Promise<boolean>>();
    return {
      ctx,
      read: new CommitmentReadAuthorizer(ctx, deps),
      handover: new CommitmentHandoverAuthorizer(ctx, deps),
      ownerActive: (memberId) => {
        let cached = owners.get(memberId);
        if (!cached) {
          cached = this.workforceStore
            .getMemberInOrg(ctx.organizationId, memberId)
            .then((member) => member?.accessStatus === 'active');
          owners.set(memberId, cached);
        }
        return cached;
      },
    };
  }

  /** The summary plus what this member may do, from the same rules the commands apply. */
  private async annotate(
    record: Awaited<ReturnType<PrismaOsCommitmentStore['getCommitmentInOrg']>> & object,
    viewer: Viewer,
    asOf: Date,
  ): Promise<CommitmentSummary> {
    const summary = toSummary(dbToContract(record), asOf);
    const ownerActive = await viewer.ownerActive(record.ownerMemberId);
    const open = record.lifecycle === 'open';
    const isOwner = viewer.ctx.auth.accessStatus === 'active' && record.ownerMemberId === viewer.ctx.auth.memberId;
    let handoverAuthority: CommitmentSummary['actor']['handoverAuthority'] = null;
    if (open) {
      handoverAuthority = isOwner
        ? 'owner'
        : ((await viewer.handover.authority(record, ownerActive))?.kind ?? null);
    }
    return {
      ...summary,
      ownerAccessActive: ownerActive,
      actor: {
        canFulfill: open && isOwner,
        canReschedule: open && isOwner,
        canCancel: open && isOwner,
        canReassign: handoverAuthority !== null,
        handoverAuthority,
      },
    };
  }

  @Get()
  async listCommitments(
    @Query('partyId') partyId: string | undefined,
    @Query('ownerMemberId') ownerMemberId: string | undefined,
    @Query('lifecycle') lifecycle: 'open' | 'fulfilled' | 'cancelled' | undefined,
    @Query('view') view: string | undefined,
    @Query('limit') limit: string | undefined,
    @Query('cursor') cursor: string | undefined,
    @Req() req: Request,
  ): Promise<{
    items: CommitmentSummary[];
    meta: { hasMore: boolean; nextCursor: string | null; limit: number };
  }> {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const asOf = new Date();
      const viewer = await this.viewer(req);

      let records;
      if (view === 'reassignment') {
        // Open commitments whose owner lost access, limited to those this member may hand over.
        const open = (await this.commitmentStore.listCommitmentsByOrg(session.organizationId)).filter(
          (r) => r.lifecycle === 'open',
        );
        const owned = await Promise.all(open.map((r) => viewer.ownerActive(r.ownerMemberId)));
        const orphaned = open.filter((_, index) => !owned[index]);
        const allowed = await Promise.all(
          orphaned.map(async (r) => (await viewer.handover.authority(r, false)) !== null),
        );
        records = orphaned.filter((_, index) => allowed[index]);
      } else {
        if (partyId) {
          records = await this.commitmentStore.listCommitmentsByParty(session.organizationId, partyId);
        } else if (ownerMemberId) {
          records =
            lifecycle === 'open'
              ? await this.commitmentStore.listOpenCommitmentsByOwner(session.organizationId, ownerMemberId)
              : await this.commitmentStore.listCommitmentsByOwner(session.organizationId, ownerMemberId);
        } else {
          records = await this.commitmentStore.listCommitmentsByOrg(session.organizationId);
        }
        if (lifecycle) {
          records = records.filter((r) => r.lifecycle === lifecycle);
        }
        records = await viewer.read.filter(records);
      }

      // Stable newest-first page for desk navigation.
      records = [...records].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      const limitNum = Math.min(Math.max(limit ? parseInt(limit, 10) || 25 : 25, 1), 100);
      let offsetNum = 0;
      if (cursor && /^\d+$/.test(cursor)) offsetNum = parseInt(cursor, 10);
      if (!Number.isFinite(offsetNum) || offsetNum < 0) offsetNum = 0;
      const page = records.slice(offsetNum, offsetNum + limitNum);
      const hasMore = offsetNum + page.length < records.length;
      const items = await Promise.all(page.map((r) => this.annotate(r, viewer, asOf)));
      return {
        items,
        meta: {
          hasMore,
          nextCursor: hasMore ? String(offsetNum + page.length) : null,
          limit: limitNum,
        },
      };
    } catch (err) {
      throw this.toHttp(err);
    }
  }

  @Get(':commitmentId')
  async getCommitment(
    @Param('commitmentId') commitmentId: string,
    @Req() req: Request,
  ): Promise<CommitmentDetail> {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const viewer = await this.viewer(req);
      const record = await this.commitmentStore.getCommitmentInOrg(
        session.organizationId,
        commitmentId,
      );
      if (!record) throw new Error('NOT_FOUND');
      // Besides the usual readers, a member who may hand it over sees an orphaned commitment (workforce continuity).
      const handoverView =
        record.lifecycle === 'open' &&
        !(await viewer.ownerActive(record.ownerMemberId)) &&
        (await viewer.handover.authority(record, false)) !== null;
      if (!(await viewer.read.canRead(record)) && !handoverView) throw new Error('NOT_FOUND');
      const summary = await this.annotate(record, viewer, new Date());
      const changes = await this.commitmentStore.listCommitmentChanges(session.organizationId, commitmentId);
      return { ...summary, changes: changes.map(toChange) };
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
