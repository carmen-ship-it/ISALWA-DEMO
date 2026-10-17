import { OsApiError } from '@/lib/api/os-api-errors';
import { formatPartyRoles, formatPartyStatus } from '@/lib/party/labels';
import type {
  MasterDataPartyDetailResponse,
  MasterDataPartySearchResponse,
} from '@/lib/party/types';

type MasterDataClient = {
  searchMasterDataParties: (query: { q?: string; nit?: string }) => Promise<MasterDataPartySearchResponse>;
  getMasterDataParty: (partyId: string) => Promise<MasterDataPartyDetailResponse>;
};

export type MasterDataLookupRow = {
  partyId: string;
  name: string;
  legalName: string | null;
  relation: string;
  status: string;
  rawStatus: string;
  merged: boolean;
};

export type MasterDataLookup = {
  term: string;
  searchedBy: 'name' | 'nit' | null;
  rows: MasterDataLookupRow[];
  selected: (MasterDataLookupRow & { fiscalIdentities: MasterDataPartyDetailResponse['fiscalIdentities'] }) | null;
  selectedMissing: boolean;
};

const NIT_PATTERN = /^\d{5,15}$/;

export const MASTER_DATA_TERM_PARAM = 'custodio';
export const MASTER_DATA_PARTY_PARAM = 'custodioId';

export function masterDataLookupHref(path: string, term: string, partyId?: string): string {
  const params = new URLSearchParams();
  if (term.trim()) params.set(MASTER_DATA_TERM_PARAM, term.trim());
  if (partyId) params.set(MASTER_DATA_PARTY_PARAM, partyId);
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export function masterDataLookupQuery(term: string): { q: string } | { nit: string } | null {
  const trimmed = term.trim();
  if (trimmed.length < 2) return null;
  return NIT_PATTERN.test(trimmed) ? { nit: trimmed } : { q: trimmed };
}

function toRow(item: MasterDataPartySearchResponse['items'][number]): MasterDataLookupRow {
  const roles = formatPartyRoles(item.activeRoleKeys);
  return {
    partyId: item.partyId,
    name: item.displayName || item.legalName || 'Sin nombre',
    legalName: item.legalName && item.legalName !== item.displayName ? item.legalName : null,
    relation: roles.length > 0 ? roles.join(', ') : 'Sin relación',
    status: formatPartyStatus(item.status),
    rawStatus: item.status,
    merged: Boolean(item.mergedIntoPartyId),
  };
}

/**
 * Steward lookup for the customer screens. Returns null unless the viewer is a data
 * steward (`isSteward` from the page, and the API must not answer 403).
 */
export async function loadMasterDataLookup(
  client: MasterDataClient,
  input: { isSteward: boolean; term?: string | null; partyId?: string | null },
): Promise<MasterDataLookup | null> {
  if (!input.isSteward) return null;
  const term = (input.term ?? '').trim();
  const query = masterDataLookupQuery(term);
  try {
    const result = query ? await client.searchMasterDataParties(query) : { items: [] };
    let selected: MasterDataLookup['selected'] = null;
    let selectedMissing = false;
    const partyId = input.partyId?.trim();
    if (partyId) {
      try {
        const detail = await client.getMasterDataParty(partyId);
        selected = { ...toRow(detail), fiscalIdentities: detail.fiscalIdentities };
      } catch (err) {
        if (!(err instanceof OsApiError && err.kind === 'not_found')) throw err;
        selectedMissing = true;
      }
    }
    return {
      term,
      searchedBy: query ? ('nit' in query ? 'nit' : 'name') : null,
      rows: result.items.map(toRow),
      selected,
      selectedMissing,
    };
  } catch (err) {
    if (err instanceof OsApiError && err.kind === 'forbidden') return null;
    throw err;
  }
}
