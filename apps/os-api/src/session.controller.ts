import { Controller, Get, HttpException, Inject, Req } from '@nestjs/common';
import type { Request } from 'express';
import { listEligibleOrganizations } from '@isalwa/os-domain';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import {
  authenticatedSessionHttpError,
  resolveAuthenticatedProviderSubject,
  resolveSession,
  toAuthenticatedSessionView,
} from './os-session';
import { OS_STORE } from './os-store.module';

/**
 * Authenticated session read. Member id comes only from resolveSession
 * (Supabase identity → AuthIdentity → active OrganizationMember).
 * Query, body, and client member/org fields are ignored.
 */
@Controller('session')
export class SessionController {
  constructor(@Inject(OS_STORE) private readonly workforceStore: OsWorkforceStore) {}

  @Get('me')
  async current(@Req() req: Request) {
    try {
      const session = await resolveSession(req, this.workforceStore);
      return toAuthenticatedSessionView(session);
    } catch (err) {
      const mapped = authenticatedSessionHttpError(err);
      throw new HttpException(mapped.body, mapped.status);
    }
  }

  /**
   * Organizations the authenticated person may select. The organization
   * selector header is ignored here; it never widens this list.
   */
  @Get('organizations')
  async organizations(@Req() req: Request) {
    try {
      const subject = await resolveAuthenticatedProviderSubject(req, this.workforceStore);
      const result = await listEligibleOrganizations(this.workforceStore, subject);
      if (!result.ok) {
        const status = result.denial === 'AUTH_REQUIRED' ? 401 : 403;
        const code = result.denial === 'MEMBER_INACTIVE' ? 'ACCESS_REVOKED' : result.denial;
        throw new HttpException({ code }, status);
      }
      const rows = await this.workforceStore.listOrganizationsByIds(result.organizationIds);
      const names = new Map(rows.map((row) => [row.id, row.legalName]));
      return {
        organizations: result.organizationIds
          .filter((id) => names.has(id))
          .map((id) => ({ organizationId: id, legalName: names.get(id)! })),
      };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      const mapped = authenticatedSessionHttpError(err);
      throw new HttpException(mapped.body, mapped.status);
    }
  }
}
