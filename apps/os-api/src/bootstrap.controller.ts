import { Controller, Get, Inject, NotFoundException, Post } from '@nestjs/common';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import { OS_STORE } from './os-store.module';
import { getPublicRuntimeSnapshot, isDevBootstrapEnabled } from './env-validation';

/** Dev-only bootstrap — seeds first org + admin when store is empty. */
@Controller('dev')
export class BootstrapController {
  constructor(@Inject(OS_STORE) private readonly store: OsWorkforceStore) {}

  private assertDevBootstrapEnabled(): void {
    if (!isDevBootstrapEnabled()) {
      throw new NotFoundException();
    }
  }

  @Get('status')
  async status() {
    this.assertDevBootstrapEnabled();
    const runtime = getPublicRuntimeSnapshot();
    return {
      mode: runtime.authMode,
      persistence: runtime.databaseConfigured ? 'prisma' : 'memory',
      devBootstrap: runtime.devBootstrapEnabled,
    };
  }

  @Post('bootstrap')
  async bootstrap() {
    this.assertDevBootstrapEnabled();
    const org = await this.store.seedOrganization('ISALWA S.R.L.', `isalwa-${Date.now()}`);
    const seeded = await this.store.seedAdminMember(org.id, 'admin@isalwa.bo', 'Admin', 'User');
    return {
      organizationId: org.id,
      memberId: seeded.member.id,
      personId: seeded.person.id,
      authIdentityId: seeded.auth.id,
    };
  }
}
