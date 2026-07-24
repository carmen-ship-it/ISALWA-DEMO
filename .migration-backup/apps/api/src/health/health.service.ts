import { Inject, Injectable } from '@nestjs/common';
import type { HealthResponse } from '@isalwa/contracts';
import { checkDatabase } from '@isalwa/database';
import { providerStatus, type ProviderRegistry } from '@isalwa/providers';
import { PROVIDER_REGISTRY } from '../providers/providers.tokens';

@Injectable()
export class HealthService {
  constructor(@Inject(PROVIDER_REGISTRY) private readonly providers: ProviderRegistry) {}

  async getHealth(): Promise<HealthResponse> {
    const database = await checkDatabase();
    return {
      status: 'ok',
      service: 'isalwa-api',
      version: process.env.APP_VERSION ?? '0.1.0-m1',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV ?? 'development',
      checks: {
        api: 'up',
        database,
        providers: providerStatus(this.providers),
      },
    };
  }
}
