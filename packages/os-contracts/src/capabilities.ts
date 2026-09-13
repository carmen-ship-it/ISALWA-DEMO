/** Canonical OS capability keys — server-side registry (Lane F). */
export const OS_CAPABILITY_KEYS = [
  'workforce',
  'partygraph',
  'work',
  'commercial',
  'finance',
  'messaging',
  'warehouse',
  'territory',
  'production',
  'integrations',
] as const;

export type OsCapabilityKey = (typeof OS_CAPABILITY_KEYS)[number];

/** Lifecycle states — ADR-0006 + honest UI gaps. */
export const CAPABILITY_LIFECYCLE_STATES = [
  'ACTIVE',
  'LOCKED',
  'NOT_CONFIGURED',
  'FUTURE',
  'DEGRADED',
  'DEPRECATED',
  'APPROVED',
  'CONNECTING',
] as const;

export type CapabilityLifecycleState = (typeof CAPABILITY_LIFECYCLE_STATES)[number];

export type CapabilityRegistryEntry = {
  capabilityKey: OsCapabilityKey;
  /** Default when no org override exists in os_capability_states. */
  defaultState: CapabilityLifecycleState;
  /** True when runnable backend exists per architecture evidence. */
  implemented: boolean;
};

/** Server-owned defaults — update when lanes PASS evidence gates. */
export const OS_CAPABILITY_REGISTRY: readonly CapabilityRegistryEntry[] = [
  { capabilityKey: 'workforce', defaultState: 'ACTIVE', implemented: true },
  { capabilityKey: 'partygraph', defaultState: 'ACTIVE', implemented: true },
  { capabilityKey: 'work', defaultState: 'ACTIVE', implemented: true },
  { capabilityKey: 'commercial', defaultState: 'ACTIVE', implemented: true },
  { capabilityKey: 'finance', defaultState: 'LOCKED', implemented: false },
  { capabilityKey: 'messaging', defaultState: 'NOT_CONFIGURED', implemented: false },
  { capabilityKey: 'warehouse', defaultState: 'FUTURE', implemented: false },
  { capabilityKey: 'territory', defaultState: 'FUTURE', implemented: false },
  { capabilityKey: 'production', defaultState: 'FUTURE', implemented: false },
  { capabilityKey: 'integrations', defaultState: 'NOT_CONFIGURED', implemented: false },
] as const;

export function isOsCapabilityKey(value: string): value is OsCapabilityKey {
  return (OS_CAPABILITY_KEYS as readonly string[]).includes(value);
}
