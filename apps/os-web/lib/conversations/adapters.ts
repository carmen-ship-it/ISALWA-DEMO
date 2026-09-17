/**
 * Future messaging provider adapters.
 * Interfaces only — no Meta, Twilio, or vendor SDK imports.
 * A connected adapter still cannot confirm payment, stock, or delivery.
 */

import type {
  Conversation,
  ConversationChannel,
  ConversationMessage,
} from './model';

export type ConversationProviderId =
  | 'manual'
  | 'demo'
  | 'future_whatsapp'
  | 'future_email'
  | 'future_phone';

export type ConversationProviderCapability = {
  providerId: ConversationProviderId;
  /** Always false until a real integration is proven hosted. */
  live: false;
  canReceive: false;
  canSend: false;
  channels: readonly ConversationChannel[];
};

export type ConversationProviderAdapter = {
  readonly capability: ConversationProviderCapability;
  list(organizationId: string): Promise<readonly Conversation[]>;
  read(organizationId: string, conversationId: string): Promise<Conversation | null>;
  /** Never sends. Reserved for a future governed send path. */
  send(input: {
    organizationId: string;
    conversationId: string;
    body: string;
  }): Promise<{ sent: false; reason: 'provider_not_connected' }>;
};

export const MANUAL_PROVIDER_CAPABILITY: ConversationProviderCapability = {
  providerId: 'manual',
  live: false,
  canReceive: false,
  canSend: false,
  channels: ['WHATSAPP', 'PHONE', 'IN_PERSON', 'EMAIL', 'OTHER'],
};

export const DEMO_PROVIDER_CAPABILITY: ConversationProviderCapability = {
  providerId: 'demo',
  live: false,
  canReceive: false,
  canSend: false,
  channels: ['WHATSAPP'],
};

export function createManualConversationAdapter(
  source: () => readonly Conversation[],
): ConversationProviderAdapter {
  return {
    capability: MANUAL_PROVIDER_CAPABILITY,
    async list(organizationId) {
      return source().filter((item) => item.organizationId === organizationId);
    },
    async read(organizationId, conversationId) {
      return (
        source().find(
          (item) => item.organizationId === organizationId && item.id === conversationId,
        ) ?? null
      );
    },
    async send() {
      return { sent: false, reason: 'provider_not_connected' };
    },
  };
}

/** CT3-E injects SYNTH demo threads here. Empty by default. */
export type ConversationFixtureRegistry = {
  list(organizationId: string): readonly Conversation[];
};

let fixtureRegistry: ConversationFixtureRegistry | null = null;

export function registerConversationFixtures(registry: ConversationFixtureRegistry | null): void {
  fixtureRegistry = registry;
}

export function listRegisteredConversationFixtures(
  organizationId: string,
): readonly Conversation[] {
  if (!fixtureRegistry) return [];
  return fixtureRegistry.list(organizationId).filter((item) => item.isDemo);
}

export function mergeConversationSources(input: {
  organizationId: string;
  recorded: readonly Conversation[];
  fixtures?: readonly Conversation[];
}): Conversation[] {
  const byId = new Map<string, Conversation>();
  for (const item of input.fixtures ?? listRegisteredConversationFixtures(input.organizationId)) {
    if (item.organizationId !== input.organizationId) continue;
    byId.set(item.id, item);
  }
  for (const item of input.recorded) {
    if (item.organizationId !== input.organizationId) continue;
    byId.set(item.id, item);
  }
  return [...byId.values()].sort((a, b) => b.lastOccurredAt.localeCompare(a.lastOccurredAt));
}

export function assertMessageNeverClaimsLive(message: ConversationMessage): {
  liveWhatsApp: false;
  providerCalled: false;
  readReceipt: false;
} {
  void message;
  return { liveWhatsApp: false, providerCalled: false, readReceipt: false };
}
