import type { OsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';

async function probeWorkVisibilityLens(
  client: OsApiClient,
  visibility: 'team' | 'org',
): Promise<boolean> {
  try {
    await client.listWorkItems({ status: 'open', visibility, limit: 1 });
    return true;
  } catch (err) {
    if (err instanceof OsApiError && err.kind === 'forbidden') return false;
    return false;
  }
}

/** True when the actor may open the Equipo lens on /trabajo (team visibility read). */
export function probeWorkTeamLens(client: OsApiClient): Promise<boolean> {
  return probeWorkVisibilityLens(client, 'team');
}

/** True when the actor may open the Empresa lens on /trabajo (org visibility read). */
export function probeWorkOrgLens(client: OsApiClient): Promise<boolean> {
  return probeWorkVisibilityLens(client, 'org');
}
