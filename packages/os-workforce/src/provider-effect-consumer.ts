import type { BusinessEventEnvelope } from '@isalwa/os-contracts';
import type { OsOutboxConsumerPort } from '@isalwa/os-events';
import type { WorkforceCommandService } from './workforce-command-service';

/** Outbox consumer that retries auth provider effects for member access events until they apply. */
export class AuthProviderEffectConsumer implements OsOutboxConsumerPort {
  readonly consumerKey = 'workforce.auth_provider_effects';

  constructor(private readonly workforce: Pick<WorkforceCommandService, 'reconcileProviderEffect'>) {}

  async deliver(envelope: BusinessEventEnvelope): Promise<void> {
    await this.workforce.reconcileProviderEffect({
      organizationId: envelope.organizationId,
      eventType: envelope.eventType,
      primaryEntityType: envelope.primaryEntityType,
      primaryEntityId: envelope.primaryEntityId,
    });
  }
}
