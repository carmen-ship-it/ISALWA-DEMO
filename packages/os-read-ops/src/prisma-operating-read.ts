/**
 * Prisma adapter. Every query includes organizationId from the port argument.
 * Receipt queries do not filter by order. Production is not queried by order id.
 */

import type {
  FinishedGoodsReceiptRow,
  OperatingReadDb,
  OrderAllocationRow,
  ProductionQuemaProductRow,
  ProductionQuemaRow,
  ProductionQuemaTimeRow,
  ProductionTraceRow,
  PurchaseNoteRow,
  PurchaseRequestRow,
  PurchaseStatusHistoryRow,
  TenantScopedQuery,
} from './db-port';
import { tenantPredicate } from './source-state';

type FindMany<T> = (args: { where: Record<string, unknown>; orderBy?: unknown }) => Promise<T[]>;
type FindFirst<T> = (args: { where: Record<string, unknown>; select?: unknown }) => Promise<T | null>;

export type OperatingReadPrisma = {
  osCatalogProduct: {
    findFirst: FindFirst<{ id: string }>;
  };
  osPurchaseRequest: {
    findMany: FindMany<PurchaseRequestRow>;
    findFirst: FindFirst<PurchaseRequestRow>;
  };
  osPurchaseRequestStatusHistory: {
    findMany: FindMany<PurchaseStatusHistoryRow>;
  };
  osPurchaseRequestNote: {
    findMany: FindMany<PurchaseNoteRow>;
  };
  osProductionQuema: {
    findMany: FindMany<ProductionQuemaRow>;
  };
  osProductionQuemaTime: {
    findMany: FindMany<ProductionQuemaTimeRow>;
  };
  osProductionQuemaProduct: {
    findMany: FindMany<ProductionQuemaProductRow>;
  };
  osProductionTraceEntry: {
    findMany: FindMany<ProductionTraceRow>;
  };
  osOrderAllocation: {
    findMany: FindMany<OrderAllocationRow>;
    findFirst: FindFirst<OrderAllocationRow>;
  };
  osFinishedGoodsReceipt: {
    findMany: FindMany<FinishedGoodsReceiptRow>;
  };
};

function org(query: TenantScopedQuery): string {
  return tenantPredicate(query.organizationId).organizationId;
}

export function createPrismaOperatingReadDb(prisma: OperatingReadPrisma): OperatingReadDb {
  return {
    async listPurchaseRequests(query) {
      const organizationId = org(query);
      return prisma.osPurchaseRequest.findMany({
        where: { organizationId },
        orderBy: { requestedAt: 'desc' },
      });
    },
    async getPurchaseRequest(query) {
      const organizationId = org(query);
      const id = query.id.trim();
      if (!id) return null;
      return prisma.osPurchaseRequest.findFirst({
        where: { organizationId, id },
      });
    },
    async listPurchaseRequestStatusHistory(query) {
      const organizationId = org(query);
      if (query.purchaseRequestIds.length === 0) return [];
      return prisma.osPurchaseRequestStatusHistory.findMany({
        where: { organizationId, purchaseRequestId: { in: [...query.purchaseRequestIds] } },
        orderBy: { changedAt: 'asc' },
      });
    },
    async listPurchaseRequestNotes(query) {
      const organizationId = org(query);
      if (query.purchaseRequestIds.length === 0) return [];
      return prisma.osPurchaseRequestNote.findMany({
        where: { organizationId, purchaseRequestId: { in: [...query.purchaseRequestIds] } },
        orderBy: { recordedAt: 'asc' },
      });
    },
    async productProvenInOrganization(query) {
      const organizationId = org(query);
      const productId = query.productId.trim();
      if (!productId) return false;
      const row = await prisma.osCatalogProduct.findFirst({
        where: { organizationId, id: productId },
        select: { id: true },
      });
      return row?.id === productId;
    },
    async listProductionQuemas(query) {
      const organizationId = org(query);
      if (query.quemaIds && query.quemaIds.length === 0) return [];
      return prisma.osProductionQuema.findMany({
        where: {
          organizationId,
          ...(query.quemaIds ? { id: { in: [...query.quemaIds] } } : {}),
        },
        orderBy: { recordedAt: 'desc' },
      });
    },
    async listProductionQuemaTimes(query) {
      const organizationId = org(query);
      if (query.quemaIds && query.quemaIds.length === 0) return [];
      return prisma.osProductionQuemaTime.findMany({
        where: {
          organizationId,
          ...(query.quemaIds ? { quemaId: { in: [...query.quemaIds] } } : {}),
        },
        orderBy: { recordedAt: 'desc' },
      });
    },
    async listProductionQuemaProducts(query) {
      const organizationId = org(query);
      const productId = query.productId?.trim();
      return prisma.osProductionQuemaProduct.findMany({
        where: {
          organizationId,
          ...(productId ? { productId } : {}),
        },
        orderBy: { recordedAt: 'desc' },
      });
    },
    async listProductionTraceEntries(query) {
      const organizationId = org(query);
      const productId = query.productId?.trim();
      return prisma.osProductionTraceEntry.findMany({
        where: {
          organizationId,
          ...(productId ? { productId } : {}),
        },
        orderBy: { recordedAt: 'desc' },
      });
    },
    async listOrderAllocations(query) {
      const organizationId = org(query);
      const productId = query.productId?.trim();
      const orderLineId = query.orderLineId?.trim();
      return prisma.osOrderAllocation.findMany({
        where: {
          organizationId,
          ...(productId ? { productId } : {}),
          ...(orderLineId ? { orderLineId } : {}),
        },
        orderBy: { allocatedAt: 'desc' },
      });
    },
    async getOrderAllocation(query) {
      const organizationId = org(query);
      const id = query.id.trim();
      if (!id) return null;
      return prisma.osOrderAllocation.findFirst({
        where: { organizationId, id },
      });
    },
    async listFinishedGoodsReceipts(query) {
      const organizationId = org(query);
      const productId = query.productId?.trim();
      return prisma.osFinishedGoodsReceipt.findMany({
        where: {
          organizationId,
          ...(productId ? { productId } : {}),
        },
        orderBy: { receivedAt: 'desc' },
      });
    },
  };
}
