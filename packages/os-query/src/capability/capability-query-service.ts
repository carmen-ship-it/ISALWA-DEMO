import {
  CAPABILITY_LIFECYCLE_STATES,
  OS_CAPABILITY_REGISTRY,
  type CapabilityStateReadModel,
} from '@isalwa/os-contracts';
import type { QueryContext } from '../query-context';
import { assertQueryScope, assertQueryTenantResource } from '../query-context';
import type { MemberQueryStorePort } from '../member/member-query-store-port';

export type CapabilityQueryServiceDeps = {
  store: MemberQueryStorePort;
};

function isKnownState(state: string): boolean {
  return (CAPABILITY_LIFECYCLE_STATES as readonly string[]).includes(state);
}

export class CapabilityQueryService {
  constructor(private readonly deps: CapabilityQueryServiceDeps) {}

  async getCapabilityState(ctx: QueryContext): Promise<{ capabilities: CapabilityStateReadModel[] }> {
    assertQueryScope(ctx, 'member_active');
    assertQueryTenantResource(ctx, ctx.organizationId);

    const overrides = await this.deps.store.listCapabilityStateOverrides(ctx.organizationId);
    const overrideMap = new Map(overrides.map((row) => [row.capabilityKey, row]));

    const capabilities: CapabilityStateReadModel[] = OS_CAPABILITY_REGISTRY.map((entry) => {
      const override = overrideMap.get(entry.capabilityKey);
      if (override && isKnownState(override.state)) {
        return {
          capabilityKey: entry.capabilityKey,
          organizationId: ctx.organizationId,
          state: override.state,
          implemented: entry.implemented,
          source: 'org_override' as const,
          updatedAt: override.updatedAt.toISOString(),
        };
      }
      return {
        capabilityKey: entry.capabilityKey,
        organizationId: ctx.organizationId,
        state: entry.defaultState,
        implemented: entry.implemented,
        source: 'registry' as const,
        updatedAt: null,
      };
    });

    return { capabilities };
  }
}
