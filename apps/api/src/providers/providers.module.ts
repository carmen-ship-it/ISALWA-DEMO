import { Global, Module } from '@nestjs/common';
import { createProviderRegistry, type ProviderRegistry } from '@isalwa/providers';
import { PROVIDER_REGISTRY } from './providers.tokens';

@Global()
@Module({
  providers: [
    {
      provide: PROVIDER_REGISTRY,
      useFactory: (): ProviderRegistry => createProviderRegistry(process.env),
    },
  ],
  exports: [PROVIDER_REGISTRY],
})
export class ProvidersModule {}
