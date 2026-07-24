import { Module } from '@nestjs/common';
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
  providers: [HealthService],
})
export class AppModule {}
