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
