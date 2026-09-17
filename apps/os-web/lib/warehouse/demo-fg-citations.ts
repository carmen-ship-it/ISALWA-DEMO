/**
 * Demo-only Pedido → finished-goods receipt citations from the seeded id map.
 * Does not invent stock quantities or availability — only whether a SYNTH
 * receipt id was published for that order.
 */

import { loadDemoSeedIdMap } from '@/lib/demo/owner-demo-registry';
import type { DemoDataMode } from '@/lib/demo/owner-demo-identity';

export function demoFinishedGoodsOrderIds(dataMode: DemoDataMode): ReadonlySet<string> {
  if (dataMode !== 'demo') return new Set();
  const ids = new Set<string>();
  for (const client of loadDemoSeedIdMap().clients) {
    const orderId = client.orderId?.trim();
    const receiptId = client.finishedGoodsReceiptId?.trim();
    if (orderId && receiptId) ids.add(orderId);
  }
  return ids;
}
