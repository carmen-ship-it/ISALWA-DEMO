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
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import type { OsProductFeedbackStore, ProductFeedbackRecord } from '@isalwa/os-database';
import { PRODUCT_FEEDBACK_REVIEW_SCOPE } from '@isalwa/os-contracts';
import {
  computeEffectiveScopes,
  memberHasGrantedScope,
  assertMemberActive,
  type MemberAccessSnapshot,
} from '@isalwa/os-domain';
import { resolveSession } from './os-session';
import { OS_STORE, OS_PRODUCT_FEEDBACK_STORE } from './os-store.module';

type FeedbackSummary = {
  id: string;
  organizationId: string;
  memberId: string;
  route: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
};

function toSummary(record: ProductFeedbackRecord): FeedbackSummary {
  return {
    id: record.id,
    organizationId: record.organizationId,
    memberId: record.memberId,
    route: record.route,
    message: record.message,
    entityType: record.entityType,
    entityId: record.entityId,
    createdAt: record.createdAt.toISOString(),
  };
}

@Controller('product-feedback')
export class ProductFeedbackController {
  constructor(
    @Inject(OS_STORE) private readonly workforceStore: OsWorkforceStore,
    @Inject(OS_PRODUCT_FEEDBACK_STORE) private readonly feedbackStore: OsProductFeedbackStore,
  ) {}

  private async getAccessSnapshot(
    organizationId: string,
    memberId: string,
    asOf: Date,
  ): Promise<MemberAccessSnapshot | null> {
    const member = await this.workforceStore.getMemberInOrg(organizationId, memberId);
    if (!member) return null;
    const roles = await this.workforceStore.listRoleAssignmentsForMember(memberId, organizationId);
    const delegations = await this.workforceStore.listDelegationsForDelegate(memberId, organizationId);
    return {
      memberId: member.id,
      organizationId: member.organizationId,
      accessStatus: member.accessStatus,
      roleKeys: computeEffectiveScopes(
        roles.map((r) => ({ roleKey: r.roleKey, effectiveAt: r.effectiveAt, endedAt: r.endedAt })),
        delegations.map((d) => ({
          scopes: d.scopes,
          startsAt: d.startsAt,
          expiresAt: d.expiresAt,
          revokedAt: d.revokedAt,
          delegatorMemberId: d.delegatorMemberId,
        })),
        asOf,
      ),
      delegatedScopes: [],
    };
  }

  /**
   * GET /v1/product-feedback
   * Requires product.feedback.review scope to list all feedback.
   */
  @Get()
  async listFeedback(
    @Req() req: Request,
    @Query('limit') limit?: string,
  ): Promise<{ items: FeedbackSummary[] }> {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const snap = await this.getAccessSnapshot(
        session.organizationId,
        session.actorMemberId,
        session.effectiveAt,
      );
      if (!snap) throw new Error('AUTH_REQUIRED');
      assertMemberActive(snap);

      if (!memberHasGrantedScope(snap, PRODUCT_FEEDBACK_REVIEW_SCOPE)) {
        throw new Error('PERMISSION_DENIED');
      }

      const limitNum = limit ? parseInt(limit, 10) : 100;
      const records = await this.feedbackStore.listFeedbackForReviewers(
        session.organizationId,
        limitNum,
      );

      return { items: records.map(toSummary) };
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
