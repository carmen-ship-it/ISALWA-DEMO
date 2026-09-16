import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  Query,
  Req,
  StreamableFile,
} from '@nestjs/common';
import type { Request } from 'express';
import { getOsPrisma } from '@isalwa/os-database';
import {
  FulfillmentReadService,
  createPrismaFulfillmentReadDb,
  type DeliveryRead,
  type FulfillmentPrismaDb,
  type WarehouseExitRead,
} from '@isalwa/os-read-fulfillment';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import { resolveSession } from './os-session';
import {
  OS_DELIVERY_NOTE_PDF_SERVICE,
  OS_STORE,
} from './os-store.module';
import type { DeliveryNotePdfService } from './delivery-note-pdf.service';

type FulfillmentListResponse<T> = {
  sourceState: 'AVAILABLE' | 'NO_FACT' | 'UNPROVEN' | 'ERROR';
  code: string | null;
  count: number;
  items: T[];
};

function mapFulfillmentError(err: unknown): HttpException {
  if (err instanceof HttpException) return err;
  const code = err instanceof Error ? err.message : 'INTERNAL_ERROR';
  const status =
    code === 'AUTH_REQUIRED' || code === 'PROVIDER_NOT_CONFIGURED'
      ? HttpStatus.UNAUTHORIZED
      : code === 'PERMISSION_DENIED' || code === 'TENANT_FORBIDDEN' || code === 'ACCESS_REVOKED'
        ? HttpStatus.FORBIDDEN
        : code === 'NOT_FOUND'
          ? HttpStatus.NOT_FOUND
          : HttpStatus.INTERNAL_SERVER_ERROR;
  return new HttpException({ code }, status);
}

function createService(): FulfillmentReadService {
  const prisma = getOsPrisma();
  if (!prisma) {
    throw new HttpException({ code: 'PROVIDER_NOT_CONFIGURED' }, HttpStatus.SERVICE_UNAVAILABLE);
  }
  return new FulfillmentReadService(
    createPrismaFulfillmentReadDb(prisma as unknown as FulfillmentPrismaDb),
  );
}

function availableList<T>(items: T[]): FulfillmentListResponse<T> {
  return {
    sourceState: 'AVAILABLE',
    code: null,
    count: items.length,
    items,
  };
}

/**
 * Minimal fulfillment reads. Package + schema + management.org.read already exist.
 * Does not invent delivery-from-order. Write commands stay on their own scopes.
 */
@Controller('fulfillment')
export class FulfillmentController {
  constructor(
    @Inject(OS_STORE) private readonly workforceStore: OsWorkforceStore,
    @Inject(OS_DELIVERY_NOTE_PDF_SERVICE) private readonly deliveryNotePdf: DeliveryNotePdfService,
  ) {}

  @Get('warehouse-exits')
  async listWarehouseExits(
    @Query('orderId') orderId: string | undefined,
    @Req() req: Request,
  ): Promise<FulfillmentListResponse<WarehouseExitRead>> {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const service = createService();
      const result = await service.readWarehouseExits(
        {
          organizationId: session.organizationId,
          actorMemberId: session.actorMemberId,
          grantedScopes: session.grantedScopes,
        },
        { orderId: orderId?.trim() || null },
      );

      if (result.sourceState === 'ERROR') {
        if (result.code === 'PERMISSION_DENIED' || result.code === 'AUTH_REQUIRED') {
          throw new HttpException({ code: result.code }, HttpStatus.FORBIDDEN);
        }
        if (result.code === 'NOTE_PREDATES_EXIT') {
          throw new HttpException({ code: result.code }, HttpStatus.CONFLICT);
        }
        throw new HttpException({ code: result.code ?? 'INTERNAL_ERROR' }, HttpStatus.INTERNAL_SERVER_ERROR);
      }
      if (result.sourceState === 'NO_FACT' || result.sourceState === 'UNPROVEN') {
        return {
          sourceState: result.sourceState,
          code: result.code,
          count: 0,
          items: [],
        };
      }
      return availableList(result.rows);
    } catch (err) {
      throw mapFulfillmentError(err);
    }
  }

  @Get('deliveries')
  async listDeliveries(
    @Query('orderId') orderId: string | undefined,
    @Req() req: Request,
  ): Promise<FulfillmentListResponse<DeliveryRead>> {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const service = createService();
      const result = await service.readDeliveries(
        {
          organizationId: session.organizationId,
          actorMemberId: session.actorMemberId,
          grantedScopes: session.grantedScopes,
        },
        { orderId: orderId?.trim() || null },
      );

      if (result.sourceState === 'ERROR') {
        if (result.code === 'PERMISSION_DENIED' || result.code === 'AUTH_REQUIRED') {
          throw new HttpException({ code: result.code }, HttpStatus.FORBIDDEN);
        }
        if (result.code === 'NOTE_PREDATES_DELIVERY') {
          throw new HttpException({ code: result.code }, HttpStatus.CONFLICT);
        }
        throw new HttpException({ code: result.code ?? 'INTERNAL_ERROR' }, HttpStatus.INTERNAL_SERVER_ERROR);
      }
      if (result.sourceState === 'NO_FACT' || result.sourceState === 'UNPROVEN') {
        return {
          sourceState: result.sourceState,
          code: 'code' in result ? result.code : null,
          count: 0,
          items: [],
        };
      }
      return availableList(result.rows);
    } catch (err) {
      throw mapFulfillmentError(err);
    }
  }

  @Get('delivery-notes/:noteId/pdf')
  async getDeliveryNotePdf(
    @Param('noteId') noteId: string,
    @Query('disposition') disposition: string | undefined,
    @Req() req: Request,
  ) {
    try {
      const trimmed = noteId?.trim();
      if (!trimmed) {
        throw new HttpException({ code: 'NOT_FOUND' }, HttpStatus.NOT_FOUND);
      }
      const session = await resolveSession(req, this.workforceStore);
      const rendered = await this.deliveryNotePdf.renderAuthorizedNote({
        organizationId: session.organizationId,
        actorMemberId: session.actorMemberId,
        effectiveAt: session.effectiveAt,
        noteId: trimmed,
      });
      const inline = disposition === 'inline';
      const contentDisposition = `${inline ? 'inline' : 'attachment'}; filename="${rendered.filename}"`;
      return new StreamableFile(Buffer.from(rendered.bytes), {
        type: rendered.contentType,
        disposition: contentDisposition,
      });
    } catch (err) {
      throw mapFulfillmentError(err);
    }
  }
}
