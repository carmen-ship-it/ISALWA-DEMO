import { MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import {
  CANONICAL_SESSION_STORE,
  CanonicalSessionMiddleware,
  applyCanonicalSessionMiddleware,
} from './auth/canonical-session.middleware';
import { HealthController } from './health/health.controller';
import { HealthService } from './health/health.service';
import { ProvidersModule } from './providers/providers.module';
import { PulseModule } from './pulse/pulse.module';
import { AccountsModule } from './accounts/accounts.module';
import { RadarModule } from './radar/radar.module';
import { TerritorioModule } from './territorio/territorio.module';
import { MessagingModule } from './messaging/messaging.module';
import { SearchModule } from './search/search.module';
import { CommerceModule } from './commerce/commerce.module';
import { VisitsModule } from './visits/visits.module';

@Module({
  imports: [
    ProvidersModule,
    PulseModule,
    AccountsModule,
    RadarModule,
    TerritorioModule,
    MessagingModule,
    SearchModule,
    CommerceModule,
    VisitsModule,
  ],
  controllers: [HealthController],
  providers: [
    HealthService,
    {
      provide: CANONICAL_SESSION_STORE,
      useFactory: async () => {
        const { createCanonicalSessionStore } = await import('./auth/canonical-session.store');
        return createCanonicalSessionStore();
      },
    },
    CanonicalSessionMiddleware,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    applyCanonicalSessionMiddleware(consumer as never);
  }
}
