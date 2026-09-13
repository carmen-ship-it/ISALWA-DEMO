import { Global, Inject, Module, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import {
  getOsPrisma,
  PrismaOsOutboxStore,
  PrismaOsPartyStore,
  PrismaOsProjectionStore,
  PrismaOsWorkforceStore,
  PrismaOsWorkStore,
  PrismaOsCommercialStore,
  PrismaMemberQueryStore,
  encodePartySearchCursor,
} from '@isalwa/os-database';
import {
  LocalAuthProviderPort,
  MemoryOsStore,
  SupabaseAuthProviderPort,
  WorkforceCommandService,
  type AuthProviderPort,
  type OsWorkforceStore,
} from '@isalwa/os-workforce';
import { PartyCommandService, type OsPartyStore } from '@isalwa/os-party';
import { WorkCommandService, type OsWorkStore } from '@isalwa/os-work';
import { CommercialCommandService, type OsCommercialStore } from '@isalwa/os-commercial';
import type { OsOutboxStorePort } from '@isalwa/os-events';
import { OutboxWorkerHost, OutboxRecoveryService } from '@isalwa/os-events';
import {
  PartyProjectionConsumer,
  PartyQueryService,
  ProjectionRunner,
  WorkProjectionConsumer,
  WorkQueryService,
  ApprovalQueryService,
  AttentionQueryService,
  CommercialProjectionConsumer,
  CommercialQueryService,
  PartyTimelineProjectionConsumer,
  PartyTimelineQueryService,
  encodeOpportunityCursor,
  encodeQuoteCursor,
  encodeOrderCursor,
  encodePartyTimelineCursor,
  MemberQueryService,
  CapabilityQueryService,
  encodeMemberDirectoryCursor,
  encodeWorkSearchCursor,
  encodeApprovalCursor,
  encodeAttentionCursor,
  type OsProjectionStorePort,
  type MemberQueryStorePort,
} from '@isalwa/os-query';

export const OS_STORE = Symbol('OS_STORE');
export const OS_PARTY_STORE = Symbol('OS_PARTY_STORE');
export const OS_WORK_STORE = Symbol('OS_WORK_STORE');
export const OS_PROJECTION_STORE = Symbol('OS_PROJECTION_STORE');
export const OS_OUTBOX_STORE = Symbol('OS_OUTBOX_STORE');
export const OS_COMMAND_SERVICE = Symbol('OS_COMMAND_SERVICE');
export const OS_PARTY_COMMAND_SERVICE = Symbol('OS_PARTY_COMMAND_SERVICE');
export const OS_WORK_COMMAND_SERVICE = Symbol('OS_WORK_COMMAND_SERVICE');
export const OS_COMMERCIAL_STORE = Symbol('OS_COMMERCIAL_STORE');
export const OS_COMMERCIAL_COMMAND_SERVICE = Symbol('OS_COMMERCIAL_COMMAND_SERVICE');
export const OS_PARTY_QUERY_SERVICE = Symbol('OS_PARTY_QUERY_SERVICE');
export const OS_WORK_QUERY_SERVICE = Symbol('OS_WORK_QUERY_SERVICE');
export const OS_APPROVAL_QUERY_SERVICE = Symbol('OS_APPROVAL_QUERY_SERVICE');
export const OS_ATTENTION_QUERY_SERVICE = Symbol('OS_ATTENTION_QUERY_SERVICE');
export const OS_COMMERCIAL_QUERY_SERVICE = Symbol('OS_COMMERCIAL_QUERY_SERVICE');
export const OS_PARTY_TIMELINE_QUERY_SERVICE = Symbol('OS_PARTY_TIMELINE_QUERY_SERVICE');
export const OS_MEMBER_QUERY_STORE = Symbol('OS_MEMBER_QUERY_STORE');
export const OS_MEMBER_QUERY_SERVICE = Symbol('OS_MEMBER_QUERY_SERVICE');
export const OS_CAPABILITY_QUERY_SERVICE = Symbol('OS_CAPABILITY_QUERY_SERVICE');
export const OS_PROJECTION_RUNNER = Symbol('OS_PROJECTION_RUNNER');
export const OS_OUTBOX_WORKER_HOST = Symbol('OS_OUTBOX_WORKER_HOST');
export const OS_OUTBOX_RECOVERY_SERVICE = Symbol('OS_OUTBOX_RECOVERY_SERVICE');

function outboxWorkerEnabled(): boolean {
  const disabled =
    process.env.OS_OUTBOX_WORKER === '0' ||
    process.env.OS_PROJECTION_WORKER === '0';
  return !disabled;
}

function createAuthProvider(): AuthProviderPort {
  const mode = process.env.OS_AUTH_MODE?.trim() ?? 'dev';
  if (mode === 'supabase') {
    return new SupabaseAuthProviderPort();
  }
  return new LocalAuthProviderPort();
}

function createWorkforceStore(): OsWorkforceStore {
  const prisma = getOsPrisma();
  if (prisma) {
    return new PrismaOsWorkforceStore(prisma);
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('OS_DATABASE_URL required in production');
  }
  return new MemoryOsStore();
}

function createPartyStore(): OsPartyStore {
  const prisma = getOsPrisma();
  if (prisma) {
    return new PrismaOsPartyStore(prisma);
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('OS_DATABASE_URL required in production');
  }
  throw new Error('PartyGraph requires Postgres store');
}

function createWorkStore(): OsWorkStore {
  const prisma = getOsPrisma();
  if (prisma) {
    return new PrismaOsWorkStore(prisma);
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('OS_DATABASE_URL required in production');
  }
  throw new Error('Work lane requires Postgres store');
}

function createProjectionStore(): OsProjectionStorePort {
  const prisma = getOsPrisma();
  if (prisma) {
    return new PrismaOsProjectionStore(prisma);
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('OS_DATABASE_URL required in production');
  }
  throw new Error('Query projections require Postgres store');
}

function createOutboxStore() {
  const prisma = getOsPrisma();
  if (!prisma) {
    throw new Error('Outbox store requires Postgres');
  }
  return new PrismaOsOutboxStore(prisma);
}

function createCommercialStore(): OsCommercialStore {
  const prisma = getOsPrisma();
  if (prisma) {
    return new PrismaOsCommercialStore(prisma);
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('OS_DATABASE_URL required in production');
  }
  throw new Error('Commercial lane requires Postgres store');
}

function createMemberQueryStore(): MemberQueryStorePort {
  const prisma = getOsPrisma();
  if (prisma) {
    return new PrismaMemberQueryStore(prisma);
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('OS_DATABASE_URL required in production');
  }
  throw new Error('Member queries require Postgres store');
}

@Global()
@Module({
  providers: [
    { provide: OS_STORE, useFactory: createWorkforceStore },
    { provide: OS_PARTY_STORE, useFactory: createPartyStore },
    { provide: OS_WORK_STORE, useFactory: createWorkStore },
    { provide: OS_COMMERCIAL_STORE, useFactory: createCommercialStore },
    { provide: OS_PROJECTION_STORE, useFactory: createProjectionStore },
    { provide: OS_OUTBOX_STORE, useFactory: createOutboxStore },
    {
      provide: OS_COMMAND_SERVICE,
      useFactory: (store: OsWorkforceStore) =>
        new WorkforceCommandService(store, createAuthProvider()),
      inject: [OS_STORE],
    },
    {
      provide: OS_PARTY_COMMAND_SERVICE,
      useFactory: (store: OsPartyStore) => new PartyCommandService(store),
      inject: [OS_PARTY_STORE],
    },
    {
      provide: OS_WORK_COMMAND_SERVICE,
      useFactory: (store: OsWorkStore) => new WorkCommandService(store),
      inject: [OS_WORK_STORE],
    },
    {
      provide: OS_COMMERCIAL_COMMAND_SERVICE,
      useFactory: (store: OsCommercialStore) => new CommercialCommandService(store),
      inject: [OS_COMMERCIAL_STORE],
    },
    {
      provide: OS_PARTY_QUERY_SERVICE,
      useFactory: (projectionStore: OsProjectionStorePort) =>
        new PartyQueryService({
          projectionStore,
          encodeCursor: encodePartySearchCursor,
        }),
      inject: [OS_PROJECTION_STORE],
    },
    {
      provide: OS_WORK_QUERY_SERVICE,
      useFactory: (projectionStore: OsProjectionStorePort) =>
        new WorkQueryService({
          projectionStore,
          encodeCursor: encodeWorkSearchCursor,
        }),
      inject: [OS_PROJECTION_STORE],
    },
    {
      provide: OS_APPROVAL_QUERY_SERVICE,
      useFactory: (projectionStore: OsProjectionStorePort) =>
        new ApprovalQueryService({
          projectionStore,
          encodeCursor: encodeApprovalCursor,
        }),
      inject: [OS_PROJECTION_STORE],
    },
    {
      provide: OS_ATTENTION_QUERY_SERVICE,
      useFactory: (projectionStore: OsProjectionStorePort) =>
        new AttentionQueryService({
          projectionStore,
          encodeCursor: encodeAttentionCursor,
        }),
      inject: [OS_PROJECTION_STORE],
    },
    {
      provide: OS_COMMERCIAL_QUERY_SERVICE,
      useFactory: (projectionStore: OsProjectionStorePort) =>
        new CommercialQueryService({
          projectionStore,
          encodeOpportunityCursor,
          encodeQuoteCursor,
          encodeOrderCursor,
        }),
      inject: [OS_PROJECTION_STORE],
    },
    {
      provide: OS_PARTY_TIMELINE_QUERY_SERVICE,
      useFactory: (projectionStore: OsProjectionStorePort, partyStore: OsPartyStore) =>
        new PartyTimelineQueryService({
          projectionStore,
          encodeCursor: encodePartyTimelineCursor,
          partyExists: async (organizationId, partyId) => {
            const party = await partyStore.getPartyInOrg(organizationId, partyId);
            return party != null;
          },
        }),
      inject: [OS_PROJECTION_STORE, OS_PARTY_STORE],
    },
    { provide: OS_MEMBER_QUERY_STORE, useFactory: createMemberQueryStore },
    {
      provide: OS_MEMBER_QUERY_SERVICE,
      useFactory: (store: MemberQueryStorePort) =>
        new MemberQueryService({
          store,
          encodeCursor: encodeMemberDirectoryCursor,
        }),
      inject: [OS_MEMBER_QUERY_STORE],
    },
    {
      provide: OS_CAPABILITY_QUERY_SERVICE,
      useFactory: (store: MemberQueryStorePort) => new CapabilityQueryService({ store }),
      inject: [OS_MEMBER_QUERY_STORE],
    },
    {
      provide: OS_PROJECTION_RUNNER,
      useFactory: (
        outboxStore: OsOutboxStorePort,
        partyStore: OsPartyStore,
        workStore: OsWorkStore,
        commercialStore: OsCommercialStore,
        projectionStore: OsProjectionStorePort,
      ) => {
        const partyConsumer = new PartyProjectionConsumer({ projectionStore, partyStore });
        const workConsumer = new WorkProjectionConsumer({ projectionStore, workStore });
        const commercialConsumer = new CommercialProjectionConsumer({
          projectionStore,
          commercialStore,
        });
        const partyTimelineConsumer = new PartyTimelineProjectionConsumer({
          projectionStore,
          commercialStore,
          workStore,
        });
        return new ProjectionRunner({
          outboxStore,
          consumers: [partyConsumer, workConsumer, commercialConsumer, partyTimelineConsumer],
        });
      },
      inject: [
        OS_OUTBOX_STORE,
        OS_PARTY_STORE,
        OS_WORK_STORE,
        OS_COMMERCIAL_STORE,
        OS_PROJECTION_STORE,
      ],
    },
    {
      provide: OS_OUTBOX_WORKER_HOST,
      useFactory: (outboxStore: OsOutboxStorePort, projectionRunner: ProjectionRunner) => {
        const pollIntervalMs = Number(
          process.env.OS_OUTBOX_POLL_MS ?? process.env.OS_PROJECTION_POLL_MS ?? 5000,
        );
        return new OutboxWorkerHost(outboxStore, projectionRunner, {
          pollIntervalMs,
          batchSize: Number(process.env.OS_OUTBOX_BATCH_SIZE ?? 25),
        });
      },
      inject: [OS_OUTBOX_STORE, OS_PROJECTION_RUNNER],
    },
    {
      provide: OS_OUTBOX_RECOVERY_SERVICE,
      useFactory: (outboxStore: OsOutboxStorePort, workforceStore: OsWorkforceStore) =>
        new OutboxRecoveryService(outboxStore, workforceStore),
      inject: [OS_OUTBOX_STORE, OS_STORE],
    },
  ],
  exports: [
    OS_STORE,
    OS_PARTY_STORE,
    OS_WORK_STORE,
    OS_PROJECTION_STORE,
    OS_OUTBOX_STORE,
    OS_COMMAND_SERVICE,
    OS_PARTY_COMMAND_SERVICE,
    OS_WORK_COMMAND_SERVICE,
    OS_COMMERCIAL_STORE,
    OS_COMMERCIAL_COMMAND_SERVICE,
    OS_PARTY_QUERY_SERVICE,
    OS_WORK_QUERY_SERVICE,
    OS_APPROVAL_QUERY_SERVICE,
    OS_ATTENTION_QUERY_SERVICE,
    OS_COMMERCIAL_QUERY_SERVICE,
    OS_PARTY_TIMELINE_QUERY_SERVICE,
    OS_MEMBER_QUERY_SERVICE,
    OS_CAPABILITY_QUERY_SERVICE,
    OS_PROJECTION_RUNNER,
    OS_OUTBOX_WORKER_HOST,
    OS_OUTBOX_RECOVERY_SERVICE,
  ],
})
export class OsStoreModule implements OnModuleInit, OnModuleDestroy {
  constructor(
    @Inject(OS_OUTBOX_WORKER_HOST) private readonly outboxHost: OutboxWorkerHost,
  ) {}

  onModuleInit(): void {
    if (outboxWorkerEnabled() && getOsPrisma()) {
      this.outboxHost.start();
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.outboxHost.stop();
  }
}
