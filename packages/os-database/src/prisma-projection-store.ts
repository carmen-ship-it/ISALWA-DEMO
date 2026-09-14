import type {
  AttentionType,
  ListAttentionQuery,
  ListOpenWorkQuery,
  ListOpportunitiesQuery,
  ListOrdersQuery,
  ListPartyTimelineQuery,
  ListPendingApprovalsQuery,
  ListQuotesQuery,
  ProjectionFreshness,
  SearchPartiesQuery,
} from '@isalwa/os-contracts';
import { EVENT_SCHEMA_VERSION_POLICY } from '@isalwa/os-contracts';
import type {
  OsProjectionStorePort,
  ServerListConstraints,
  ProjectionCheckpoint,
  ReplayBusinessEvent,
  StoredApprovalReadModel,
  StoredAttentionReadModel,
  StoredOpportunityReadModel,
  StoredOrderReadModel,
  StoredPartyReadModel,
  StoredPartyTimelineEntry,
  StoredQuoteLineReadModel,
  StoredQuoteReadModel,
  StoredWorkReadModel,
} from '@isalwa/os-query';
import {
  deriveAttentionReadModels,
  organizationIdsNeedingOverdueRefresh,
} from '@isalwa/os-query';
import type { OsPrismaClient } from './client';
import { Prisma } from './generated/client';

function mapPartyRow(row: {
  partyId: string;
  organizationId: string;
  partyKind: string;
  displayName: string;
  legalName: string | null;
  status: string;
  mergedIntoPartyId: string | null;
  activeRoleKeys: string[];
  hasCommercialAccount: boolean;
  commercialAccountStatus: string | null;
  duplicateStatus: string | null;
  searchText: string;
  lastEventId: string | null;
  lastOccurredAt: Date | null;
  updatedAt: Date;
}): StoredPartyReadModel {
  return {
    partyId: row.partyId,
    organizationId: row.organizationId,
    partyKind: row.partyKind,
    displayName: row.displayName,
    legalName: row.legalName,
    status: row.status,
    activeRoleKeys: row.activeRoleKeys,
    hasCommercialAccount: row.hasCommercialAccount,
    commercialAccountStatus: row.commercialAccountStatus,
    mergedIntoPartyId: row.mergedIntoPartyId,
    duplicateStatus: row.duplicateStatus as StoredPartyReadModel['duplicateStatus'],
    searchText: row.searchText,
    lastEventId: row.lastEventId,
    lastOccurredAt: row.lastOccurredAt,
    updatedAt: row.updatedAt,
  };
}

function decodeCursor(cursor?: string): { displayName: string; partyId: string } | null {
  if (!cursor) return null;
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(raw) as { displayName: string; partyId: string };
    if (!parsed.displayName || !parsed.partyId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function encodePartySearchCursor(displayName: string, partyId: string): string {
  return Buffer.from(JSON.stringify({ displayName, partyId }), 'utf8').toString('base64url');
}

function decodeWorkCursor(cursor?: string): { title: string; workItemId: string } | null {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
      title: string;
      workItemId: string;
    };
    if (!parsed.title || !parsed.workItemId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function decodeApprovalCursor(cursor?: string): { approvalRequestId: string } | null {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
      approvalRequestId: string;
    };
    if (!parsed.approvalRequestId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function decodeAttentionCursor(cursor?: string): { attentionKey: string } | null {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
      attentionKey: string;
    };
    if (!parsed.attentionKey) return null;
    return parsed;
  } catch {
    return null;
  }
}

function decodeOpportunityCursor(cursor?: string): { title: string; opportunityId: string } | null {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
      title: string;
      opportunityId: string;
    };
    if (!parsed.title || !parsed.opportunityId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function decodeQuoteCursor(cursor?: string): { quoteNumber: string; quoteId: string } | null {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
      quoteNumber: string;
      quoteId: string;
    };
    if (!parsed.quoteNumber || !parsed.quoteId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function decodeOrderCursor(cursor?: string): { orderNumber: string; orderId: string } | null {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
      orderNumber: string;
      orderId: string;
    };
    if (!parsed.orderNumber || !parsed.orderId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function decodePartyTimelineCursor(cursor?: string): { occurredAt: string; entryId: string } | null {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
      occurredAt: string;
      entryId: string;
    };
    if (!parsed.occurredAt || !parsed.entryId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function mapWorkRow(row: {
  workItemId: string;
  organizationId: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  ownerMemberId: string;
  createdByMemberId: string;
  subjectType: string | null;
  subjectId: string | null;
  dueAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  pendingApprovalId: string | null;
  approvalStatus: string;
  ownershipChangeCount: number;
  lastOwnershipChangeAt: Date | null;
  lastReassignedAt: Date | null;
  lastEventId: string | null;
  lastOccurredAt: Date | null;
  updatedAt: Date;
}): StoredWorkReadModel {
  return {
    workItemId: row.workItemId,
    organizationId: row.organizationId,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    ownerMemberId: row.ownerMemberId,
    createdByMemberId: row.createdByMemberId,
    subjectType: row.subjectType,
    subjectId: row.subjectId,
    dueAt: row.dueAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    pendingApprovalId: row.pendingApprovalId,
    approvalStatus: row.approvalStatus as StoredWorkReadModel['approvalStatus'],
    ownershipChangeCount: row.ownershipChangeCount,
    lastOwnershipChangeAt: row.lastOwnershipChangeAt?.toISOString() ?? null,
    lastEventId: row.lastEventId,
    lastOccurredAt: row.lastOccurredAt,
    lastReassignedAt: row.lastReassignedAt,
    updatedAt: row.updatedAt,
  };
}

function mapApprovalRow(row: {
  approvalRequestId: string;
  organizationId: string;
  workItemId: string | null;
  subjectType: string;
  subjectId: string;
  requestedByMemberId: string;
  approverMemberId: string;
  status: string;
  decisionByMemberId: string | null;
  decisionReason: string | null;
  decidedAt: Date | null;
  requiredScope: string | null;
  lastEventId: string | null;
  lastOccurredAt: Date | null;
  updatedAt: Date;
}): StoredApprovalReadModel {
  return {
    approvalRequestId: row.approvalRequestId,
    organizationId: row.organizationId,
    workItemId: row.workItemId,
    subjectType: row.subjectType,
    subjectId: row.subjectId,
    requestedByMemberId: row.requestedByMemberId,
    approverMemberId: row.approverMemberId,
    status: row.status,
    decisionByMemberId: row.decisionByMemberId,
    decisionReason: row.decisionReason,
    decidedAt: row.decidedAt?.toISOString() ?? null,
    requiredScope: row.requiredScope,
    lastEventId: row.lastEventId,
    lastOccurredAt: row.lastOccurredAt,
    updatedAt: row.updatedAt,
  };
}

function attentionCreateData(item: StoredAttentionReadModel) {
  return {
    attentionKey: item.attentionKey,
    organizationId: item.organizationId,
    memberId: item.memberId,
    attentionType: item.attentionType,
    reasonCode: item.reasonCode,
    reasonDetailJson: item.reasonDetail as Prisma.InputJsonValue,
    resourceType: item.resourceType,
    resourceId: item.resourceId,
    workItemId: item.workItemId,
    approvalRequestId: item.approvalRequestId,
    subjectType: item.subjectType,
    subjectId: item.subjectId,
    isActive: item.isActive,
    derivedAt: item.derivedAt,
  };
}

function mapAttentionRow(row: {
  attentionKey: string;
  organizationId: string;
  memberId: string;
  attentionType: string;
  reasonCode: string;
  reasonDetailJson: unknown;
  resourceType: string;
  resourceId: string;
  workItemId: string | null;
  approvalRequestId: string | null;
  subjectType: string | null;
  subjectId: string | null;
  isActive: boolean;
  derivedAt: Date;
  updatedAt: Date;
}): StoredAttentionReadModel {
  return {
    attentionKey: row.attentionKey,
    organizationId: row.organizationId,
    memberId: row.memberId,
    attentionType: row.attentionType as AttentionType,
    reasonCode: row.reasonCode,
    reasonDetail: (row.reasonDetailJson as Record<string, unknown>) ?? {},
    resourceType: row.resourceType as 'work_item' | 'approval_request',
    resourceId: row.resourceId,
    workItemId: row.workItemId,
    approvalRequestId: row.approvalRequestId,
    subjectType: row.subjectType,
    subjectId: row.subjectId,
    isActive: row.isActive,
    derivedAt: row.derivedAt,
    updatedAt: row.updatedAt,
  };
}

function mapOpportunityRow(row: {
  opportunityId: string;
  organizationId: string;
  partyId: string;
  commercialAccountId: string | null;
  ownerMemberId: string;
  title: string;
  stage: string;
  status: string;
  expectedValueCentavos: bigint | null;
  closedAt: Date | null;
  createdAt: Date;
  lastEventId: string | null;
  lastOccurredAt: Date | null;
  updatedAt: Date;
}): StoredOpportunityReadModel {
  return { ...row };
}

function mapQuoteRow(row: {
  quoteId: string;
  organizationId: string;
  partyId: string;
  commercialAccountId: string | null;
  opportunityId: string | null;
  ownerMemberId: string;
  quoteNumber: string;
  status: string;
  currency: string;
  subtotalCentavos: bigint;
  headerDiscountCentavos: bigint;
  totalCentavos: bigint;
  revisionNumber: number;
  notes: string | null;
  submittedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  lastEventId: string | null;
  lastOccurredAt: Date | null;
  updatedAt: Date;
}): StoredQuoteReadModel {
  return { ...row };
}

function mapQuoteLineRow(row: {
  quoteLineId: string;
  organizationId: string;
  quoteId: string;
  lineNumber: number;
  description: string;
  quantity: number;
  unitLabel: string | null;
  unitPriceCentavos: bigint;
  discountCentavos: bigint;
  lineTotalCentavos: bigint;
  productRef: string | null;
  updatedAt: Date;
}): StoredQuoteLineReadModel {
  return { ...row };
}

function mapOrderRow(row: {
  orderId: string;
  organizationId: string;
  partyId: string;
  commercialAccountId: string | null;
  quoteId: string;
  ownerMemberId: string;
  orderNumber: string;
  status: string;
  currency: string;
  subtotalCentavos: bigint;
  headerDiscountCentavos: bigint;
  totalCentavos: bigint;
  cancelledAt: Date | null;
  createdAt: Date;
  lastEventId: string | null;
  lastOccurredAt: Date | null;
  updatedAt: Date;
}): StoredOrderReadModel {
  return { ...row };
}

export class PrismaOsProjectionStore implements OsProjectionStorePort {
  constructor(private readonly prisma: OsPrismaClient) {}

  async upsertPartyReadModel(model: StoredPartyReadModel): Promise<void> {
    await this.prisma.osPartyReadModel.upsert({
      where: { partyId: model.partyId },
      create: {
        partyId: model.partyId,
        organizationId: model.organizationId,
        partyKind: model.partyKind,
        displayName: model.displayName,
        legalName: model.legalName,
        status: model.status,
        mergedIntoPartyId: model.mergedIntoPartyId,
        activeRoleKeys: model.activeRoleKeys,
        hasCommercialAccount: model.hasCommercialAccount,
        commercialAccountStatus: model.commercialAccountStatus,
        duplicateStatus: model.duplicateStatus,
        searchText: model.searchText,
        lastEventId: model.lastEventId,
        lastOccurredAt: model.lastOccurredAt,
      },
      update: {
        partyKind: model.partyKind,
        displayName: model.displayName,
        legalName: model.legalName,
        status: model.status,
        mergedIntoPartyId: model.mergedIntoPartyId,
        activeRoleKeys: model.activeRoleKeys,
        hasCommercialAccount: model.hasCommercialAccount,
        commercialAccountStatus: model.commercialAccountStatus,
        duplicateStatus: model.duplicateStatus,
        searchText: model.searchText,
        lastEventId: model.lastEventId,
        lastOccurredAt: model.lastOccurredAt,
      },
    });
  }

  async getPartyReadModel(
    organizationId: string,
    partyId: string,
  ): Promise<StoredPartyReadModel | null> {
    const row = await this.prisma.osPartyReadModel.findFirst({
      where: { organizationId, partyId },
    });
    return row ? mapPartyRow(row) : null;
  }

  async deletePartyReadModelsForOrg(organizationId: string): Promise<void> {
    await this.prisma.osPartyReadModel.deleteMany({ where: { organizationId } });
  }

  async searchParties(
    organizationId: string,
    query: SearchPartiesQuery,
  ): Promise<{ items: StoredPartyReadModel[]; hasMore: boolean }> {
    const limit = query.limit ?? 25;
    const cursor = decodeCursor(query.cursor);
    const q = query.q?.trim();

    const where: Record<string, unknown> = { organizationId };
    if (query.status) where.status = query.status;
    if (query.roleKey) where.activeRoleKeys = { has: query.roleKey };
    if (q) where.searchText = { contains: q, mode: 'insensitive' };
    if (cursor) {
      where.OR = [
        { displayName: { gt: cursor.displayName } },
        { AND: [{ displayName: cursor.displayName }, { partyId: { gt: cursor.partyId } }] },
      ];
    }

    const rows = await this.prisma.osPartyReadModel.findMany({
      where: where as never,
      orderBy: [{ displayName: 'asc' }, { partyId: 'asc' }],
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    return { items: slice.map(mapPartyRow), hasMore };
  }

  async upsertWorkReadModel(model: StoredWorkReadModel): Promise<void> {
    await this.prisma.osWorkReadModel.upsert({
      where: { workItemId: model.workItemId },
      create: {
        workItemId: model.workItemId,
        organizationId: model.organizationId,
        title: model.title,
        description: model.description,
        status: model.status,
        priority: model.priority,
        ownerMemberId: model.ownerMemberId,
        createdByMemberId: model.createdByMemberId,
        subjectType: model.subjectType,
        subjectId: model.subjectId,
        dueAt: model.dueAt ? new Date(model.dueAt) : null,
        completedAt: model.completedAt ? new Date(model.completedAt) : null,
        cancelledAt: model.cancelledAt ? new Date(model.cancelledAt) : null,
        pendingApprovalId: model.pendingApprovalId,
        approvalStatus: model.approvalStatus,
        ownershipChangeCount: model.ownershipChangeCount,
        lastOwnershipChangeAt: model.lastOwnershipChangeAt
          ? new Date(model.lastOwnershipChangeAt)
          : null,
        lastReassignedAt: model.lastReassignedAt,
        lastEventId: model.lastEventId,
        lastOccurredAt: model.lastOccurredAt,
      },
      update: {
        title: model.title,
        description: model.description,
        status: model.status,
        priority: model.priority,
        ownerMemberId: model.ownerMemberId,
        subjectType: model.subjectType,
        subjectId: model.subjectId,
        dueAt: model.dueAt ? new Date(model.dueAt) : null,
        completedAt: model.completedAt ? new Date(model.completedAt) : null,
        cancelledAt: model.cancelledAt ? new Date(model.cancelledAt) : null,
        pendingApprovalId: model.pendingApprovalId,
        approvalStatus: model.approvalStatus,
        ownershipChangeCount: model.ownershipChangeCount,
        lastOwnershipChangeAt: model.lastOwnershipChangeAt
          ? new Date(model.lastOwnershipChangeAt)
          : null,
        lastReassignedAt: model.lastReassignedAt,
        lastEventId: model.lastEventId,
        lastOccurredAt: model.lastOccurredAt,
      },
    });
  }

  async getWorkReadModel(
    organizationId: string,
    workItemId: string,
  ): Promise<StoredWorkReadModel | null> {
    const row = await this.prisma.osWorkReadModel.findFirst({
      where: { organizationId, workItemId },
    });
    return row ? mapWorkRow(row) : null;
  }

  async listWorkReadModels(
    organizationId: string,
    query: ListOpenWorkQuery & ServerListConstraints,
  ): Promise<{ items: StoredWorkReadModel[]; hasMore: boolean }> {
    const limit = query.limit ?? 25;
    const cursor = decodeWorkCursor(query.cursor);
    const where: Record<string, unknown> = { organizationId };
    if (query.ownerMemberIds && query.ownerMemberIds.length === 0) {
      return { items: [], hasMore: false };
    }
    if (query.status) where.status = query.status;
    if (query.ownerMemberIds) where.ownerMemberId = { in: [...query.ownerMemberIds] };
    else if (query.ownerMemberId) where.ownerMemberId = query.ownerMemberId;
    if (query.subjectTypes && query.subjectTypes.length === 0) {
      return { items: [], hasMore: false };
    }
    if (query.subjectTypes) where.subjectType = { in: [...query.subjectTypes] };
    else if (query.subjectType) where.subjectType = query.subjectType;
    if (query.subjectId) where.subjectId = query.subjectId;
    if (query.dueBefore) where.dueAt = { lt: query.dueBefore };
    if (cursor) {
      where.OR = [
        { title: { gt: cursor.title } },
        { AND: [{ title: cursor.title }, { workItemId: { gt: cursor.workItemId } }] },
      ];
    }
    const rows = await this.prisma.osWorkReadModel.findMany({
      where: where as never,
      orderBy: [{ title: 'asc' }, { workItemId: 'asc' }],
      take: limit + 1,
    });
    const hasMore = rows.length > limit;
    return { items: (hasMore ? rows.slice(0, limit) : rows).map(mapWorkRow), hasMore };
  }

  async deleteWorkReadModelsForOrg(organizationId: string): Promise<void> {
    await this.prisma.osWorkReadModel.deleteMany({ where: { organizationId } });
  }

  async upsertApprovalReadModel(model: StoredApprovalReadModel): Promise<void> {
    await this.prisma.osApprovalReadModel.upsert({
      where: { approvalRequestId: model.approvalRequestId },
      create: {
        approvalRequestId: model.approvalRequestId,
        organizationId: model.organizationId,
        workItemId: model.workItemId,
        subjectType: model.subjectType,
        subjectId: model.subjectId,
        requestedByMemberId: model.requestedByMemberId,
        approverMemberId: model.approverMemberId,
        status: model.status,
        decisionByMemberId: model.decisionByMemberId,
        decisionReason: model.decisionReason,
        decidedAt: model.decidedAt ? new Date(model.decidedAt) : null,
        requiredScope: model.requiredScope,
        lastEventId: model.lastEventId,
        lastOccurredAt: model.lastOccurredAt,
      },
      update: {
        workItemId: model.workItemId,
        status: model.status,
        decisionByMemberId: model.decisionByMemberId,
        decisionReason: model.decisionReason,
        decidedAt: model.decidedAt ? new Date(model.decidedAt) : null,
        lastEventId: model.lastEventId,
        lastOccurredAt: model.lastOccurredAt,
      },
    });
  }

  async getApprovalReadModel(
    organizationId: string,
    approvalRequestId: string,
  ): Promise<StoredApprovalReadModel | null> {
    const row = await this.prisma.osApprovalReadModel.findFirst({
      where: { organizationId, approvalRequestId },
    });
    return row ? mapApprovalRow(row) : null;
  }

  async listApprovalReadModels(
    organizationId: string,
    query: ListPendingApprovalsQuery,
  ): Promise<{ items: StoredApprovalReadModel[]; hasMore: boolean }> {
    const limit = query.limit ?? 25;
    const cursor = decodeApprovalCursor(query.cursor);
    const where: Record<string, unknown> = { organizationId, status: 'pending' };
    if (query.approverMemberId) where.approverMemberId = query.approverMemberId;
    if (query.workItemId) where.workItemId = query.workItemId;
    if (cursor) where.approvalRequestId = { gt: cursor.approvalRequestId };
    const rows = await this.prisma.osApprovalReadModel.findMany({
      where: where as never,
      orderBy: [{ approvalRequestId: 'asc' }],
      take: limit + 1,
    });
    const hasMore = rows.length > limit;
    return { items: (hasMore ? rows.slice(0, limit) : rows).map(mapApprovalRow), hasMore };
  }

  async deleteApprovalReadModelsForOrg(organizationId: string): Promise<void> {
    await this.prisma.osApprovalReadModel.deleteMany({ where: { organizationId } });
  }

  async findPendingApprovalForWork(
    organizationId: string,
    workItemId: string,
  ): Promise<StoredApprovalReadModel | null> {
    const row = await this.prisma.osApprovalReadModel.findFirst({
      where: { organizationId, workItemId, status: 'pending' },
      orderBy: { updatedAt: 'desc' },
    });
    return row ? mapApprovalRow(row) : null;
  }

  async replaceAttentionReadModels(
    organizationId: string,
    items: StoredAttentionReadModel[],
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.osAttentionReadModel.deleteMany({ where: { organizationId } }),
      ...items.map((item) =>
        this.prisma.osAttentionReadModel.create({
          data: attentionCreateData(item),
        }),
      ),
    ]);
  }

  async rebuildAttentionForOrganization(organizationId: string, asOf: Date): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('isalwa.attention'), hashtext(${organizationId}))`;
      const workRows = await tx.osWorkReadModel.findMany({ where: { organizationId } });
      const approvalRows = await tx.osApprovalReadModel.findMany({ where: { organizationId } });
      const attention = deriveAttentionReadModels(
        organizationId,
        workRows.map(mapWorkRow),
        approvalRows.map(mapApprovalRow),
        asOf,
      );
      await tx.osAttentionReadModel.deleteMany({ where: { organizationId } });
      if (attention.length > 0) {
        await tx.osAttentionReadModel.createMany({
          data: attention.map(attentionCreateData),
        });
      }
    });
  }

  async listOrganizationIdsNeedingOverdueRefresh(asOf: Date): Promise<string[]> {
    const [dueRows, overdueRows] = await Promise.all([
      this.prisma.osWorkReadModel.findMany({
        where: { status: 'open', dueAt: { lt: asOf } },
        select: { organizationId: true, workItemId: true, status: true, dueAt: true },
      }),
      this.prisma.osAttentionReadModel.findMany({
        where: { attentionType: 'overdue_work', isActive: true },
        select: {
          organizationId: true,
          workItemId: true,
          attentionKey: true,
          attentionType: true,
          isActive: true,
        },
      }),
    ]);

    return organizationIdsNeedingOverdueRefresh(
      dueRows.map((row) => ({
        organizationId: row.organizationId,
        workItemId: row.workItemId,
        status: row.status,
        dueAt: row.dueAt?.toISOString() ?? null,
      })),
      overdueRows,
      asOf,
    );
  }

  async listAttentionReadModels(
    organizationId: string,
    memberId: string,
    query: ListAttentionQuery,
  ): Promise<{ items: StoredAttentionReadModel[]; hasMore: boolean }> {
    const limit = query.limit ?? 25;
    const cursor = decodeAttentionCursor(query.cursor);
    const where: Record<string, unknown> = { organizationId, memberId };
    if (query.activeOnly !== false) where.isActive = true;
    if (query.attentionType) where.attentionType = query.attentionType;
    if (cursor) where.attentionKey = { gt: cursor.attentionKey };
    const rows = await this.prisma.osAttentionReadModel.findMany({
      where: where as never,
      orderBy: [{ attentionKey: 'asc' }],
      take: limit + 1,
    });
    const hasMore = rows.length > limit;
    return { items: (hasMore ? rows.slice(0, limit) : rows).map(mapAttentionRow), hasMore };
  }

  async deleteAttentionReadModelsForOrg(organizationId: string): Promise<void> {
    await this.prisma.osAttentionReadModel.deleteMany({ where: { organizationId } });
  }

  async listWorkReadModelsForOrg(organizationId: string): Promise<StoredWorkReadModel[]> {
    const rows = await this.prisma.osWorkReadModel.findMany({ where: { organizationId } });
    return rows.map(mapWorkRow);
  }

  async listApprovalReadModelsForOrg(organizationId: string): Promise<StoredApprovalReadModel[]> {
    const rows = await this.prisma.osApprovalReadModel.findMany({ where: { organizationId } });
    return rows.map(mapApprovalRow);
  }

  async upsertOpportunityReadModel(model: StoredOpportunityReadModel): Promise<void> {
    await this.prisma.osOpportunityReadModel.upsert({
      where: { opportunityId: model.opportunityId },
      create: {
        opportunityId: model.opportunityId,
        organizationId: model.organizationId,
        partyId: model.partyId,
        commercialAccountId: model.commercialAccountId,
        ownerMemberId: model.ownerMemberId,
        title: model.title,
        stage: model.stage,
        status: model.status,
        expectedValueCentavos: model.expectedValueCentavos,
        closedAt: model.closedAt,
        createdAt: model.createdAt,
        lastEventId: model.lastEventId,
        lastOccurredAt: model.lastOccurredAt,
      },
      update: {
        partyId: model.partyId,
        commercialAccountId: model.commercialAccountId,
        ownerMemberId: model.ownerMemberId,
        title: model.title,
        stage: model.stage,
        status: model.status,
        expectedValueCentavos: model.expectedValueCentavos,
        closedAt: model.closedAt,
        lastEventId: model.lastEventId,
        lastOccurredAt: model.lastOccurredAt,
      },
    });
  }

  async getOpportunityReadModel(
    organizationId: string,
    opportunityId: string,
  ): Promise<StoredOpportunityReadModel | null> {
    const row = await this.prisma.osOpportunityReadModel.findFirst({
      where: { opportunityId, organizationId },
    });
    return row ? mapOpportunityRow(row) : null;
  }

  async listOpportunityReadModels(
    organizationId: string,
    query: ListOpportunitiesQuery & ServerListConstraints,
  ): Promise<{ items: StoredOpportunityReadModel[]; hasMore: boolean }> {
    const limit = query.limit ?? 25;
    const cursor = decodeOpportunityCursor(query.cursor);
    const where: Record<string, unknown> = { organizationId };
    if (query.status) where.status = query.status;
    if (query.stage) where.stage = query.stage;
    if (query.partyId) where.partyId = query.partyId;
    if (query.ownerMemberIds && query.ownerMemberIds.length === 0) {
      return { items: [], hasMore: false };
    }
    if (query.ownerMemberIds) where.ownerMemberId = { in: [...query.ownerMemberIds] };
    else if (query.ownerMemberId) where.ownerMemberId = query.ownerMemberId;
    if (cursor) {
      where.OR = [
        { title: { gt: cursor.title } },
        { title: cursor.title, opportunityId: { gt: cursor.opportunityId } },
      ];
    }
    const rows = await this.prisma.osOpportunityReadModel.findMany({
      where: where as never,
      orderBy: [{ title: 'asc' }, { opportunityId: 'asc' }],
      take: limit + 1,
    });
    const hasMore = rows.length > limit;
    return {
      items: (hasMore ? rows.slice(0, limit) : rows).map(mapOpportunityRow),
      hasMore,
    };
  }

  async deleteOpportunityReadModelsForOrg(organizationId: string): Promise<void> {
    await this.prisma.osOpportunityReadModel.deleteMany({ where: { organizationId } });
  }

  async upsertQuoteReadModel(model: StoredQuoteReadModel): Promise<void> {
    await this.prisma.osQuoteReadModel.upsert({
      where: { quoteId: model.quoteId },
      create: {
        quoteId: model.quoteId,
        organizationId: model.organizationId,
        partyId: model.partyId,
        commercialAccountId: model.commercialAccountId,
        opportunityId: model.opportunityId,
        ownerMemberId: model.ownerMemberId,
        quoteNumber: model.quoteNumber,
        status: model.status,
        currency: model.currency,
        subtotalCentavos: model.subtotalCentavos,
        headerDiscountCentavos: model.headerDiscountCentavos,
        totalCentavos: model.totalCentavos,
        revisionNumber: model.revisionNumber,
        notes: model.notes,
        submittedAt: model.submittedAt,
        cancelledAt: model.cancelledAt,
        createdAt: model.createdAt,
        lastEventId: model.lastEventId,
        lastOccurredAt: model.lastOccurredAt,
      },
      update: {
        partyId: model.partyId,
        commercialAccountId: model.commercialAccountId,
        opportunityId: model.opportunityId,
        ownerMemberId: model.ownerMemberId,
        quoteNumber: model.quoteNumber,
        status: model.status,
        currency: model.currency,
        subtotalCentavos: model.subtotalCentavos,
        headerDiscountCentavos: model.headerDiscountCentavos,
        totalCentavos: model.totalCentavos,
        revisionNumber: model.revisionNumber,
        notes: model.notes,
        submittedAt: model.submittedAt,
        cancelledAt: model.cancelledAt,
        lastEventId: model.lastEventId,
        lastOccurredAt: model.lastOccurredAt,
      },
    });
  }

  async getQuoteReadModel(
    organizationId: string,
    quoteId: string,
  ): Promise<StoredQuoteReadModel | null> {
    const row = await this.prisma.osQuoteReadModel.findFirst({
      where: { quoteId, organizationId },
    });
    return row ? mapQuoteRow(row) : null;
  }

  async listQuoteReadModels(
    organizationId: string,
    query: ListQuotesQuery & ServerListConstraints,
  ): Promise<{ items: StoredQuoteReadModel[]; hasMore: boolean }> {
    const limit = query.limit ?? 25;
    const cursor = decodeQuoteCursor(query.cursor);
    const where: Record<string, unknown> = { organizationId };
    if (query.status) where.status = query.status;
    if (query.partyId) where.partyId = query.partyId;
    if (query.opportunityId) where.opportunityId = query.opportunityId;
    if (query.ownerMemberIds && query.ownerMemberIds.length === 0) {
      return { items: [], hasMore: false };
    }
    if (query.ownerMemberIds) where.ownerMemberId = { in: [...query.ownerMemberIds] };
    else if (query.ownerMemberId) where.ownerMemberId = query.ownerMemberId;
    if (cursor) {
      where.OR = [
        { quoteNumber: { gt: cursor.quoteNumber } },
        { quoteNumber: cursor.quoteNumber, quoteId: { gt: cursor.quoteId } },
      ];
    }
    const rows = await this.prisma.osQuoteReadModel.findMany({
      where: where as never,
      orderBy: [{ quoteNumber: 'asc' }, { quoteId: 'asc' }],
      take: limit + 1,
    });
    const hasMore = rows.length > limit;
    return { items: (hasMore ? rows.slice(0, limit) : rows).map(mapQuoteRow), hasMore };
  }

  async deleteQuoteReadModelsForOrg(organizationId: string): Promise<void> {
    await this.prisma.osQuoteReadModel.deleteMany({ where: { organizationId } });
  }

  async replaceQuoteLineReadModels(
    organizationId: string,
    quoteId: string,
    lines: StoredQuoteLineReadModel[],
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.osQuoteLineReadModel.deleteMany({ where: { organizationId, quoteId } }),
      ...lines.map((line) =>
        this.prisma.osQuoteLineReadModel.create({
          data: {
            quoteLineId: line.quoteLineId,
            organizationId: line.organizationId,
            quoteId: line.quoteId,
            lineNumber: line.lineNumber,
            description: line.description,
            quantity: line.quantity,
            unitLabel: line.unitLabel,
            unitPriceCentavos: line.unitPriceCentavos,
            discountCentavos: line.discountCentavos,
            lineTotalCentavos: line.lineTotalCentavos,
            productRef: line.productRef,
          },
        }),
      ),
    ]);
  }

  async listQuoteLineReadModels(
    organizationId: string,
    quoteId: string,
  ): Promise<StoredQuoteLineReadModel[]> {
    const rows = await this.prisma.osQuoteLineReadModel.findMany({
      where: { organizationId, quoteId },
      orderBy: { lineNumber: 'asc' },
    });
    return rows.map(mapQuoteLineRow);
  }

  async deleteQuoteLineReadModelsForOrg(organizationId: string): Promise<void> {
    await this.prisma.osQuoteLineReadModel.deleteMany({ where: { organizationId } });
  }

  async upsertOrderReadModel(model: StoredOrderReadModel): Promise<void> {
    await this.prisma.osOrderReadModel.upsert({
      where: { orderId: model.orderId },
      create: {
        orderId: model.orderId,
        organizationId: model.organizationId,
        partyId: model.partyId,
        commercialAccountId: model.commercialAccountId,
        quoteId: model.quoteId,
        ownerMemberId: model.ownerMemberId,
        orderNumber: model.orderNumber,
        status: model.status,
        currency: model.currency,
        subtotalCentavos: model.subtotalCentavos,
        headerDiscountCentavos: model.headerDiscountCentavos,
        totalCentavos: model.totalCentavos,
        cancelledAt: model.cancelledAt,
        createdAt: model.createdAt,
        lastEventId: model.lastEventId,
        lastOccurredAt: model.lastOccurredAt,
      },
      update: {
        partyId: model.partyId,
        commercialAccountId: model.commercialAccountId,
        quoteId: model.quoteId,
        ownerMemberId: model.ownerMemberId,
        orderNumber: model.orderNumber,
        status: model.status,
        currency: model.currency,
        subtotalCentavos: model.subtotalCentavos,
        headerDiscountCentavos: model.headerDiscountCentavos,
        totalCentavos: model.totalCentavos,
        cancelledAt: model.cancelledAt,
        lastEventId: model.lastEventId,
        lastOccurredAt: model.lastOccurredAt,
      },
    });
  }

  async getOrderReadModel(
    organizationId: string,
    orderId: string,
  ): Promise<StoredOrderReadModel | null> {
    const row = await this.prisma.osOrderReadModel.findFirst({
      where: { orderId, organizationId },
    });
    return row ? mapOrderRow(row) : null;
  }

  async listOrderReadModels(
    organizationId: string,
    query: ListOrdersQuery,
  ): Promise<{ items: StoredOrderReadModel[]; hasMore: boolean }> {
    const limit = query.limit ?? 25;
    const cursor = decodeOrderCursor(query.cursor);
    const where: Record<string, unknown> = { organizationId };
    if (query.status) where.status = query.status;
    if (query.partyId) where.partyId = query.partyId;
    if (query.quoteId) where.quoteId = query.quoteId;
    if (query.ownerMemberId) where.ownerMemberId = query.ownerMemberId;
    if (cursor) {
      where.OR = [
        { orderNumber: { gt: cursor.orderNumber } },
        { orderNumber: cursor.orderNumber, orderId: { gt: cursor.orderId } },
      ];
    }
    const rows = await this.prisma.osOrderReadModel.findMany({
      where: where as never,
      orderBy: [{ orderNumber: 'asc' }, { orderId: 'asc' }],
      take: limit + 1,
    });
    const hasMore = rows.length > limit;
    return { items: (hasMore ? rows.slice(0, limit) : rows).map(mapOrderRow), hasMore };
  }

  async deleteOrderReadModelsForOrg(organizationId: string): Promise<void> {
    await this.prisma.osOrderReadModel.deleteMany({ where: { organizationId } });
  }

  async upsertPartyTimelineEntry(entry: StoredPartyTimelineEntry): Promise<void> {
    await this.prisma.osPartyTimelineEntry.upsert({
      where: { entryId: entry.entryId },
      create: {
        entryId: entry.entryId,
        organizationId: entry.organizationId,
        partyId: entry.partyId,
        eventType: entry.eventType,
        occurredAt: entry.occurredAt,
        actorMemberId: entry.actorMemberId,
        correlationId: entry.correlationId,
        primaryEntityType: entry.primaryEntityType,
        primaryEntityId: entry.primaryEntityId,
        factsJson: entry.factsJson as Prisma.InputJsonValue,
      },
      update: {
        partyId: entry.partyId,
        eventType: entry.eventType,
        occurredAt: entry.occurredAt,
        actorMemberId: entry.actorMemberId,
        correlationId: entry.correlationId,
        primaryEntityType: entry.primaryEntityType,
        primaryEntityId: entry.primaryEntityId,
        factsJson: entry.factsJson as Prisma.InputJsonValue,
      },
    });
  }

  async listPartyTimelineEntries(
    organizationId: string,
    partyId: string,
    query: ListPartyTimelineQuery,
  ): Promise<{ items: StoredPartyTimelineEntry[]; hasMore: boolean }> {
    const limit = query.limit ?? 25;
    const cursor = decodePartyTimelineCursor(query.cursor);
    const where: Record<string, unknown> = { organizationId, partyId };
    if (cursor) {
      where.OR = [
        { occurredAt: { lt: new Date(cursor.occurredAt) } },
        {
          occurredAt: new Date(cursor.occurredAt),
          entryId: { lt: cursor.entryId },
        },
      ];
    }
    const rows = await this.prisma.osPartyTimelineEntry.findMany({
      where: where as never,
      orderBy: [{ occurredAt: 'desc' }, { entryId: 'desc' }],
      take: limit + 1,
    });
    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    return {
      items: slice.map((row) => ({
        entryId: row.entryId,
        organizationId: row.organizationId,
        partyId: row.partyId,
        eventType: row.eventType,
        occurredAt: row.occurredAt,
        actorMemberId: row.actorMemberId,
        correlationId: row.correlationId,
        primaryEntityType: row.primaryEntityType,
        primaryEntityId: row.primaryEntityId,
        factsJson: row.factsJson as StoredPartyTimelineEntry['factsJson'],
        updatedAt: row.updatedAt,
      })),
      hasMore,
    };
  }

  async deletePartyTimelineEntriesForOrg(organizationId: string): Promise<void> {
    await this.prisma.osPartyTimelineEntry.deleteMany({ where: { organizationId } });
  }

  async countPartyTimelineEntries(organizationId: string, partyId: string): Promise<number> {
    return this.prisma.osPartyTimelineEntry.count({ where: { organizationId, partyId } });
  }

  async getCheckpoint(
    organizationId: string,
    consumerKey: string,
  ): Promise<ProjectionCheckpoint | null> {
    const row = await this.prisma.osProjectionCheckpoint.findUnique({
      where: { organizationId_consumerKey: { organizationId, consumerKey } },
    });
    if (!row) return null;
    return {
      organizationId: row.organizationId,
      consumerKey: row.consumerKey,
      lastEventId: row.lastEventId,
      lastOccurredAt: row.lastOccurredAt,
      updatedAt: row.updatedAt,
    };
  }

  async upsertCheckpoint(checkpoint: ProjectionCheckpoint): Promise<void> {
    await this.prisma.osProjectionCheckpoint.upsert({
      where: {
        organizationId_consumerKey: {
          organizationId: checkpoint.organizationId,
          consumerKey: checkpoint.consumerKey,
        },
      },
      create: {
        organizationId: checkpoint.organizationId,
        consumerKey: checkpoint.consumerKey,
        lastEventId: checkpoint.lastEventId,
        lastOccurredAt: checkpoint.lastOccurredAt,
      },
      update: {
        lastEventId: checkpoint.lastEventId,
        lastOccurredAt: checkpoint.lastOccurredAt,
      },
    });
  }

  async getFreshness(
    organizationId: string,
    consumerKey: string,
  ): Promise<ProjectionFreshness | null> {
    const row = await this.prisma.osProjectionFreshness.findUnique({
      where: { organizationId_consumerKey: { organizationId, consumerKey } },
    });
    const pending = await this.countPendingOutbox(organizationId);
    const isStale = pending >= 1;
    if (!row) {
      if (pending === 0) return null;
      return {
        consumerKey,
        organizationId,
        lastSuccessAt: null,
        lastEventOccurredAt: null,
        pendingOutboxCount: pending,
        isStale,
        lastError: null,
        rebuiltAt: null,
      };
    }
    return {
      consumerKey: row.consumerKey,
      organizationId: row.organizationId,
      lastSuccessAt: row.lastSuccessAt?.toISOString() ?? null,
      lastEventOccurredAt: row.lastEventOccurredAt?.toISOString() ?? null,
      pendingOutboxCount: pending,
      isStale,
      lastError: row.lastError,
      rebuiltAt: row.rebuiltAt?.toISOString() ?? null,
    };
  }

  async upsertFreshness(
    organizationId: string,
    consumerKey: string,
    patch: Partial<Omit<ProjectionFreshness, 'organizationId' | 'consumerKey'>>,
  ): Promise<ProjectionFreshness> {
    const row = await this.prisma.osProjectionFreshness.upsert({
      where: { organizationId_consumerKey: { organizationId, consumerKey } },
      create: {
        organizationId,
        consumerKey,
        lastSuccessAt: patch.lastSuccessAt ? new Date(patch.lastSuccessAt) : null,
        lastEventOccurredAt: patch.lastEventOccurredAt
          ? new Date(patch.lastEventOccurredAt)
          : null,
        pendingOutboxCount: patch.pendingOutboxCount ?? 0,
        isStale: patch.isStale ?? false,
        lastError: patch.lastError ?? null,
        rebuiltAt: patch.rebuiltAt ? new Date(patch.rebuiltAt) : null,
      },
      update: {
        lastSuccessAt: patch.lastSuccessAt ? new Date(patch.lastSuccessAt) : undefined,
        lastEventOccurredAt: patch.lastEventOccurredAt
          ? new Date(patch.lastEventOccurredAt)
          : undefined,
        pendingOutboxCount: patch.pendingOutboxCount,
        isStale: patch.isStale,
        lastError: patch.lastError,
        rebuiltAt: patch.rebuiltAt ? new Date(patch.rebuiltAt) : undefined,
      },
    });
    return {
      consumerKey: row.consumerKey,
      organizationId: row.organizationId,
      lastSuccessAt: row.lastSuccessAt?.toISOString() ?? null,
      lastEventOccurredAt: row.lastEventOccurredAt?.toISOString() ?? null,
      pendingOutboxCount: row.pendingOutboxCount,
      isStale: row.isStale,
      lastError: row.lastError,
      rebuiltAt: row.rebuiltAt?.toISOString() ?? null,
    };
  }

  async countPendingOutbox(organizationId: string): Promise<number> {
    return this.prisma.osOutboxMessage.count({
      where: { organizationId, status: 'pending' },
    });
  }

  async listEventsForReplay(
    organizationId: string,
    eventTypes: readonly string[],
    afterOccurredAt?: Date | null,
  ): Promise<ReplayBusinessEvent[]> {
    const rows = await this.prisma.osBusinessEvent.findMany({
      where: {
        organizationId,
        eventType: { in: [...eventTypes] },
        ...(afterOccurredAt ? { occurredAt: { gt: afterOccurredAt } } : {}),
      },
      orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
    });
    return rows.map((row) => ({
      id: row.id,
      organizationId: row.organizationId,
      eventType: row.eventType,
      schemaVersion: EVENT_SCHEMA_VERSION_POLICY.current,
      occurredAt: row.occurredAt,
      recordedAt: row.recordedAt,
      actorMemberId: row.actorMemberId,
      primaryEntityType: row.primaryEntityType,
      primaryEntityId: row.primaryEntityId,
      correlationId: row.correlationId,
      payloadJson: (row.payloadJson as Record<string, unknown> | null) ?? null,
    }));
  }

  async truncateProjectionsForOrg(organizationId: string): Promise<void> {
    await this.prisma.osPartyTimelineEntry.deleteMany({ where: { organizationId } });
    await this.prisma.osQuoteLineReadModel.deleteMany({ where: { organizationId } });
    await this.prisma.osQuoteReadModel.deleteMany({ where: { organizationId } });
    await this.prisma.osOrderReadModel.deleteMany({ where: { organizationId } });
    await this.prisma.osOpportunityReadModel.deleteMany({ where: { organizationId } });
    await this.prisma.osAttentionReadModel.deleteMany({ where: { organizationId } });
    await this.prisma.osApprovalReadModel.deleteMany({ where: { organizationId } });
    await this.prisma.osWorkReadModel.deleteMany({ where: { organizationId } });
    await this.prisma.osPartyReadModel.deleteMany({ where: { organizationId } });
    await this.prisma.osProjectionCheckpoint.deleteMany({ where: { organizationId } });
    await this.prisma.osProjectionFreshness.deleteMany({ where: { organizationId } });
  }
}
