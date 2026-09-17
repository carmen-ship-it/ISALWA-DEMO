/**
 * Management / Gerencia demo lens helpers.
 * Keep DEMO and Datos reales commercial counts separate — never mix REAL seven.
 */

import type { DemoDataMode } from '@/lib/demo/owner-demo-identity';

export function keepPartyIdForDemoMode(
  partyId: string,
  mode: DemoDataMode,
  isDemoParty: (partyId: string) => boolean,
): boolean {
  const demo = isDemoParty(partyId);
  return mode === 'demo' ? demo : !demo;
}

export function filterByPartyDemoMode<T extends { partyId: string }>(
  items: readonly T[],
  mode: DemoDataMode,
  isDemoParty: (partyId: string) => boolean,
): T[] {
  return items.filter((item) => keepPartyIdForDemoMode(item.partyId, mode, isDemoParty));
}

/**
 * Demo Gerencia shows funnel + org metrics only.
 * Hide the Equipo asesor table so the lens never looks like a salesperson ladder.
 */
export function shouldShowManagementTeamTable(mode: DemoDataMode): boolean {
  return mode !== 'demo';
}
