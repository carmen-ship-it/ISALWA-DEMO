import type {
  AttentionItemReadModel,
  QuoteSummaryReadModel,
  WorkSummaryReadModel,
} from '@isalwa/os-contracts';
import type { OsApiClient } from '@/lib/api/os-api-client';
import type { OperatingHomesModel } from '@/lib/roles/homes';

/**
 * Agent 0 wire: loadMemberCapabilities.
 * That file is not on this branch. Do not invent it.
 * Until it returns explicit capabilities for this session, operating homes fail closed.
 * Member role keys, cargo, and title are not capabilities. Scopes are never written to client state.
 */
export const AGENT_0_CAPABILITY_WIRE = 'loadMemberCapabilities' as const;

type Lists = {
  ownQuotes?: readonly QuoteSummaryReadModel[];
  teamQuotes?: readonly QuoteSummaryReadModel[];
  ownWork?: readonly WorkSummaryReadModel[];
  teamWork?: readonly WorkSummaryReadModel[];
  attention?: readonly AttentionItemReadModel[];
};

export async function loadOperatingHomes(
  _client: Pick<OsApiClient, 'getAuthenticatedSession' | 'getMember'>,
  _lists: Lists = {},
): Promise<OperatingHomesModel> {
  void AGENT_0_CAPABILITY_WIRE;
  void _client;
  void _lists;
  return {
    status: 'denied',
    denial: 'capabilities-unavailable',
    businessHomes: [],
    systemControls: null,
  };
}
