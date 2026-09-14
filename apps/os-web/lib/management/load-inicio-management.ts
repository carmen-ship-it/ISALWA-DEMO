import type { OsApiClient } from '@/lib/api/os-api-client';
import { loadActorRoleKeys } from '@/lib/party/master-data-access';
import {
  composeManagementLens,
  recordedExceptionQueryOnBranch,
  type ManagementLensModel,
} from '@/lib/management/exceptions';

/**
 * Role gate only. Named exception queries are not on this branch,
 * so the lens stays empty rather than inventing a figure.
 */
export async function loadInicioManagement(
  client: Pick<OsApiClient, 'getAuthenticatedSession' | 'getMember'>,
): Promise<ManagementLensModel> {
  const roleKeys = await loadActorRoleKeys(client as OsApiClient);
  return composeManagementLens({
    roleKeys,
    viewerOrganizationId: null,
    query: recordedExceptionQueryOnBranch(),
  });
}
