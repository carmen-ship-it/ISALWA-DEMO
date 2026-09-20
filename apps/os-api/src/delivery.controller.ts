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
import {
  canRecordDelivery,
  canRecordWarehouseOutbound,
} from '@isalwa/os-contracts';
import { getOsPrisma } from '@isalwa/os-database';
import type { DeliveryCommandService } from '@isalwa/os-delivery';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import { resolveSession } from './os-session';
import {
  OS_DELIVERY_COMMAND_SERVICE,
  OS_DELIVERY_NOTE_PDF_SERVICE,
  OS_STORE,
} from './os-store.module';
import type { DeliveryNotePdfService } from './delivery-note-pdf.service';

function toHttp(err: unknown): HttpException {
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
            : code === 'PDF_RENDER_FAILED'
              ? HttpStatus.INTERNAL_SERVER_ERROR
              : HttpStatus.INTERNAL_SERVER_ERROR;
  return new HttpException({ code }, status);
}

function canReadOperationalOrders(scopes: readonly string[]): boolean {
  return canRecordDelivery(scopes) || canRecordWarehouseOutbound(scopes);
}

type OperationalOrderLine = {
  orderLineId: string;
  description: string;
  quantity: number;
  unitLabel: string | null;
  productRef: string | null;
};

type OperationalOrder = {
  orderId: string;
  orderNumber: string;
  partyId: string;
  customerName: string;
  status: string;
  quoteId: string;
  lines: OperationalOrderLine[];
};

type OperationalNote = {
  id: string;
  internalDocumentRef: string;
  status: 'issued' | 'reversed';
  recipient: string;
  deliveredBy: string;
  receivedBy: string | null;
  observations: string | null;
  bornAt: string;
  lines: OperationalOrderLine[];
};

type OperationalTimelineItem = {
  id: string;
  eventType: string;
  occurredAt: string;
  label: string;
  detail: string;
};

async function loadCustomerName(
  prisma: NonNullable<ReturnType<typeof getOsPrisma>>,
  organizationId: string,
  partyId: string,
): Promise<string> {
  const party = await prisma.osParty.findFirst({
    where: { id: partyId, organizationId },
    select: { displayName: true },
  });
  return party?.displayName?.trim() || 'Cliente';
}

function mapOperationalOrder(
  row: {
    id: string;
    orderNumber: string;
    partyId: string;
    status: string;
    quoteId: string;
    lines?: Array<{
      id: string;
      descriptionSnapshot: string;
      quantity: number;
      unitLabel: string | null;
      productRefSnapshot: string | null;
    }>;
  },
  customerName: string,
): OperationalOrder {
  return {
    orderId: row.id,
    orderNumber: row.orderNumber,
    partyId: row.partyId,
    customerName,
    status: row.status,
    quoteId: row.quoteId,
    lines: (row.lines ?? []).map((line) => ({
      orderLineId: line.id,
      description: line.descriptionSnapshot,
      quantity: line.quantity,
      unitLabel: line.unitLabel ?? null,
      productRef: line.productRefSnapshot ?? null,
    })),
  };
}

/**
 * Operational Pedido context for Entregas / warehouse writers.
 * Does not use commercial-read. Does not return money/pricing.
 */
@Controller('delivery-ops')
export class DeliveryOpsController {
  constructor(@Inject(OS_STORE) private readonly workforceStore: OsWorkforceStore) {}

  @Get('orders')
  async listOperationalOrders(@Req() req: Request): Promise<{ items: OperationalOrder[] }> {
    try {
      const session = await resolveSession(req, this.workforceStore);
      if (!canReadOperationalOrders(session.grantedScopes)) {
        throw new HttpException({ code: 'PERMISSION_DENIED' }, HttpStatus.FORBIDDEN);
      }
      const prisma = getOsPrisma();
      if (!prisma) {
        throw new HttpException({ code: 'PROVIDER_NOT_CONFIGURED' }, HttpStatus.UNAUTHORIZED);
      }
      const rows = await prisma.osOrder.findMany({
        where: { organizationId: session.organizationId, status: 'open' },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { lines: true },
      });
      const partyIds = [...new Set(rows.map((row) => row.partyId))];
      const parties = partyIds.length
        ? await prisma.osParty.findMany({
            where: { organizationId: session.organizationId, id: { in: partyIds } },
            select: { id: true, displayName: true },
          })
        : [];
      const nameByParty = new Map(
        parties.map((party) => [party.id, party.displayName?.trim() || 'Cliente'] as const),
      );
      return {
        items: rows.map((row) =>
          mapOperationalOrder(row, nameByParty.get(row.partyId) ?? 'Cliente'),
        ),
      };
    } catch (err) {
      throw toHttp(err);
    }
  }

  @Get('orders/:orderId')
  async getOperationalOrder(
    @Param('orderId') orderId: string,
    @Req() req: Request,
  ): Promise<{ order: OperationalOrder }> {
    try {
      const session = await resolveSession(req, this.workforceStore);
      if (!canReadOperationalOrders(session.grantedScopes)) {
        throw new HttpException({ code: 'PERMISSION_DENIED' }, HttpStatus.FORBIDDEN);
      }
      const prisma = getOsPrisma();
      if (!prisma) {
        throw new HttpException({ code: 'PROVIDER_NOT_CONFIGURED' }, HttpStatus.UNAUTHORIZED);
      }
      const row = await prisma.osOrder.findFirst({
        where: { id: orderId.trim(), organizationId: session.organizationId },
        include: { lines: true },
      });
      if (!row || row.status === 'cancelled') {
        throw new HttpException({ code: 'NOT_FOUND' }, HttpStatus.NOT_FOUND);
      }
      const customerName = await loadCustomerName(prisma, session.organizationId, row.partyId);
      return { order: mapOperationalOrder(row, customerName) };
    } catch (err) {
      throw toHttp(err);
    }
  }

  /**
   * Operational notes + timeline for Entregas writers.
   * Readable with delivery.record OR warehouse.outbound.record (no commercial-read).
   * Does not authorize note create — commands still enforce delivery.record.
   */
  @Get('orders/:orderId/documents')
  async getOperationalDocuments(
    @Param('orderId') orderId: string,
    @Req() req: Request,
  ): Promise<{ notes: OperationalNote[]; timeline: OperationalTimelineItem[] }> {
    try {
      const session = await resolveSession(req, this.workforceStore);
      if (!canReadOperationalOrders(session.grantedScopes)) {
        throw new HttpException({ code: 'PERMISSION_DENIED' }, HttpStatus.FORBIDDEN);
      }
      const prisma = getOsPrisma();
      if (!prisma) {
        throw new HttpException({ code: 'PROVIDER_NOT_CONFIGURED' }, HttpStatus.UNAUTHORIZED);
      }
      const order = await prisma.osOrder.findFirst({
        where: { id: orderId.trim(), organizationId: session.organizationId },
        select: { id: true, status: true },
      });
      if (!order || order.status === 'cancelled') {
        throw new HttpException({ code: 'NOT_FOUND' }, HttpStatus.NOT_FOUND);
      }
      const noteRows = await prisma.osDeliveryNote.findMany({
        where: { organizationId: session.organizationId, orderId: order.id },
        orderBy: { bornAt: 'asc' },
      });
      const noteIds = noteRows.map((note) => note.id);
      const lineRows = noteIds.length
        ? await prisma.osDeliveryNoteLine.findMany({
            where: { organizationId: session.organizationId, deliveryNoteId: { in: noteIds } },
          })
        : [];
      const linesByNote = new Map<string, OperationalOrderLine[]>();
      for (const line of lineRows) {
        const bucket = linesByNote.get(line.deliveryNoteId) ?? [];
        bucket.push({
          orderLineId: line.orderLineId,
          description: line.description,
          quantity: line.quantity,
          unitLabel: line.unitLabel ?? null,
          productRef: line.productRef ?? null,
        });
        linesByNote.set(line.deliveryNoteId, bucket);
      }
      const notes: OperationalNote[] = noteRows.map((note) => ({
        id: note.id,
        internalDocumentRef: note.internalDocumentRef,
        status: note.status === 'reversed' ? 'reversed' : 'issued',
        recipient: note.recipient,
        deliveredBy: note.deliveredBy,
        receivedBy: note.receivedBy ?? null,
        observations: note.observations ?? null,
        bornAt: note.bornAt.toISOString(),
        lines: linesByNote.get(note.id) ?? [],
      }));

      const [exits, deliveries] = await Promise.all([
        prisma.osWarehouseExit.findMany({
          where: { organizationId: session.organizationId, orderId: order.id },
          orderBy: { exitedAt: 'asc' },
        }),
        prisma.osDelivery.findMany({
          where: { organizationId: session.organizationId, orderId: order.id },
          orderBy: { deliveredAt: 'asc' },
        }),
      ]);

      const timeline: OperationalTimelineItem[] = [];
      for (const note of noteRows) {
        timeline.push({
          id: `note:${note.id}`,
          eventType: note.correctsNoteId ? 'delivery_note.corrected' : 'delivery_note.created',
          occurredAt: note.bornAt.toISOString(),
          label: note.correctsNoteId ? 'Nota de entrega corregida' : 'Nota de entrega creada',
          detail: note.internalDocumentRef,
        });
      }
      for (const exit of exits) {
        timeline.push({
          id: `exit:${exit.id}`,
          eventType: 'warehouse_exit.recorded',
          occurredAt: exit.exitedAt.toISOString(),
          label: 'Salida registrada',
          detail: '',
        });
      }
      for (const delivery of deliveries) {
        timeline.push({
          id: `delivery:${delivery.id}`,
          eventType: 'customer_delivery.recorded',
          occurredAt: delivery.deliveredAt.toISOString(),
          label: 'Entrega registrada',
          detail: delivery.deliveredTo?.trim()
            ? `Recibido por: ${delivery.deliveredTo.trim()}`
            : '',
        });
      }
      timeline.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
      return { notes, timeline };
    } catch (err) {
      throw toHttp(err);
    }
  }
}

@Controller('delivery-notes')
export class DeliveryNotesController {
  constructor(
    @Inject(OS_STORE) private readonly workforceStore: OsWorkforceStore,
    @Inject(OS_DELIVERY_COMMAND_SERVICE) private readonly deliveryCommands: DeliveryCommandService,
    @Inject(OS_DELIVERY_NOTE_PDF_SERVICE) private readonly deliveryNotePdf: DeliveryNotePdfService,
  ) {}

  @Get()
  async listForOrder(@Query('orderId') orderId: string | undefined, @Req() req: Request) {
    try {
      if (!orderId?.trim()) {
        throw new HttpException({ code: 'VALIDATION_FAILED' }, HttpStatus.BAD_REQUEST);
      }
      const session = await resolveSession(req, this.workforceStore);
      const ctx = {
        organizationId: session.organizationId,
        actorMemberId: session.actorMemberId,
        effectiveAt: session.effectiveAt ?? new Date(),
      };
      const notes = await this.deliveryCommands.listNotesForOrder(ctx, orderId.trim());
      const timeline = await this.deliveryCommands.listTimelineForOrder(ctx, orderId.trim());
      const withLines = await Promise.all(
        notes.map(async (note) => ({
          ...note,
          lines: await this.deliveryCommands.listDeliveryNoteLinesForNote(ctx, note.id),
        })),
      );
      return { notes: withLines, timeline };
    } catch (err) {
      throw toHttp(err);
    }
  }

  @Get(':id/pdf')
  async getPdf(@Param('id') id: string, @Req() req: Request) {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const ctx = {
        organizationId: session.organizationId,
        actorMemberId: session.actorMemberId,
        effectiveAt: session.effectiveAt ?? new Date(),
      };
      const note = await this.deliveryCommands.getDeliveryNoteById(ctx, id);
      const [lines, order] = await Promise.all([
        this.deliveryCommands.listDeliveryNoteLinesForNote(ctx, id),
        this.deliveryCommands.getOrderSnapshotForNote(ctx, id),
      ]);
      const rendered = await this.deliveryNotePdf.renderAuthorizedNote({
        note,
        lines,
        orderNumber: order?.orderNumber ?? null,
      });
      return new StreamableFile(Buffer.from(rendered.bytes), {
        type: rendered.contentType,
        disposition: `attachment; filename="${rendered.filename}"`,
      });
    } catch (err) {
      throw toHttp(err);
    }
  }
}
