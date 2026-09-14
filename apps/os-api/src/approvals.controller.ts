import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { ListPendingApprovalsQuerySchema } from '@isalwa/os-contracts';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import { buildQueryContext, type ApprovalQueryService } from '@isalwa/os-query';
import { resolveSession } from './os-session';
import { OS_APPROVAL_QUERY_SERVICE, OS_STORE } from './os-store.module';

@Controller('approvals')
export class ApprovalsController {
  constructor(
    @Inject(OS_STORE) private readonly workforceStore: OsWorkforceStore,
    @Inject(OS_APPROVAL_QUERY_SERVICE) private readonly approvalQuery: ApprovalQueryService,
  ) {}

  @Get()
  async listPendingApprovals(@Query() queryParams: Record<string, string>, @Req() req: Request) {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const parsed = ListPendingApprovalsQuerySchema.safeParse(queryParams);
      if (!parsed.success) {
        throw new HttpException({ code: 'VALIDATION_FAILED' }, HttpStatus.BAD_REQUEST);
      }
      const ctx = await buildQueryContext(session, this.workforceStore);
      return await this.approvalQuery.listPendingApprovals(ctx, parsed.data);
    } catch (err) {
      throw this.toHttp(err);
    }
  }

  @Get('subject')
  async listSubjectApprovals(
    @Query('subjectType') subjectType: string,
    @Query('subjectId') subjectId: string,
    @Req() req: Request,
  ) {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const ctx = await buildQueryContext(session, this.workforceStore);
      return await this.approvalQuery.listSubjectApprovals(ctx, subjectType ?? '', subjectId ?? '');
    } catch (err) {
      throw this.toHttp(err);
    }
  }

  @Get(':approvalRequestId')
  async getApproval(@Param('approvalRequestId') approvalRequestId: string, @Req() req: Request) {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const ctx = await buildQueryContext(session, this.workforceStore);
      return await this.approvalQuery.getApproval(ctx, approvalRequestId);
    } catch (err) {
      throw this.toHttp(err);
    }
  }

  private toHttp(err: unknown): HttpException {
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
              : HttpStatus.INTERNAL_SERVER_ERROR;
    return new HttpException({ code }, status);
  }
}
