import { ORDER_DATE_SUBJECT_TYPE } from './rows';
import type {
  CustomerCommittedDateRevisionRow,
  CustomerCommittedDateRow,
  CustomerDateInformedRecordRow,
  ProductionDateIssueRow,
  ProductionInternalTargetDateRow,
  ProductionInternalTargetRevisionRow,
} from './rows';

/**
 * Narrow read port. Every method requires the trusted organizationId.
 * History is never queried by parent id alone. There is no write method.
 * Production dates are a separate table. This port does not join an order
 * to a production run.
 */
export type DateFactsReadPort = {
  findOrderInOrganization(input: {
    organizationId: string;
    orderId: string;
  }): Promise<{ id: string; organizationId?: string } | null>;

  findCustomerCommittedDate(input: {
    organizationId: string;
    subjectType: typeof ORDER_DATE_SUBJECT_TYPE;
    subjectId: string;
  }): Promise<CustomerCommittedDateRow | null>;

  listCustomerCommittedDateRevisions(input: {
    organizationId: string;
    committedDateId: string;
  }): Promise<CustomerCommittedDateRevisionRow[]>;

  findProductionInternalTargetDate(input: {
    organizationId: string;
    subjectType: typeof ORDER_DATE_SUBJECT_TYPE;
    subjectId: string;
  }): Promise<ProductionInternalTargetDateRow | null>;

  listProductionInternalTargetRevisions(input: {
    organizationId: string;
    targetDateId: string;
  }): Promise<ProductionInternalTargetRevisionRow[]>;

  listProductionDateIssues(input: {
    organizationId: string;
    subjectType: typeof ORDER_DATE_SUBJECT_TYPE;
    subjectId: string;
  }): Promise<ProductionDateIssueRow[]>;

  listCustomerDateInformedRecords(input: {
    organizationId: string;
    subjectType: typeof ORDER_DATE_SUBJECT_TYPE;
    subjectId: string;
  }): Promise<CustomerDateInformedRecordRow[]>;
};

/**
 * Prisma model delegates. Query functions accept this shape or a
 * DateFactsReadPort. Callers pass the generated client; tests pass a port.
 */
export type PrismaDateFactsClient = {
  osOrder: {
    findFirst(args: {
      where: { id: string; organizationId: string };
      select: { id: true; organizationId: true };
    }): Promise<{ id: string; organizationId: string } | null>;
  };
  customerCommittedDate: {
    findFirst(args: {
      where: { organizationId: string; subjectType: string; subjectId: string };
      select: CustomerDateSelect;
    }): Promise<CustomerCommittedDateRow | null>;
  };
  customerCommittedDateRevision: {
    findMany(args: {
      where: { organizationId: string; committedDateId: string };
      select: CustomerDateRevisionSelect;
      orderBy: [{ revisedAt: 'asc' }, { id: 'asc' }];
    }): Promise<CustomerCommittedDateRevisionRow[]>;
  };
  productionInternalTargetDate: {
    findFirst(args: {
      where: { organizationId: string; subjectType: string; subjectId: string };
      select: ProductionTargetSelect;
    }): Promise<ProductionInternalTargetDateRow | null>;
  };
  productionInternalTargetRevision: {
    findMany(args: {
      where: { organizationId: string; targetDateId: string };
      select: ProductionTargetRevisionSelect;
      orderBy: [{ revisedAt: 'asc' }, { id: 'asc' }];
    }): Promise<ProductionInternalTargetRevisionRow[]>;
  };
  productionDateIssue: {
    findMany(args: {
      where: { organizationId: string; subjectType: string; subjectId: string };
      select: ProductionIssueSelect;
      orderBy: [{ recordedAt: 'asc' }, { id: 'asc' }];
    }): Promise<ProductionDateIssueRow[]>;
  };
  customerDateInformedRecord: {
    findMany(args: {
      where: { organizationId: string; subjectType: string; subjectId: string };
      select: InformedSelect;
      orderBy: [{ recordedAt: 'asc' }, { id: 'asc' }];
    }): Promise<CustomerDateInformedRecordRow[]>;
  };
};

type CustomerDateSelect = {
  id: true;
  organizationId: true;
  subjectType: true;
  subjectId: true;
  partyId: true;
  commercialOwnerMemberId: true;
  committedOn: true;
  originalCommittedOn: true;
  originalReason: true;
  source: true;
  setByMemberId: true;
  setAt: true;
};

type CustomerDateRevisionSelect = {
  id: true;
  committedDateId: true;
  organizationId: true;
  previousCommittedOn: true;
  nextCommittedOn: true;
  reason: true;
  actorMemberId: true;
  source: true;
  revisedAt: true;
};

type ProductionTargetSelect = {
  id: true;
  organizationId: true;
  subjectType: true;
  subjectId: true;
  maintainedByMemberId: true;
  targetOn: true;
  originalTargetOn: true;
  originalReason: true;
  source: true;
  setByMemberId: true;
  setAt: true;
};

type ProductionTargetRevisionSelect = {
  id: true;
  targetDateId: true;
  organizationId: true;
  previousTargetOn: true;
  nextTargetOn: true;
  reason: true;
  actorMemberId: true;
  source: true;
  revisedAt: true;
};

type ProductionIssueSelect = {
  id: true;
  organizationId: true;
  subjectType: true;
  subjectId: true;
  mayAffectProductionCalendar: true;
  mayAffectCustomerDate: true;
  source: true;
  note: true;
  recordedByMemberId: true;
  recordedAt: true;
};

type InformedSelect = {
  id: true;
  issueId: true;
  organizationId: true;
  subjectType: true;
  subjectId: true;
  note: true;
  recordedByMemberId: true;
  recordedAt: true;
  notified: true;
};

const CUSTOMER_DATE_SELECT = {
  id: true,
  organizationId: true,
  subjectType: true,
  subjectId: true,
  partyId: true,
  commercialOwnerMemberId: true,
  committedOn: true,
  originalCommittedOn: true,
  originalReason: true,
  source: true,
  setByMemberId: true,
  setAt: true,
} as const satisfies CustomerDateSelect;

const CUSTOMER_DATE_REVISION_SELECT = {
  id: true,
  committedDateId: true,
  organizationId: true,
  previousCommittedOn: true,
  nextCommittedOn: true,
  reason: true,
  actorMemberId: true,
  source: true,
  revisedAt: true,
} as const satisfies CustomerDateRevisionSelect;

const PRODUCTION_TARGET_SELECT = {
  id: true,
  organizationId: true,
  subjectType: true,
  subjectId: true,
  maintainedByMemberId: true,
  targetOn: true,
  originalTargetOn: true,
  originalReason: true,
  source: true,
  setByMemberId: true,
  setAt: true,
} as const satisfies ProductionTargetSelect;

const PRODUCTION_TARGET_REVISION_SELECT = {
  id: true,
  targetDateId: true,
  organizationId: true,
  previousTargetOn: true,
  nextTargetOn: true,
  reason: true,
  actorMemberId: true,
  source: true,
  revisedAt: true,
} as const satisfies ProductionTargetRevisionSelect;

const PRODUCTION_ISSUE_SELECT = {
  id: true,
  organizationId: true,
  subjectType: true,
  subjectId: true,
  mayAffectProductionCalendar: true,
  mayAffectCustomerDate: true,
  source: true,
  note: true,
  recordedByMemberId: true,
  recordedAt: true,
} as const satisfies ProductionIssueSelect;

const INFORMED_SELECT = {
  id: true,
  issueId: true,
  organizationId: true,
  subjectType: true,
  subjectId: true,
  note: true,
  recordedByMemberId: true,
  recordedAt: true,
  notified: true,
} as const satisfies InformedSelect;

function requireOrganizationId(organizationId: string): string {
  const trimmed = organizationId.trim();
  if (!trimmed) throw new Error('organization_required');
  return trimmed;
}

export function isDateFactsReadPort(
  db: DateFactsReadPort | PrismaDateFactsClient,
): db is DateFactsReadPort {
  return typeof (db as DateFactsReadPort).findOrderInOrganization === 'function';
}

export function asDateFactsReadPort(db: DateFactsReadPort | PrismaDateFactsClient): DateFactsReadPort {
  return isDateFactsReadPort(db) ? db : createPrismaDateFactsReadPort(db);
}

/**
 * Bind Prisma delegates. Every where clause includes organizationId.
 * History where is organizationId plus the parent id, never the parent id alone.
 * Selects scalars only. Does not include nested revisions and does not write.
 */
export function createPrismaDateFactsReadPort(client: PrismaDateFactsClient): DateFactsReadPort {
  return {
    findOrderInOrganization(input) {
      const organizationId = requireOrganizationId(input.organizationId);
      return client.osOrder.findFirst({
        where: { id: input.orderId, organizationId },
        select: { id: true, organizationId: true },
      });
    },
    findCustomerCommittedDate(input) {
      const organizationId = requireOrganizationId(input.organizationId);
      return client.customerCommittedDate.findFirst({
        where: { organizationId, subjectType: input.subjectType, subjectId: input.subjectId },
        select: CUSTOMER_DATE_SELECT,
      });
    },
    listCustomerCommittedDateRevisions(input) {
      const organizationId = requireOrganizationId(input.organizationId);
      return client.customerCommittedDateRevision.findMany({
        where: { organizationId, committedDateId: input.committedDateId },
        select: CUSTOMER_DATE_REVISION_SELECT,
        orderBy: [{ revisedAt: 'asc' }, { id: 'asc' }],
      });
    },
    findProductionInternalTargetDate(input) {
      const organizationId = requireOrganizationId(input.organizationId);
      return client.productionInternalTargetDate.findFirst({
        where: { organizationId, subjectType: input.subjectType, subjectId: input.subjectId },
        select: PRODUCTION_TARGET_SELECT,
      });
    },
    listProductionInternalTargetRevisions(input) {
      const organizationId = requireOrganizationId(input.organizationId);
      return client.productionInternalTargetRevision.findMany({
        where: { organizationId, targetDateId: input.targetDateId },
        select: PRODUCTION_TARGET_REVISION_SELECT,
        orderBy: [{ revisedAt: 'asc' }, { id: 'asc' }],
      });
    },
    listProductionDateIssues(input) {
      const organizationId = requireOrganizationId(input.organizationId);
      return client.productionDateIssue.findMany({
        where: { organizationId, subjectType: input.subjectType, subjectId: input.subjectId },
        select: PRODUCTION_ISSUE_SELECT,
        orderBy: [{ recordedAt: 'asc' }, { id: 'asc' }],
      });
    },
    listCustomerDateInformedRecords(input) {
      const organizationId = requireOrganizationId(input.organizationId);
      return client.customerDateInformedRecord.findMany({
        where: { organizationId, subjectType: input.subjectType, subjectId: input.subjectId },
        select: INFORMED_SELECT,
        orderBy: [{ recordedAt: 'asc' }, { id: 'asc' }],
      });
    },
  };
}
