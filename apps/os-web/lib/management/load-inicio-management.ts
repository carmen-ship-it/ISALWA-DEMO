import type { OsApiClient } from '@/lib/api/os-api-client';
import { loadActorRoleKeys } from '@/lib/party/master-data-access';
import {
  composeManagementLens,
  recordedExceptionQueryOnBranch,
  type ManagementLensModel,
} from '@/lib/management/exceptions';

/**
 * Role gate + session organization for tenant card matching.
 * Named exception query bodies are still not on this branch
 * (`recordedExceptionQueryOnBranch` → null), so the lens stays empty
 * rather than inventing a figure from commercial lists or finance reads.
 */
export async function loadInicioManagement(
  client: Pick<OsApiClient, 'getAuthenticatedSession' | 'getMember'>,
): Promise<ManagementLensModel> {
  const [roleKeys, session] = await Promise.all([
    loadActorRoleKeys(client as OsApiClient),
    client.getAuthenticatedSession(),
  ]);
  const viewerOrganizationId =
    typeof session?.organizationId === 'string' ? session.organizationId.trim() || null : null;
  return composeManagementLens({
    roleKeys,
    viewerOrganizationId,
    query: recordedExceptionQueryOnBranch(),
  });
}
