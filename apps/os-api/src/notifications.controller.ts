/**
 * T09 — the signed-in member's internal notices.
 *
 * Internal only: no email, no push. Read, acknowledged and resolved are three separate facts.
 * Commitment due/overdue notices are produced lazily when the recipient asks (there is no
 * scheduler yet) and every notice for the commitment that no longer needs this member is resolved.
 * Authority comes from the session; a member only ever sees and updates their own notices.
 */
import { Controller, Get, HttpStatus, Inject, Param, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { createId } from '@isalwa/ts-utils';
import {
  deriveCommitmentState,
  type CommitmentRecord,
  type InternalNotification,
  type NotificationKind,
  type NotificationSourceType,
} from '@isalwa/os-contracts';
import { getOsPrisma, type PrismaOsCommitmentStore } from '@isalwa/os-database';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import {
  CommitmentReadAuthorizer,
  CONVERSATION_COVERAGE_READ_ACTIONS,
  buildQueryContext,
  canReadCustomer,
  type CustomerVisibilityLookup,
  type MemberQueryStorePort,
} from '@isalwa/os-query';
import { resolveSession } from './os-session';
import {
  OS_COMMITMENT_STORE,
  OS_CUSTOMER_VISIBILITY,
  OS_MEMBER_QUERY_STORE,
  OS_STORE,
} from './os-store.module';
import { httpError, paymentHttpError, type OsPrisma } from './payments-support';

/** Resolved notices stay visible for a while so "what happened to it" has an answer. */
const RESOLVED_VISIBLE_DAYS = 14;
const LIST_LIMIT = 50;

type NoticeRow = Awaited<ReturnType<OsPrisma['osInternalNotification']['findMany']>>[number];

function excerpt(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > 120 ? `${flat.slice(0, 117)}…` : flat;
}

function toNotice(row: NoticeRow): InternalNotification {
  return {
    id: row.id,
    organizationId: row.organizationId,
    recipientMemberId: row.recipientMemberId,
    kind: row.kind as NotificationKind,
    dedupKey: row.dedupKey,
    title: row.title,
    body: row.body,
    source: {
      recordType: row.sourceRecordType as NotificationSourceType,
      recordId: row.sourceRecordId,
      partyId: row.partyId,
    },
    channel: 'internal',
    readAt: row.readAt ? row.readAt.toISOString() : null,
    acknowledgedAt: row.acknowledgedAt ? row.acknowledgedAt.toISOString() : null,
    resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
    resolvedBecause: row.resolvedBecause === 'source_condition_gone' ? 'source_condition_gone' : null,
    createdAt: row.createdAt.toISOString(),
  };
}

function toContract(row: NonNullable<Awaited<ReturnType<PrismaOsCommitmentStore['getCommitmentInOrg']>>>): CommitmentRecord {
  return row as unknown as CommitmentRecord;
}

/** Does the commitment still need this member for the notice's reason? */
function stillNeeded(
  notice: Pick<NoticeRow, 'kind' | 'recipientMemberId'>,
  commitment: Parameters<typeof toContract>[0] | null,
  asOf: Date,
): boolean {
  if (!commitment || commitment.lifecycle !== 'open') return false;
  // "Your responsibility changed" is information for the previous owner; it ends with the commitment.
  if (notice.kind === 'responsibility_changed') return true;
  if (commitment.ownerMemberId !== notice.recipientMemberId) return false;
  if (notice.kind === 'commitment_due' || notice.kind === 'commitment_overdue') {
    const state = deriveCommitmentState(toContract(commitment), asOf);
    return notice.kind === 'commitment_due' ? state === 'due_today' : state === 'overdue';
  }
  return true;
}

@Controller('notifications')
export class NotificationsController {
  constructor(
    @Inject(OS_STORE) private readonly workforceStore: OsWorkforceStore,
    @Inject(OS_COMMITMENT_STORE) private readonly commitmentStore: PrismaOsCommitmentStore,
    @Inject(OS_CUSTOMER_VISIBILITY) private readonly customerVisibility: CustomerVisibilityLookup,
    @Inject(OS_MEMBER_QUERY_STORE) private readonly directReports: MemberQueryStorePort,
  ) {}

  private prisma(): OsPrisma {
    const prisma = getOsPrisma();
    if (!prisma) throw httpError(HttpStatus.SERVICE_UNAVAILABLE, 'DATABASE_UNAVAILABLE');
    return prisma;
  }

  /**
   * Resolve notices whose condition is gone, then admit due/overdue notices for the member's open
   * commitments. Idempotent: the unresolved dedup key keeps one notice per recipient and reason.
   */
  private async syncCommitmentNotices(
    prisma: OsPrisma,
    organizationId: string,
    memberId: string,
    asOf: Date,
  ): Promise<void> {
    const unresolved = await prisma.osInternalNotification.findMany({
      where: {
        organizationId,
        recipientMemberId: memberId,
        sourceRecordType: 'commitment',
        resolvedAt: null,
      },
    });
    if (unresolved.length > 0) {
      const ids = [...new Set(unresolved.map((n) => n.sourceRecordId))];
      const rows = await prisma.osCommitment.findMany({ where: { organizationId, id: { in: ids } } });
      const byId = new Map(rows.map((r) => [r.id, r]));
      for (const notice of unresolved) {
        const commitment = byId.get(notice.sourceRecordId) ?? null;
        if (stillNeeded(notice, commitment as never, asOf)) continue;
        await prisma.osInternalNotification.updateMany({
          where: { id: notice.id, organizationId, resolvedAt: null },
          data: { resolvedAt: asOf, resolvedBecause: 'source_condition_gone' },
        });
      }
    }

    const open = await this.commitmentStore.listOpenCommitmentsByOwner(organizationId, memberId);
    const data = open.flatMap((commitment) => {
      const state = deriveCommitmentState(toContract(commitment), asOf);
      if (state !== 'due_today' && state !== 'overdue') return [];
      const kind = state === 'overdue' ? 'commitment_overdue' : 'commitment_due';
      return [
        {
          id: createId(),
          organizationId,
          recipientMemberId: memberId,
          kind,
          dedupKey: `${kind}:commitment:${commitment.id}`,
          title: state === 'overdue' ? 'Compromiso vencido' : 'Compromiso para hoy',
          body: excerpt(commitment.text),
          sourceRecordType: 'commitment',
          sourceRecordId: commitment.id,
          partyId: commitment.partyId ?? null,
          channel: 'internal',
        },
      ];
    });
    if (data.length > 0) {
      await prisma.osInternalNotification.createMany({ data, skipDuplicates: true });
    }
  }

  /**
   * A conversation notice stays with the person who is accountable now.
   * Reassignment does not delete the earlier row. The current account owner receives
   * the attention notice, and a recipient who can no longer read the conversation
   * no longer sees it as open work.
   */
  private async syncConversationOwnerNotices(
    prisma: OsPrisma,
    organizationId: string,
    memberId: string,
  ): Promise<void> {
    const accounts = await prisma.osCommercialAccount.findMany({
      where: { organizationId, ownerMemberId: memberId, status: 'active' },
      select: { partyId: true },
    });
    if (accounts.length === 0) return;
    const partyIds = accounts.map((account) => account.partyId);
    const conversations = await prisma.osCustomerConversation.findMany({
      where: { organizationId, customerId: { in: partyIds } },
      select: { id: true, customerId: true },
    });
    if (conversations.length === 0) return;
    const conversationIds = conversations.map((conversation) => conversation.id);
    const existing = await prisma.osInternalNotification.findMany({
      where: {
        organizationId,
        sourceRecordType: 'conversation',
        sourceRecordId: { in: conversationIds },
        kind: 'customer_attention',
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    const pending = conversations.flatMap((conversation) => {
      const notices = existing.filter((notice) => notice.sourceRecordId === conversation.id);
      if (notices.length === 0) return [];
      const openForOwner = notices.some(
        (notice) => notice.recipientMemberId === memberId && notice.resolvedAt === null,
      );
      const openForSomeoneElse = notices.find(
        (notice) => notice.recipientMemberId !== memberId && notice.resolvedAt === null,
      );
      if (openForOwner || !openForSomeoneElse) return [];
      return [
        {
          id: createId(),
          organizationId,
          recipientMemberId: memberId,
          kind: 'customer_attention' as const,
          dedupKey: `customer_attention:conversation:${conversation.id}`,
          title: openForSomeoneElse.title,
          body: openForSomeoneElse.body,
          sourceRecordType: 'conversation' as const,
          sourceRecordId: conversation.id,
          partyId: conversation.customerId,
          channel: 'internal' as const,
        },
      ];
    });
    if (pending.length > 0) {
      await prisma.osInternalNotification.createMany({ data: pending, skipDuplicates: true });
    }
  }

  private async readableConversationIds(
    session: Awaited<ReturnType<typeof resolveSession>>,
    prisma: OsPrisma,
    conversationIds: readonly string[],
  ): Promise<Set<string>> {
    const readable = new Set<string>();
    if (conversationIds.length === 0) return readable;
    const conversations = await prisma.osCustomerConversation.findMany({
      where: { organizationId: session.organizationId, id: { in: [...conversationIds] } },
      select: { id: true, customerId: true },
    });
    const ctx = await buildQueryContext(session, this.workforceStore);
    const partyReadable = new Map<string, boolean>();
    for (const conversation of conversations) {
      let allowed = partyReadable.get(conversation.customerId);
      if (allowed === undefined) {
        allowed = await canReadCustomer({
          ctx,
          partyId: conversation.customerId,
          lookup: this.customerVisibility,
          directReports: this.directReports,
          coverageActions: CONVERSATION_COVERAGE_READ_ACTIONS,
        });
        partyReadable.set(conversation.customerId, allowed);
      }
      if (allowed) readable.add(conversation.id);
    }
    return readable;
  }

  @Get()
  async list(@Query('limit') limit: string | undefined, @Req() req: Request): Promise<{ items: InternalNotification[] }> {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const prisma = this.prisma();
      const asOf = new Date();
      await this.syncCommitmentNotices(prisma, session.organizationId, session.actorMemberId, asOf);
      await this.syncConversationOwnerNotices(prisma, session.organizationId, session.actorMemberId);

      const take = Math.min(Math.max(limit ? parseInt(limit, 10) || LIST_LIMIT : LIST_LIMIT, 1), 100);
      const since = new Date(asOf.getTime() - RESOLVED_VISIBLE_DAYS * 86_400_000);
      const rows = await prisma.osInternalNotification.findMany({
        where: {
          organizationId: session.organizationId,
          recipientMemberId: session.actorMemberId,
          OR: [{ resolvedAt: null }, { resolvedAt: { gt: since } }],
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take,
      });

      // A notice about a commitment is only shown while the member may still read that commitment.
      const commitmentIds = [...new Set(rows.filter((r) => r.sourceRecordType === 'commitment').map((r) => r.sourceRecordId))];
      const readable = new Set<string>();
      if (commitmentIds.length > 0) {
        const ctx = await buildQueryContext(session, this.workforceStore);
        const reader = new CommitmentReadAuthorizer(ctx, {
          directReports: this.directReports,
          customerVisibility: this.customerVisibility,
        });
        const commitments = await prisma.osCommitment.findMany({
          where: { organizationId: session.organizationId, id: { in: commitmentIds } },
        });
        for (const commitment of commitments) {
          if (await reader.canRead(commitment as never)) readable.add(commitment.id);
        }
      }
      const conversationIds = [
        ...new Set(rows.filter((r) => r.sourceRecordType === 'conversation').map((r) => r.sourceRecordId)),
      ];
      const readableConversations = await this.readableConversationIds(session, prisma, conversationIds);
      const visible = rows.filter((r) => {
        if (r.sourceRecordType === 'commitment') return readable.has(r.sourceRecordId);
        if (r.sourceRecordType === 'conversation') return readableConversations.has(r.sourceRecordId);
        return true;
      });
      return { items: visible.map(toNotice) };
    } catch (err) {
      throw paymentHttpError(err);
    }
  }

  /** Marks the member's own notice as seen. Does not acknowledge it and does not resolve it. */
  @Post(':notificationId/read')
  async markRead(@Param('notificationId') notificationId: string, @Req() req: Request): Promise<{ item: InternalNotification }> {
    return this.stamp(notificationId, req, 'readAt');
  }

  /** The member confirms they took it on. Independent of read; never resolves the notice. */
  @Post(':notificationId/acknowledge')
  async acknowledge(
    @Param('notificationId') notificationId: string,
    @Req() req: Request,
  ): Promise<{ item: InternalNotification }> {
    return this.stamp(notificationId, req, 'acknowledgedAt');
  }

  private async stamp(
    notificationId: string,
    req: Request,
    field: 'readAt' | 'acknowledgedAt',
  ): Promise<{ item: InternalNotification }> {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const prisma = this.prisma();
      const where = {
        id: notificationId,
        organizationId: session.organizationId,
        recipientMemberId: session.actorMemberId,
      };
      // First stamp wins; a repeat keeps the original time.
      const row = await prisma.osInternalNotification.findFirst({ where });
      if (!row) throw httpError(HttpStatus.NOT_FOUND, 'NOT_FOUND');
      if (row.sourceRecordType === 'conversation') {
        const readableConversations = await this.readableConversationIds(session, prisma, [row.sourceRecordId]);
        if (!readableConversations.has(row.sourceRecordId)) throw httpError(HttpStatus.NOT_FOUND, 'NOT_FOUND');
      }
      await prisma.osInternalNotification.updateMany({ where: { ...where, [field]: null }, data: { [field]: new Date() } });
      const stamped = await prisma.osInternalNotification.findFirst({ where });
      if (!stamped) throw httpError(HttpStatus.NOT_FOUND, 'NOT_FOUND');
      return { item: toNotice(stamped) };
    } catch (err) {
      throw paymentHttpError(err);
    }
  }
}
