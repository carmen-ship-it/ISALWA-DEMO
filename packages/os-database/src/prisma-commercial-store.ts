import { createId } from '@isalwa/ts-utils';
import type { StoredAuditLog, StoredBusinessEvent, StoredOutboxMessage } from '@isalwa/os-events';
import type { OsCommercialStore } from '@isalwa/os-commercial';
import type {
  CommercialAccountRecord,
  DelegationRecord,
  IdempotencyRecord,
  MemberRecord,
  OpportunityRecord,
  OrderRecord,
  PartyRecord,
  QuoteLineRecord,
  QuoteRecord,
  RoleAssignmentRecord,
} from '@isalwa/os-commercial';
import type { OsPrismaClient } from './client';
import { Prisma } from './generated/client';

export class PrismaOsCommercialStore implements OsCommercialStore {
  private tx?: Prisma.TransactionClient;
  testFailNextAppend = false;

  constructor(private readonly prisma: OsPrismaClient) {}

  private db(): OsPrismaClient | Prisma.TransactionClient {
    return this.tx ?? this.prisma;
  }

  async runInTransaction<T>(fn: (store: OsCommercialStore) => Promise<T>): Promise<T> {
    const failNextAppend = this.testFailNextAppend;
    return this.prisma.$transaction(async (tx) => {
      const scoped = new PrismaOsCommercialStore(this.prisma);
      scoped.tx = tx;
      scoped.testFailNextAppend = failNextAppend;
      try {
        return await fn(scoped);
      } finally {
        if (failNextAppend) {
          this.testFailNextAppend = scoped.testFailNextAppend;
        }
      }
    });
  }

  async getMemberInOrg(organizationId: string, memberId: string): Promise<MemberRecord | null> {
    const row = await this.db().osOrganizationMember.findFirst({
      where: { id: memberId, organizationId },
    });
    return row
      ? { id: row.id, organizationId: row.organizationId, accessStatus: row.accessStatus }
      : null;
  }

  async listRoleAssignmentsForMember(memberId: string): Promise<RoleAssignmentRecord[]> {
    const rows = await this.db().osRoleAssignment.findMany({ where: { memberId } });
    return rows.map((r) => ({
      roleKey: r.roleKey,
      effectiveAt: r.effectiveAt,
      endedAt: r.endedAt,
    }));
  }

  async listDelegationsForDelegate(memberId: string): Promise<DelegationRecord[]> {
    const rows = await this.db().osDelegation.findMany({ where: { delegateMemberId: memberId } });
    return rows.map((d) => ({
      delegatorMemberId: d.delegatorMemberId,
      scopes: d.scopesJson as string[],
      startsAt: d.startsAt,
      expiresAt: d.expiresAt ?? new Date('2099-01-01T00:00:00Z'),
      revokedAt: d.revokedAt,
    }));
  }

  async getPartyInOrg(organizationId: string, partyId: string): Promise<PartyRecord | null> {
    const row = await this.db().osParty.findFirst({
      where: { id: partyId, organizationId },
    });
    return row
      ? {
          id: row.id,
          organizationId: row.organizationId,
          status: row.status,
          mergedIntoPartyId: row.mergedIntoPartyId,
        }
      : null;
  }

  async getCommercialAccountForParty(
    organizationId: string,
    partyId: string,
  ): Promise<CommercialAccountRecord | null> {
    const row = await this.db().osCommercialAccount.findFirst({
      where: { organizationId, partyId },
    });
    return row
      ? {
          id: row.id,
          organizationId: row.organizationId,
          partyId: row.partyId,
          status: row.status,
        }
      : null;
  }

  async getCommercialAccountInOrg(
    organizationId: string,
    commercialAccountId: string,
  ): Promise<CommercialAccountRecord | null> {
    const row = await this.db().osCommercialAccount.findFirst({
      where: { id: commercialAccountId, organizationId },
    });
    return row
      ? {
          id: row.id,
          organizationId: row.organizationId,
          partyId: row.partyId,
          status: row.status,
        }
      : null;
  }

  async insertOpportunity(record: OpportunityRecord): Promise<void> {
    await this.db().osOpportunity.create({
      data: {
        id: record.id,
        organizationId: record.organizationId,
        partyId: record.partyId,
        commercialAccountId: record.commercialAccountId,
        ownerMemberId: record.ownerMemberId,
        title: record.title,
        stage: record.stage,
        status: record.status,
        expectedValueCentavos: record.expectedValueCentavos,
        sourceMetadataJson: record.sourceMetadataJson as Prisma.InputJsonValue | undefined,
        version: record.version,
        closedAt: record.closedAt,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      },
    });
  }

  async getOpportunityInOrg(
    organizationId: string,
    opportunityId: string,
  ): Promise<OpportunityRecord | null> {
    const row = await this.db().osOpportunity.findFirst({
      where: { id: opportunityId, organizationId },
    });
    return row ? mapOpportunity(row) : null;
  }

  async updateOpportunity(
    opportunityId: string,
    patch: Partial<
      Pick<
        OpportunityRecord,
        | 'title'
        | 'stage'
        | 'status'
        | 'ownerMemberId'
        | 'expectedValueCentavos'
        | 'sourceMetadataJson'
        | 'closedAt'
        | 'version'
      >
    >,
    expectedVersion: number,
  ): Promise<void> {
    const result = await this.db().osOpportunity.updateMany({
      where: { id: opportunityId, version: expectedVersion },
      data: {
        ...patch,
        sourceMetadataJson: patch.sourceMetadataJson as Prisma.InputJsonValue | undefined,
      },
    });
    if (result.count === 0) throw new Error('CONFLICT');
  }

  async insertQuote(record: QuoteRecord): Promise<void> {
    await this.db().osQuote.create({
      data: {
        id: record.id,
        organizationId: record.organizationId,
        partyId: record.partyId,
        commercialAccountId: record.commercialAccountId,
        opportunityId: record.opportunityId,
        ownerMemberId: record.ownerMemberId,
        quoteNumber: record.quoteNumber,
        status: record.status,
        currency: record.currency,
        subtotalCentavos: record.subtotalCentavos,
        headerDiscountCentavos: record.headerDiscountCentavos,
        totalCentavos: record.totalCentavos,
        revisionNumber: record.revisionNumber,
        notes: record.notes,
        version: record.version,
        submittedAt: record.submittedAt,
        cancelledAt: record.cancelledAt,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      },
    });
  }

  async getQuoteInOrg(organizationId: string, quoteId: string): Promise<QuoteRecord | null> {
    const row = await this.db().osQuote.findFirst({
      where: { id: quoteId, organizationId },
    });
    return row ? mapQuote(row) : null;
  }

  async updateQuote(
    quoteId: string,
    patch: Partial<
      Pick<
        QuoteRecord,
        | 'status'
        | 'notes'
        | 'subtotalCentavos'
        | 'headerDiscountCentavos'
        | 'totalCentavos'
        | 'submittedAt'
        | 'cancelledAt'
        | 'version'
      >
    >,
    expectedVersion: number,
  ): Promise<void> {
    const result = await this.db().osQuote.updateMany({
      where: { id: quoteId, version: expectedVersion },
      data: patch,
    });
    if (result.count === 0) throw new Error('CONFLICT');
  }

  async countQuotesForOrg(organizationId: string): Promise<number> {
    return this.db().osQuote.count({ where: { organizationId } });
  }

  async insertQuoteLine(record: QuoteLineRecord): Promise<void> {
    await this.db().osQuoteLine.create({
      data: {
        id: record.id,
        organizationId: record.organizationId,
        quoteId: record.quoteId,
        lineNumber: record.lineNumber,
        description: record.description,
        quantity: record.quantity,
        unitLabel: record.unitLabel,
        unitPriceCentavos: record.unitPriceCentavos,
        discountCentavos: record.discountCentavos,
        lineTotalCentavos: record.lineTotalCentavos,
        productRef: record.productRef,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      },
    });
  }

  async getQuoteLineInOrg(
    organizationId: string,
    quoteLineId: string,
  ): Promise<QuoteLineRecord | null> {
    const row = await this.db().osQuoteLine.findFirst({
      where: { id: quoteLineId, organizationId },
    });
    return row ? mapQuoteLine(row) : null;
  }

  async listQuoteLines(organizationId: string, quoteId: string): Promise<QuoteLineRecord[]> {
    const rows = await this.db().osQuoteLine.findMany({
      where: { organizationId, quoteId },
      orderBy: { lineNumber: 'asc' },
    });
    return rows.map(mapQuoteLine);
  }

  async updateQuoteLine(
    quoteLineId: string,
    patch: Partial<
      Pick<
        QuoteLineRecord,
        | 'description'
        | 'quantity'
        | 'unitLabel'
        | 'unitPriceCentavos'
        | 'discountCentavos'
        | 'lineTotalCentavos'
        | 'productRef'
      >
    >,
  ): Promise<void> {
    await this.db().osQuoteLine.update({
      where: { id: quoteLineId },
      data: patch,
    });
  }

  async deleteQuoteLine(quoteLineId: string): Promise<void> {
    await this.db().osQuoteLine.delete({ where: { id: quoteLineId } });
  }

  async nextQuoteLineNumber(quoteId: string): Promise<number> {
    const last = await this.db().osQuoteLine.findFirst({
      where: { quoteId },
      orderBy: { lineNumber: 'desc' },
    });
    return (last?.lineNumber ?? 0) + 1;
  }

  async insertOrder(record: OrderRecord): Promise<void> {
    await this.db().osOrder.create({
      data: {
        id: record.id,
        organizationId: record.organizationId,
        partyId: record.partyId,
        commercialAccountId: record.commercialAccountId,
        quoteId: record.quoteId,
        ownerMemberId: record.ownerMemberId,
        orderNumber: record.orderNumber,
        status: record.status,
        currency: record.currency,
        subtotalCentavos: record.subtotalCentavos,
        headerDiscountCentavos: record.headerDiscountCentavos,
        totalCentavos: record.totalCentavos,
        version: record.version,
        cancelledAt: record.cancelledAt,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      },
    });
  }

  async getOrderInOrg(organizationId: string, orderId: string): Promise<OrderRecord | null> {
    const row = await this.db().osOrder.findFirst({
      where: { id: orderId, organizationId },
    });
    return row ? mapOrder(row) : null;
  }

  async getOrderForQuote(organizationId: string, quoteId: string): Promise<OrderRecord | null> {
    const row = await this.db().osOrder.findFirst({
      where: { organizationId, quoteId },
    });
    return row ? mapOrder(row) : null;
  }

  async updateOrder(
    orderId: string,
    patch: Partial<Pick<OrderRecord, 'status' | 'cancelledAt' | 'version'>>,
    expectedVersion: number,
  ): Promise<void> {
    const result = await this.db().osOrder.updateMany({
      where: { id: orderId, version: expectedVersion },
      data: patch,
    });
    if (result.count === 0) throw new Error('CONFLICT');
  }

  async countOrdersForOrg(organizationId: string): Promise<number> {
    return this.db().osOrder.count({ where: { organizationId } });
  }

  private async runBatch(ops: Array<Prisma.PrismaPromise<unknown>>): Promise<void> {
    if (this.tx) {
      for (const op of ops) await op;
      return;
    }
    await this.prisma.$transaction(ops);
  }

  async appendEventAndAudit(
    event: StoredBusinessEvent,
    outbox: StoredOutboxMessage,
    audit: StoredAuditLog,
  ): Promise<void> {
    if (this.testFailNextAppend) {
      this.testFailNextAppend = false;
      throw new Error('TEST_APPEND_FAIL');
    }
    await this.runBatch([
      this.db().osBusinessEvent.create({
        data: {
          id: event.id,
          organizationId: event.organizationId,
          eventType: event.eventType,
          occurredAt: event.occurredAt,
          recordedAt: event.recordedAt,
          actorMemberId: event.actorMemberId,
          authorizationContext: event.authorizationContext as Prisma.InputJsonValue | undefined,
          primaryEntityType: event.primaryEntityType,
          primaryEntityId: event.primaryEntityId,
          payloadJson: (event.payload ?? undefined) as Prisma.InputJsonValue | undefined,
          provenance: event.provenance ?? 'command',
          correlationId: event.correlationId,
          idempotencyKey: event.idempotencyKey,
          dataOrigin: event.dataOrigin ?? 'production',
          capabilityKey: event.capabilityKey,
        },
      }),
      this.db().osOutboxMessage.create({
        data: {
          id: outbox.id,
          organizationId: outbox.organizationId,
          eventId: outbox.eventId,
          payloadJson: outbox.payloadJson as Prisma.InputJsonValue,
          status: outbox.status,
          attemptCount: outbox.attemptCount,
          nextAttemptAt: outbox.nextAttemptAt,
          lastError: outbox.lastError,
          createdAt: outbox.createdAt,
          publishedAt: outbox.publishedAt,
        },
      }),
      this.db().osAuditLog.create({
        data: {
          id: audit.id,
          organizationId: audit.organizationId,
          actorMemberId: audit.actorMemberId,
          action: audit.action,
          resourceType: audit.resourceType,
          resourceId: audit.resourceId,
          beforeJson: (audit.beforeJson ?? undefined) as Prisma.InputJsonValue | undefined,
          afterJson: (audit.afterJson ?? undefined) as Prisma.InputJsonValue | undefined,
          correlationId: audit.correlationId,
          createdAt: audit.createdAt,
        },
      }),
    ]);
  }

  async findIdempotency(organizationId: string, key: string): Promise<IdempotencyRecord | null> {
    const row = await this.db().osIdempotencyKey.findFirst({
      where: { organizationId, key, expiresAt: { gt: new Date() } },
    });
    return row
      ? {
          organizationId: row.organizationId,
          key: row.key,
          commandName: row.commandName,
          resultJson: row.resultJson as Record<string, unknown>,
          expiresAt: row.expiresAt,
        }
      : null;
  }

  async saveIdempotency(record: IdempotencyRecord & { id?: string }): Promise<void> {
    await this.db().osIdempotencyKey.create({
      data: {
        id: record.id ?? createId(),
        organizationId: record.organizationId,
        key: record.key,
        commandName: record.commandName,
        resultJson: record.resultJson as Prisma.InputJsonValue,
        expiresAt: record.expiresAt,
      },
    });
  }

  async countBusinessEvents(organizationId: string): Promise<number> {
    return this.db().osBusinessEvent.count({ where: { organizationId } });
  }

  async countAuditLogs(organizationId: string): Promise<number> {
    return this.db().osAuditLog.count({ where: { organizationId } });
  }

  async countOutbox(organizationId: string): Promise<number> {
    return this.db().osOutboxMessage.count({ where: { organizationId } });
  }
}

function mapOpportunity(row: {
  id: string;
  organizationId: string;
  partyId: string;
  commercialAccountId: string | null;
  ownerMemberId: string;
  title: string;
  stage: string;
  status: string;
  expectedValueCentavos: bigint | null;
  sourceMetadataJson: unknown;
  version: number;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): OpportunityRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    partyId: row.partyId,
    commercialAccountId: row.commercialAccountId,
    ownerMemberId: row.ownerMemberId,
    title: row.title,
    stage: row.stage,
    status: row.status as OpportunityRecord['status'],
    expectedValueCentavos: row.expectedValueCentavos,
    sourceMetadataJson: row.sourceMetadataJson as Record<string, unknown> | null,
    version: row.version,
    closedAt: row.closedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapQuote(row: {
  id: string;
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
  version: number;
  submittedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): QuoteRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    partyId: row.partyId,
    commercialAccountId: row.commercialAccountId,
    opportunityId: row.opportunityId,
    ownerMemberId: row.ownerMemberId,
    quoteNumber: row.quoteNumber,
    status: row.status as QuoteRecord['status'],
    currency: row.currency as QuoteRecord['currency'],
    subtotalCentavos: row.subtotalCentavos,
    headerDiscountCentavos: row.headerDiscountCentavos,
    totalCentavos: row.totalCentavos,
    revisionNumber: row.revisionNumber,
    notes: row.notes,
    version: row.version,
    submittedAt: row.submittedAt,
    cancelledAt: row.cancelledAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapQuoteLine(row: {
  id: string;
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
  createdAt: Date;
  updatedAt: Date;
}): QuoteLineRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    quoteId: row.quoteId,
    lineNumber: row.lineNumber,
    description: row.description,
    quantity: row.quantity,
    unitLabel: row.unitLabel,
    unitPriceCentavos: row.unitPriceCentavos,
    discountCentavos: row.discountCentavos,
    lineTotalCentavos: row.lineTotalCentavos,
    productRef: row.productRef,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapOrder(row: {
  id: string;
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
  version: number;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): OrderRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    partyId: row.partyId,
    commercialAccountId: row.commercialAccountId,
    quoteId: row.quoteId,
    ownerMemberId: row.ownerMemberId,
    orderNumber: row.orderNumber,
    status: row.status as OrderRecord['status'],
    currency: row.currency as OrderRecord['currency'],
    subtotalCentavos: row.subtotalCentavos,
    headerDiscountCentavos: row.headerDiscountCentavos,
    totalCentavos: row.totalCentavos,
    version: row.version,
    cancelledAt: row.cancelledAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
