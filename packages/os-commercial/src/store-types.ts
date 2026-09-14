import type {
  CommercialCurrency,
  OpportunityStatus,
  OrderStatus,
  QuoteStatus,
} from '@isalwa/os-contracts';

export type MemberRecord = {
  id: string;
  organizationId: string;
  accessStatus: string;
};

export type PartyRecord = {
  id: string;
  organizationId: string;
  status: string;
  mergedIntoPartyId: string | null;
};

export type CommercialAccountRecord = {
  id: string;
  organizationId: string;
  partyId: string;
  ownerMemberId: string | null;
  status: string;
  version: number;
};

export type RoleAssignmentRecord = {
  roleKey: string;
  effectiveAt: Date;
  endedAt: Date | null;
};

export type DelegationRecord = {
  scopes: string[];
  startsAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  delegatorMemberId: string;
};

export type IdempotencyRecord = {
  organizationId: string;
  key: string;
  commandName: string;
  resultJson: Record<string, unknown>;
  expiresAt: Date;
};

export type OpportunityRecord = {
  id: string;
  organizationId: string;
  partyId: string;
  commercialAccountId: string | null;
  ownerMemberId: string;
  title: string;
  stage: string;
  status: OpportunityStatus;
  expectedValueCentavos: bigint | null;
  sourceMetadataJson: Record<string, unknown> | null;
  version: number;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type QuoteRecord = {
  id: string;
  organizationId: string;
  partyId: string;
  commercialAccountId: string | null;
  opportunityId: string | null;
  ownerMemberId: string;
  quoteNumber: string;
  status: QuoteStatus;
  currency: CommercialCurrency;
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
};

export type QuoteLineRecord = {
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
};

export type OrderRecord = {
  id: string;
  organizationId: string;
  partyId: string;
  commercialAccountId: string | null;
  quoteId: string;
  ownerMemberId: string;
  orderNumber: string;
  status: OrderStatus;
  currency: CommercialCurrency;
  subtotalCentavos: bigint;
  headerDiscountCentavos: bigint;
  totalCentavos: bigint;
  version: number;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Snapshot copied at conversion. No product-master join. Old orders have no rows. */
export type OrderLineRecord = {
  id: string;
  organizationId: string;
  orderId: string;
  quoteId: string;
  quoteLineId: string;
  lineNumber: number;
  descriptionSnapshot: string;
  quantity: number;
  unitLabel: string | null;
  unitPriceCentavosSnapshot: bigint;
  discountCentavos: bigint;
  lineTotalCentavos: bigint;
  productRefSnapshot: string | null;
  provenance: 'quote_conversion_snapshot';
  copiedAt: Date;
  createdAt: Date;
};
