import { cache } from 'react';
import type { CapabilityStateReadModel } from '@isalwa/os-contracts';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext, getServerWebSession } from '@/lib/auth/actions';
import { actorCanMutateMasterData, loadActorRoleKeys } from '@/lib/party/master-data-access';
import { usableGivenName } from '@/lib/shell/greeting';

const PERMISSION_DENIAL_CODES = new Set([
  'PERMISSION_DENIED',
  'TENANT_FORBIDDEN',
  'GOVERNANCE_REQUIRED',
]);

export type ShellContext = {
  displayLabel: string;
  /** Human given name when the session member has one. Never an email. */
  givenName: string | null;
  showAdmin: boolean;
  canCreateCustomer: boolean;
  actorKey: string | null;
  /** Trusted scopes for display labeling only — never used to hide shell nav. */
  grantedScopes: string[];
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
    givenName: null,
    showAdmin: false,
    canCreateCustomer: false,
    actorKey: null,
    grantedScopes: [],
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

export const loadShellContext = cache(async function loadShellContext(): Promise<ShellContext | null> {
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
  let givenName: string | null = null;
  let grantedScopes: string[] = [];
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
      grantedScopes = await loadActorRoleKeys(client);
    } catch {
      grantedScopes = [];
    }

    try {
      const session = await client.getAuthenticatedSession();
      if (session.memberId && session.organizationId) {
        actorKey = `${session.organizationId}:${session.memberId}`;
        givenName = await readMemberGivenName(client, session.memberId);
      }
    } catch {
      actorKey = null;
      givenName = null;
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
    givenName,
    showAdmin,
    canCreateCustomer,
    actorKey,
    grantedScopes,
    osAccess,
    capabilities,
  };
});

async function readMemberGivenName(
  client: ReturnType<typeof createOsApiClient>,
  memberId: string,
): Promise<string | null> {
  try {
    const member = await client.getMember(memberId);
    return usableGivenName(member.summary.givenName);
  } catch {
    return null;
  }
}
