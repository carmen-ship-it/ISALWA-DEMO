import { Controller, Get, HttpException, HttpStatus, Inject, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { computeEffectiveScopes } from '@isalwa/os-domain';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import { resolveSession } from './os-session';
import { OS_STORE } from './os-store.module';
import { getRuntimeProfile } from './env-validation';
import {
  QA_REAL_ORGANIZATION_ID,
  QA_SYNTH_ORGANIZATION_ID,
  resolveQaSynthRoster,
} from './qa-synth-roster';

function qaControlEnabled(): boolean {
  return getRuntimeProfile() === 'staging' && process.env.OS_QA_CONTROL_ENABLED?.trim() === 'true';
}

@Controller('qa')
export class QaController {
  constructor(@Inject(OS_STORE) private readonly workforceStore: OsWorkforceStore) {}

  private async requireQaOperator(req: Request) {
    if (!qaControlEnabled()) {
      throw new HttpException({ code: 'NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }
    const session = await resolveSession(req, this.workforceStore);
    if (!session.grantedScopes.includes('qa.access')) {
      throw new Error('PERMISSION_DENIED');
    }
    return session;
  }

  private mapError(err: unknown): never {
    const code = err instanceof Error ? err.message : 'INTERNAL_ERROR';
    if (err instanceof HttpException) throw err;
    const status =
      code === 'AUTH_REQUIRED'
        ? HttpStatus.UNAUTHORIZED
        : code === 'PERMISSION_DENIED' || code === 'TENANT_FORBIDDEN'
          ? HttpStatus.FORBIDDEN
          : code === 'VALIDATION_FAILED'
            ? HttpStatus.BAD_REQUEST
            : HttpStatus.INTERNAL_SERVER_ERROR;
    throw new HttpException({ code }, status);
  }

  @Get('effective-access')
  async effectiveAccess(@Req() req: Request, @Query('memberId') memberIdRaw?: string) {
    try {
      const session = await this.requireQaOperator(req);
      const memberId = memberIdRaw?.trim() ?? '';
      if (!memberId) throw new Error('VALIDATION_FAILED');
      const target = await this.workforceStore.getMemberInOrg(
        QA_SYNTH_ORGANIZATION_ID,
        memberId,
      );
      if (
        !target ||
        target.organizationId === QA_REAL_ORGANIZATION_ID ||
        target.organizationId !== QA_SYNTH_ORGANIZATION_ID
      ) {
        throw new Error('PERMISSION_DENIED');
      }
      const roles = await this.workforceStore.listRoleAssignmentsForMember(
        target.id,
        QA_SYNTH_ORGANIZATION_ID,
      );
      const delegations = await this.workforceStore.listDelegationsForDelegate(
        target.id,
        QA_SYNTH_ORGANIZATION_ID,
      );
      const grantedScopes = computeEffectiveScopes(
        roles.map((r) => ({ roleKey: r.roleKey, effectiveAt: r.effectiveAt, endedAt: r.endedAt })),
        delegations.map((d) => ({
          scopes: d.scopes,
          startsAt: d.startsAt,
          expiresAt: d.expiresAt,
          revokedAt: d.revokedAt,
          delegatorMemberId: d.delegatorMemberId,
        })),
        session.effectiveAt,
      );
      return {
        memberId: target.id,
        organizationId: QA_SYNTH_ORGANIZATION_ID,
        grantedScopes,
      };
    } catch (err) {
      this.mapError(err);
    }
  }

  /**
   * Staging truth for Ver Como: resolve SYNTH fixture members by allowlisted email.
   * Fail-closed: REAL denied; Wave 2 business emails only; no people.admin invention.
   * Does not depend on operator laptop ~/.isalwa-secrets receipts.
   */
  @Get('synth-personas')
  async synthPersonas(@Req() req: Request) {
    try {
      const session = await this.requireQaOperator(req);
      const roster = await resolveQaSynthRoster(this.workforceStore, session.effectiveAt);
      return {
        organizationId: roster.organizationId,
        items: roster.members.map((m) => ({
          email: m.email,
          memberId: m.memberId,
          organizationId: roster.organizationId,
          grantedScopes: m.grantedScopes,
        })),
        gaps: {
          peopleAdminPersona:
            'No People Admin SYNTH persona in Wave 2 Ver Como catalog (people.admin excluded from V1 planned map).',
        },
      };
    } catch (err) {
      this.mapError(err);
    }
  }
}
