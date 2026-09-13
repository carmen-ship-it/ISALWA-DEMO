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
import { ListMembersQuerySchema } from '@isalwa/os-contracts';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import { buildQueryContext, type MemberQueryService } from '@isalwa/os-query';
import { resolveSession } from './os-session';
import { OS_MEMBER_QUERY_SERVICE, OS_STORE } from './os-store.module';

function toHttp(err: unknown): HttpException {
  if (err instanceof HttpException) return err;
  const code = err instanceof Error ? err.message : 'INTERNAL_ERROR';
  const status =
    code === 'AUTH_REQUIRED' || code === 'PROVIDER_NOT_CONFIGURED'
      ? HttpStatus.UNAUTHORIZED
      : code === 'NOT_FOUND'
        ? HttpStatus.NOT_FOUND
      : code === 'TENANT_FORBIDDEN' ||
          code === 'PERMISSION_DENIED' ||
          code === 'ACCESS_REVOKED'
        ? HttpStatus.FORBIDDEN
        : code === 'VALIDATION_FAILED'
          ? HttpStatus.BAD_REQUEST
          : HttpStatus.INTERNAL_SERVER_ERROR;
  return new HttpException({ code }, status);
}

@Controller('members')
export class MembersController {
  constructor(
    @Inject(OS_STORE) private readonly workforceStore: OsWorkforceStore,
    @Inject(OS_MEMBER_QUERY_SERVICE) private readonly memberQuery: MemberQueryService,
  ) {}

  @Get()
  async listMembers(@Query() queryParams: Record<string, string>, @Req() req: Request) {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const parsed = ListMembersQuerySchema.safeParse(queryParams);
      if (!parsed.success) {
        throw new HttpException({ code: 'VALIDATION_FAILED' }, HttpStatus.BAD_REQUEST);
      }
      const ctx = await buildQueryContext(session, this.workforceStore);
      return await this.memberQuery.listMembers(ctx, parsed.data);
    } catch (err) {
      throw toHttp(err);
    }
  }

  @Get(':memberId')
  async getMember(@Param('memberId') memberId: string, @Req() req: Request) {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const ctx = await buildQueryContext(session, this.workforceStore);
      const summary = await this.memberQuery.getMember(ctx, memberId);
      return {
        member: {
          id: summary.memberId,
          organizationId: summary.organizationId,
          personId: summary.personId,
          accessStatus: summary.accessStatus,
          employmentStatus: summary.employmentStatus,
        },
        person: {
          id: summary.personId,
          givenName: summary.givenName,
          familyName: summary.familyName,
        },
        summary,
        organizationId: session.organizationId,
      };
    } catch (err) {
      throw toHttp(err);
    }
  }
}
