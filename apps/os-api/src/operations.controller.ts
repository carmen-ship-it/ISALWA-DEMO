import {
  Body,
  Controller,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { RetryDeadLetterDeliveryPayloadSchema } from '@isalwa/os-contracts';
import { buildQueryContext, assertQueryScope } from '@isalwa/os-query';
import type { OutboxRecoveryService, OutboxWorkerHost } from '@isalwa/os-events';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import { resolveSession } from './os-session';
import { OS_OUTBOX_RECOVERY_SERVICE, OS_OUTBOX_WORKER_HOST, OS_STORE } from './os-store.module';

function mapOpsError(err: unknown): HttpException {
  if (err instanceof HttpException) return err;
  const code = err instanceof Error ? err.message : 'INTERNAL_ERROR';
  const status =
    code === 'AUTH_REQUIRED' || code === 'PROVIDER_NOT_CONFIGURED'
      ? HttpStatus.UNAUTHORIZED
      : code === 'PERMISSION_DENIED' || code === 'TENANT_FORBIDDEN'
        ? HttpStatus.FORBIDDEN
        : code === 'NOT_FOUND'
          ? HttpStatus.NOT_FOUND
          : code === 'VALIDATION_FAILED'
            ? HttpStatus.BAD_REQUEST
            : HttpStatus.INTERNAL_SERVER_ERROR;
  return new HttpException({ code }, status);
}

@Controller('operations')
export class OperationsController {
  constructor(
    @Inject(OS_STORE) private readonly workforceStore: OsWorkforceStore,
    @Inject(OS_OUTBOX_WORKER_HOST) private readonly outboxHost: OutboxWorkerHost,
    @Inject(OS_OUTBOX_RECOVERY_SERVICE) private readonly recoveryService: OutboxRecoveryService,
  ) {}

  private async requireAdmin(req: Request) {
    const session = await resolveSession(req, this.workforceStore);
    const ctx = await buildQueryContext(session, this.workforceStore);
    assertQueryScope(ctx, 'people.admin');
    return session;
  }

  @Get('outbox')
  async outboxHealth(@Req() req: Request) {
    try {
      const session = await this.requireAdmin(req);
      const health = await this.outboxHost.getHealth(session.organizationId);
      return {
        organizationId: session.organizationId,
        ...health,
      };
    } catch (err) {
      throw mapOpsError(err);
    }
  }

  @Get('outbox/dead-letters')
  async listDeadLetters(@Req() req: Request) {
    try {
      const session = await this.requireAdmin(req);
      const items = await this.recoveryService.listDeadLetters(session.organizationId);
      return { organizationId: session.organizationId, items };
    } catch (err) {
      throw mapOpsError(err);
    }
  }

  @Get('outbox/dead-letters/:outboxId')
  async getDeadLetter(@Param('outboxId') outboxId: string, @Req() req: Request) {
    try {
      const session = await this.requireAdmin(req);
      const row = await this.recoveryService.getDeadLetterSummary(
        session.organizationId,
        outboxId,
      );
      if (!row) {
        throw new HttpException({ code: 'NOT_FOUND' }, HttpStatus.NOT_FOUND);
      }
      return {
        organizationId: session.organizationId,
        outboxId: row.id,
        eventId: row.eventId,
        status: row.status,
        attemptCount: row.attemptCount,
        lastError: row.lastError,
        createdAt: row.createdAt.toISOString(),
        publishedAt: row.publishedAt?.toISOString() ?? null,
      };
    } catch (err) {
      throw mapOpsError(err);
    }
  }

  @Post('outbox/dead-letters/:outboxId/retry')
  async retryDeadLetter(
    @Param('outboxId') outboxId: string,
    @Body() body: unknown,
    @Req() req: Request,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ) {
    try {
      const session = await this.requireAdmin(req);
      const parsed = RetryDeadLetterDeliveryPayloadSchema.safeParse({
        outboxId,
        ...(typeof body === 'object' && body ? body : {}),
      });
      if (!parsed.success) {
        throw new HttpException({ code: 'VALIDATION_FAILED' }, HttpStatus.BAD_REQUEST);
      }
      return await this.recoveryService.retryDeadLetterDelivery(
        session,
        outboxId,
        parsed.data.reason,
        idempotencyKey?.trim() || undefined,
      );
    } catch (err) {
      throw mapOpsError(err);
    }
  }
}
