/**
 * Almacén desk facts for holders of warehouse receive or allocate scopes.
 * Not the management.org.read company operating reader. Not official stock.
 */
import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  canAllocateFinishedGoods,
  canReceiveFinishedGoods,
} from '@isalwa/os-contracts';
import { getOsPrisma } from '@isalwa/os-database';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import { resolveSession } from './os-session';
import { OS_STORE } from './os-store.module';

const WAREHOUSE_LABEL = 'Almacén de Productos Terminados';

@Controller('warehouse')
export class WarehouseDeskController {
  constructor(@Inject(OS_STORE) private readonly workforceStore: OsWorkforceStore) {}

  /**
   * GET /v1/warehouse/finished-goods-desk
   * Tenant-scoped receipts + allocations for the Almacén desk projection.
   */
  @Get('finished-goods-desk')
  async finishedGoodsDesk(@Req() req: Request) {
    const session = await resolveSession(req, this.workforceStore);
    const mayReceive = canReceiveFinishedGoods(session.grantedScopes);
    const mayAllocate = canAllocateFinishedGoods({
      grantedScopes: session.grantedScopes,
    });
    if (!mayReceive && !mayAllocate) {
      throw new HttpException({ code: 'PERMISSION_DENIED' }, HttpStatus.FORBIDDEN);
    }

    const prisma = getOsPrisma();
    if (!prisma) {
      throw new HttpException({ code: 'SERVICE_UNAVAILABLE' }, HttpStatus.SERVICE_UNAVAILABLE);
    }

    const organizationId = session.organizationId;
    const [receiptRows, allocationRows] = await Promise.all([
      prisma.osFinishedGoodsReceipt.findMany({
        where: { organizationId, warehouseLabel: WAREHOUSE_LABEL },
        orderBy: { receivedAt: 'asc' },
        take: 500,
      }),
      prisma.osOrderAllocation.findMany({
        where: { organizationId },
        orderBy: { allocatedAt: 'asc' },
        take: 500,
      }),
    ]);

    return {
      organizationId,
      officialStock: false as const,
      postsStock: false as const,
      receipts: receiptRows.map((row) => ({
        organizationId: row.organizationId,
        productId: row.productId,
        productLabel: null as string | null,
        quantity: row.quantity,
        receiptId: row.id,
      })),
      allocations: allocationRows.map((row) => ({
        id: row.id,
        organizationId: row.organizationId,
        finishedProductId: row.productId,
        productId: row.productId,
        goodsKind: row.goodsKind,
        quantity: row.quantity,
        orderLineId: row.orderLineId,
        allocatedAt: row.allocatedAt.toISOString(),
        recordedAt: row.recordedAt.toISOString(),
        actorMemberId: row.actorMemberId,
        actorLabel: row.actorLabel,
        source: row.source,
        finishedGoodsReceiptId: row.finishedGoodsReceiptId,
        idempotencyKey: row.idempotencyKey,
        createdByReceipt: false as const,
        officialStock: false as const,
        wholeOrderFulfilled: false as const,
        isPartialDeliveryWorkflow: false as const,
      })),
    };
  }
}
