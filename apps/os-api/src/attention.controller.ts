import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { ListAttentionQuerySchema } from '@isalwa/os-contracts';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import { buildQueryContext, type AttentionQueryService } from '@isalwa/os-query';
import { resolveSession } from './os-session';
import { OS_ATTENTION_QUERY_SERVICE, OS_STORE } from './os-store.module';

@Controller('attention')
export class AttentionController {
  constructor(
    @Inject(OS_STORE) private readonly workforceStore: OsWorkforceStore,
    @Inject(OS_ATTENTION_QUERY_SERVICE) private readonly attentionQuery: AttentionQueryService,
  ) {}

  @Get()
  async listAttention(@Query() queryParams: Record<string, string>, @Req() req: Request) {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const parsed = ListAttentionQuerySchema.safeParse(queryParams);
      if (!parsed.success) {
        throw new HttpException({ code: 'VALIDATION_FAILED' }, HttpStatus.BAD_REQUEST);
      }
      const ctx = await buildQueryContext(session, this.workforceStore);
      return await this.attentionQuery.listAttentionItems(ctx, parsed.data);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      const code = err instanceof Error ? err.message : 'INTERNAL_ERROR';
      const status =
        code === 'AUTH_REQUIRED'
          ? HttpStatus.UNAUTHORIZED
          : code === 'TENANT_FORBIDDEN' || code === 'PERMISSION_DENIED' || code === 'ACCESS_REVOKED'
            ? HttpStatus.FORBIDDEN
            : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException({ code }, status);
    }
  }
}
