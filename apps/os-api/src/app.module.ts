import { Module } from '@nestjs/common';
import { CommandsController } from './commands.controller';
import { MembersController } from './members.controller';
import { HealthController } from './health.controller';
import { SessionController } from './session.controller';
import { TrustedMemberContextController } from './trusted-member-context.controller';
import { CompleteInviteController } from './complete-invite.controller';
import { BootstrapController } from './bootstrap.controller';
import { PartiesController } from './parties.controller';
import { LocationsController } from './locations.controller';
import { WorkItemsController } from './work-items.controller';
import { ApprovalsController } from './approvals.controller';
import { AttentionController } from './attention.controller';
import { OpportunitiesController, OrdersController, QuotesController } from './commercial.controller';
import { DeliveryNotesController } from './delivery.controller';
import { CapabilitiesController } from './capabilities.controller';
import { OperationsController } from './operations.controller';
import { CommitmentsController } from './commitments.controller';
import { IssuesController } from './issues.controller';
import { ProductFeedbackController } from './product-feedback.controller';
import { MemoryController } from './memory.controller';
import { AiController } from './ai.controller';
import { AuditController } from './audit.controller';
import { QaController } from './qa.controller';
import { FulfillmentController } from './fulfillment.controller';
import { OsStoreModule } from './os-store.module';
import { isDevBootstrapEnabled } from './env-validation';

const devControllers = isDevBootstrapEnabled() ? [BootstrapController] : [];

@Module({
  imports: [OsStoreModule],
  controllers: [
    HealthController,
    SessionController,
    TrustedMemberContextController,
    CompleteInviteController,
    OperationsController,
    CommandsController,
    MembersController,
    CapabilitiesController,
    PartiesController,
    LocationsController,
    WorkItemsController,
    ApprovalsController,
    AttentionController,
    OpportunitiesController,
    QuotesController,
    DeliveryNotesController,
    OrdersController,
    CommitmentsController,
    IssuesController,
    ProductFeedbackController,
    MemoryController,
    AiController,
    AuditController,
    FulfillmentController,
    QaController,
    ...devControllers,
  ],
})
export class AppModule {}
