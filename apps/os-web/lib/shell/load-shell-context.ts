import type { CapabilityStateReadModel } from '@isalwa/os-contracts';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext, getServerWebSession } from '@/lib/auth/actions';

export type ShellContext = {
  displayLabel: string;
  showAdmin: boolean;
  osAccess: 'ok' | 'revoked' | 'unavailable' | 'unauthorized';
  capabilities: CapabilityStateReadModel[];
};

export async function loadShellContext(): Promise<ShellContext | null> {
  const webSession = await getServerWebSession();
  if (!webSession) return null;

  const auth = await getServerOsAuthContext();
  if (!auth) {
    return {
      displayLabel: webSession.displayLabel ?? 'Usuario',
      showAdmin: false,
      osAccess: 'unauthorized',
      capabilities: [],
    };
  }

  const client = createOsApiClient(auth);

  let osAccess: ShellContext['osAccess'] = 'ok';
  let showAdmin = false;
  let capabilities: CapabilityStateReadModel[] = [];

  try {
    await client.listAttention({ limit: '1' });
  } catch (err) {
    if (err instanceof OsApiError) {
      if (err.code === 'ACCESS_REVOKED') osAccess = 'revoked';
      else if (err.kind === 'unauthorized') osAccess = 'unauthorized';
      else if (err.kind === 'unavailable') osAccess = 'unavailable';
      else osAccess = 'unauthorized';
    } else {
      osAccess = 'unavailable';
    }
  }

  if (osAccess === 'ok') {
    try {
      showAdmin = await client.probeAdminAccess();
    } catch {
      showAdmin = false;
    }

    try {
      const state = await client.getCapabilityState();
      capabilities = state.capabilities;
    } catch {
      capabilities = [];
    }
  }

  return {
    displayLabel: webSession.displayLabel ?? 'Usuario',
    showAdmin,
    osAccess,
    capabilities,
  };
}
