import type { OsApiClient } from '@/lib/api/os-api-client';

export type PartyLabelMap = Map<string, string>;

export async function resolvePartyLabels(
  client: OsApiClient,
  partyIds: Iterable<string>,
): Promise<PartyLabelMap> {
  const unique = [...new Set([...partyIds].filter(Boolean))];
  const entries = await Promise.all(
    unique.map(async (partyId) => {
      try {
        const response = await client.getParty(partyId);
        const name =
          response.party.displayName?.trim() ||
          response.party.legalName?.trim() ||
          'Cliente';
        return [partyId, name] as const;
      } catch {
        return [partyId, 'Cliente'] as const;
      }
    }),
  );
  return new Map(entries);
}

export function partyLabel(map: PartyLabelMap, partyId: string): string {
  return map.get(partyId) ?? 'Cliente';
}
