import { Controller, Get, HttpException, HttpStatus, Inject, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { computeEffectiveScopes } from '@isalwa/os-domain';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import { resolveSession } from './os-session';
import { OS_STORE } from './os-store.module';
import { getRuntimeProfile } from './env-validation';

const SYNTH_ORG = '01M2JKF77TXMJNDTKNCYNHH9G5';
const REAL_ORG = '01M2DV9F0V5DXS4G89AKF4D5SR';

function qaControlEnabled(): boolean {
  return getRuntimeProfile() === 'staging' && process.env.OS_QA_CONTROL_ENABLED?.trim() === 'true';
}

@Controller('qa')
export class QaController {
  constructor(@Inject(OS_STORE) private readonly workforceStore: OsWorkforceStore) {}

  @Get('effective-access')
  async effectiveAccess(@Req() req: Request, @Query('memberId') memberIdRaw?: string) {
    if (!qaControlEnabled()) {
      throw new HttpException({ code: 'NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }
    try {
      const session = await resolveSession(req, this.workforceStore);
      if (!session.grantedScopes.includes('qa.access')) {
        throw new Error('PERMISSION_DENIED');
      }
      const memberId = memberIdRaw?.trim() ?? '';
      if (!memberId) throw new Error('VALIDATION_FAILED');
      const target = await this.workforceStore.getMemberInOrg(SYNTH_ORG, memberId);
      if (!target || target.organizationId === REAL_ORG) throw new Error('PERMISSION_DENIED');
      const roles = await this.workforceStore.listRoleAssignmentsForMember(target.id, SYNTH_ORG);
      const delegations = await this.workforceStore.listDelegationsForDelegate(target.id, SYNTH_ORG);
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
        organizationId: SYNTH_ORG,
        grantedScopes,
      };
    } catch (err) {
      const code = err instanceof Error ? err.message : 'INTERNAL_ERROR';
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
  }
}
