import type { CapabilityStateReadModel } from '@isalwa/os-contracts';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext, getServerWebSession } from '@/lib/auth/actions';
import { actorCanMutateMasterData } from '@/lib/party/master-data-access';

const PERMISSION_DENIAL_CODES = new Set([
  'PERMISSION_DENIED',
  'TENANT_FORBIDDEN',
  'GOVERNANCE_REQUIRED',
]);

export type ShellContext = {
  displayLabel: string;
  showAdmin: boolean;
  canCreateCustomer: boolean;
  actorKey: string | null;
  osAccess: 'ok' | 'revoked' | 'unavailable' | 'unauthorized' | 'denied';
  capabilities: CapabilityStateReadModel[];
};

function displayLabelOf(label: string | undefined): string {
  const trimmed = label?.trim();
  return trimmed || 'Usuario';
}

function shell(
  displayLabel: string | undefined,
  osAccess: ShellContext['osAccess'],
): ShellContext {
  return {
    displayLabel: displayLabelOf(displayLabel),
    showAdmin: false,
    canCreateCustomer: false,
    actorKey: null,
    osAccess,
    capabilities: [],
  };
}

function isSessionFailure(err: unknown): boolean {
  if (err instanceof OsApiError) {
    return err.code === 'AUTH_REQUIRED' || err.kind === 'unauthorized';
  }
  return err instanceof Error && err.message === 'AUTH_REQUIRED';
}

function classifyProbeError(err: unknown): ShellContext['osAccess'] {
  if (!(err instanceof OsApiError)) return 'unavailable';
  if (err.code === 'ACCESS_REVOKED') return 'revoked';
  if (err.code === 'AUTH_REQUIRED' || err.kind === 'unauthorized') return 'unauthorized';
  if (err.kind === 'forbidden' || PERMISSION_DENIAL_CODES.has(err.code)) return 'denied';
  if (err.kind === 'unavailable') return 'unavailable';
  return 'unavailable';
}

export async function loadShellContext(): Promise<ShellContext | null> {
  const webSession = await getServerWebSession();
  if (!webSession) return null;

  let auth;
  try {
    auth = await getServerOsAuthContext();
  } catch (err) {
    if (isSessionFailure(err)) return shell(webSession.displayLabel, 'unauthorized');
    return shell(webSession.displayLabel, 'unavailable');
  }

  if (!auth) return shell(webSession.displayLabel, 'unauthorized');

  const client = createOsApiClient(auth);

  let osAccess: ShellContext['osAccess'] = 'ok';
  let showAdmin = false;
  let canCreateCustomer = false;
  let actorKey: string | null = null;
  let capabilities: CapabilityStateReadModel[] = [];

  try {
    await client.listAttention({ limit: '1' });
  } catch (err) {
    osAccess = classifyProbeError(err);
  }

  if (osAccess === 'ok') {
    try {
      showAdmin = await client.probeAdminAccess();
    } catch {
      showAdmin = false;
    }

    try {
      canCreateCustomer = await actorCanMutateMasterData(client);
    } catch {
      canCreateCustomer = false;
    }

    try {
      const session = await client.getAuthenticatedSession();
      if (session.memberId && session.organizationId) {
        actorKey = `${session.organizationId}:${session.memberId}`;
      }
    } catch {
      actorKey = null;
    }

    try {
      const state = await client.getCapabilityState();
      capabilities = state.capabilities;
    } catch {
      capabilities = [];
    }
  }

  return {
    displayLabel: displayLabelOf(webSession.displayLabel),
    showAdmin,
    canCreateCustomer,
    actorKey,
    osAccess,
    capabilities,
  };
}
