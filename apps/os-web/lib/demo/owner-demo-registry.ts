/**
 * Seeded DEMO record id map — filled by owner-demo seed into seeded-ids.json.
 */

import seededIds from '@/lib/demo/seeded-ids.json';

export type DemoSeedClientIds = {
  key: string;
  partyId: string;
  opportunityId: string | null;
  quoteId: string | null;
  quoteNumber: string | null;
  orderId: string | null;
  deliveryNoteId: string | null;
  finishedGoodsReceiptId: string | null;
  followUpWorkId: string | null;
  orderPrepWorkId: string | null;
  commitmentId: string | null;
};

export type DemoSeedIdMap = {
  organizationId: string;
  REAL_SEVEN_MUTATED: 'NO' | string;
  seededAt?: string | null;
  storyModePrimaryPartyId: string | null;
  clients: DemoSeedClientIds[];
  hrefHints?: Record<string, string | null> | null;
};

export const EMPTY_DEMO_SEED_IDS: DemoSeedIdMap = {
  organizationId: '01M2JKF77TXMJNDTKNCYNHH9G5',
  REAL_SEVEN_MUTATED: 'NO',
  storyModePrimaryPartyId: null,
  clients: [],
};

let override: DemoSeedIdMap | null = null;

export function loadDemoSeedIdMap(): DemoSeedIdMap {
  if (override) return override;
  const mod = seededIds as DemoSeedIdMap;
  if (mod?.organizationId && Array.isArray(mod.clients)) return mod;
  return EMPTY_DEMO_SEED_IDS;
}

export function setDemoSeedIdMapForTests(map: DemoSeedIdMap | null): void {
  override = map;
}

export function demoSeedHasRecords(map: DemoSeedIdMap = loadDemoSeedIdMap()): boolean {
  return map.clients.some((c) => Boolean(c.partyId));
}
